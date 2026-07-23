import { session } from 'electron';

export interface ProxyConfig {
  country: string;
  countryCode: string;
  host: string;
  port: number;
  protocol: 'http' | 'socks5';
  username?: string;
  password?: string;
}

export interface ProxyState {
  enabled: boolean;
  current: ProxyConfig | null;
}

/** Build a proxyRules string that Chromium accepts, embedding auth credentials
 *  directly in the URL so no 'login' event handler is needed.
 *  Chromium supports http://user:pass@host:port and socks5://user:pass@host:port. */
function toRules(config: ProxyConfig): string {
  const auth = config.username
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password ?? '')}@`
    : '';
  return config.protocol === 'socks5'
    ? `socks5://${auth}${config.host}:${config.port}`
    : `http://${auth}${config.host}:${config.port}`;
}

export class ProxyManager {
  private state: ProxyState = { enabled: false, current: null };
  private rules: string | null = null;

  async setProxy(config: ProxyConfig): Promise<void> {
    this.rules = toRules(config);
    await session.defaultSession.setProxy({ proxyRules: this.rules });
    this.state = { enabled: true, current: config };
  }

  /**
   * Clear and go back to OS network stack.
   * mode:'system' keeps VPN tunnels working — 'direct' bypasses them.
   */
  async clearProxy(): Promise<void> {
    await (session.defaultSession.setProxy as any)({ mode: 'system' });
    this.state = { enabled: false, current: null };
    this.rules = null;
  }

  /** Returns the active proxyRules string, or null if no proxy is set. */
  getProxyRules(): string | null {
    return this.rules;
  }

  getState(): ProxyState {
    return { ...this.state };
  }
}
