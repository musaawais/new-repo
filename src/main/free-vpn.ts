/**
 * Free VPN Manager
 *
 * Fetches fresh, working free proxy servers for USA, UK, and Canada from
 * public proxy APIs. Tests each proxy with a TCP socket before using it.
 * When connected, applies the proxy to session.defaultSession so both the
 * regular browser tabs AND the agent engine use the chosen country's IP.
 *
 * No signup, no API key, no paid subscription required.
 */

import { session as electronSession } from 'electron';
import https from 'https';
import net from 'net';

export interface FreeProxy {
  host: string;
  port: number;
  protocol: 'http' | 'socks5';
  countryCode: string;
}

export interface VpnState {
  enabled: boolean;
  countryCode: string;
  countryName: string;
  currentProxy: FreeProxy | null;
  fetching: boolean;
  error: string | null;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: '🇺🇸 United States',
  GB: '🇬🇧 United Kingdom',
  CA: '🇨🇦 Canada',
  DE: '🇩🇪 Germany',
  FR: '🇫🇷 France',
  NL: '🇳🇱 Netherlands',
  AU: '🇦🇺 Australia',
  JP: '🇯🇵 Japan',
};

export class FreeVpnManager {
  private state: VpnState = {
    enabled: false, countryCode: '', countryName: '',
    currentProxy: null, fetching: false, error: null,
  };

  private onStateChangeCb: ((s: VpnState) => void) | null = null;

  onStateChange(cb: (s: VpnState) => void) { this.onStateChangeCb = cb; }
  getState(): VpnState { return { ...this.state }; }

  /** Returns the proxy rules string if VPN is active, else null. */
  getProxyRules(): string | null {
    if (!this.state.enabled || !this.state.currentProxy) return null;
    const { protocol, host, port } = this.state.currentProxy;
    return protocol === 'socks5'
      ? `socks5://${host}:${port}`
      : `http=${host}:${port};https=${host}:${port}`;
  }

  async connect(countryCode: string): Promise<void> {
    this.update({ fetching: true, error: null, countryCode, countryName: COUNTRY_NAMES[countryCode] ?? countryCode });
    try {
      const proxies = await this.fetchProxies(countryCode);
      for (const proxy of proxies) {
        const ok = await this.testProxy(proxy);
        if (ok) {
          await this.applyProxy(proxy);
          this.update({ enabled: true, currentProxy: proxy, fetching: false });
          return;
        }
      }
      this.update({ fetching: false, error: 'No working proxy found for ' + countryCode });
    } catch (e: any) {
      this.update({ fetching: false, error: String(e?.message ?? e) });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await electronSession.defaultSession.setProxy({ proxyRules: '' });
    } catch {}
    this.update({ enabled: false, currentProxy: null, countryCode: '', countryName: '', error: null });
  }

  private update(patch: Partial<VpnState>) {
    Object.assign(this.state, patch);
    this.onStateChangeCb?.(this.state);
  }

  private async applyProxy(proxy: FreeProxy): Promise<void> {
    const rules = proxy.protocol === 'socks5'
      ? `socks5://${proxy.host}:${proxy.port}`
      : `http=${proxy.host}:${proxy.port};https=${proxy.host}:${proxy.port}`;
    await electronSession.defaultSession.setProxy({ proxyRules: rules });
  }

  private testProxy(proxy: FreeProxy): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;
      socket.setTimeout(timeout);
      socket.connect(proxy.port, proxy.host, () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });
  }

  private fetchProxies(countryCode: string): Promise<FreeProxy[]> {
    return new Promise((resolve, reject) => {
      const url = `https://proxylist.geonode.com/api/proxy-list?limit=20&page=1&sort_by=lastChecked&sort_type=desc&country=${countryCode}&protocols=http,socks5`;
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const proxies: FreeProxy[] = (json.data ?? []).map((p: any) => ({
              host: p.ip,
              port: Number(p.port),
              protocol: p.protocols?.includes('socks5') ? 'socks5' : 'http',
              countryCode: p.country ?? countryCode,
            }));
            resolve(proxies);
          } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  }
}
