import React, { useState, useEffect } from 'react';
import { COUNTRIES, type Country } from '../../data/countries';

const api = (window as any).api;

type PanelTab = 'vpn' | 'country' | 'custom';

const FREE_VPN_COUNTRIES = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
];

interface ProxyState { enabled: boolean; current: any | null; }
interface VpnState {
  enabled: boolean;
  countryCode: string;
  countryName: string;
  currentProxy: { host: string; port: number; protocol: string } | null;
  fetching: boolean;
  error: string | null;
}

export function ProxyPanel() {
  const [tab, setTab] = useState<PanelTab>('vpn');

  // ── Proxy (manual) state ──────────────────────────────────────────────────
  const [proxyState, setProxyState] = useState<ProxyState>({ enabled: false, current: null });
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedProxyIdx, setSelectedProxyIdx] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customHost, setCustomHost] = useState('');
  const [customPort, setCustomPort] = useState('8080');
  const [customProtocol, setCustomProtocol] = useState<'http' | 'socks5'>('http');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [proxyLoading, setProxyLoading] = useState(false);
  const [search, setSearch] = useState('');

  // ── Free VPN state ────────────────────────────────────────────────────────
  const [vpnState, setVpnState] = useState<VpnState>({
    enabled: false, countryCode: '', countryName: '', currentProxy: null, fetching: false, error: null,
  });
  const [selectedVpnCountry, setSelectedVpnCountry] = useState('US');

  useEffect(() => {
    api.proxy.getState().then(setProxyState);
    api.vpn.getState().then((s: VpnState | null) => { if (s) setVpnState(s); });
    const unsub = api.vpn.onStateChanged((s: VpnState) => setVpnState(s));
    return unsub;
  }, []);

  // ── Free VPN handlers ─────────────────────────────────────────────────────
  const handleVpnConnect = async () => {
    await api.vpn.connect(selectedVpnCountry);
  };

  const handleVpnDisconnect = async () => {
    await api.vpn.disconnect();
  };

  // ── Manual proxy handlers ─────────────────────────────────────────────────
  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = async () => {
    setProxyLoading(true);
    try {
      if (tab === 'custom') {
        if (!customHost || !customPort) return;
        await api.proxy.set({
          country: 'Custom', countryCode: 'XX',
          host: customHost, port: parseInt(customPort),
          protocol: customProtocol,
          username: username || undefined,
          password: password || undefined,
        });
        setProxyState({ enabled: true, current: { country: 'Custom', countryCode: 'XX', host: customHost, port: parseInt(customPort), protocol: customProtocol } });
      } else if (selectedCountry) {
        const proxy = selectedCountry.proxies[selectedProxyIdx] || selectedCountry.proxies[0];
        await api.proxy.set({
          country: selectedCountry.name, countryCode: selectedCountry.code,
          host: proxy.host, port: proxy.port, protocol: proxy.protocol,
          username: username || undefined, password: password || undefined,
        });
        setProxyState({ enabled: true, current: { country: selectedCountry.name, countryCode: selectedCountry.code, host: proxy.host, port: proxy.port, protocol: proxy.protocol } });
      }
    } finally { setProxyLoading(false); }
  };

  const handleDisconnect = async () => {
    setProxyLoading(true);
    try { await api.proxy.clear(); setProxyState({ enabled: false, current: null }); }
    finally { setProxyLoading(false); }
  };

  const countryForCode = proxyState.current
    ? COUNTRIES.find((c) => c.code === proxyState.current?.countryCode)
    : null;

  const activeAnything = vpnState.enabled || proxyState.enabled;

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* ── Active status card ─────────────────────────────────────────────── */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>STATUS</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
            borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: activeAnything ? 'rgba(34,197,94,0.15)' : 'rgba(156,163,175,0.12)',
            color: activeAnything ? '#4ade80' : '#9ca3af',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: activeAnything ? '#4ade80' : '#6b7280',
              animation: activeAnything ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            {activeAnything ? 'Protected' : 'Not Connected'}
          </span>
        </div>

        {vpnState.enabled && vpnState.currentProxy && (
          <div className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>
              🔒 Free VPN — {vpnState.countryName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)' }}>
              {vpnState.currentProxy.protocol.toUpperCase()} · {vpnState.currentProxy.host}:{vpnState.currentProxy.port}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(99,202,130,0.7)', marginTop: 2 }}>
              ✅ Browser + Agent both use this IP
            </div>
          </div>
        )}

        {proxyState.enabled && proxyState.current && !vpnState.enabled && (
          <div className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>
              {countryForCode?.flag} {proxyState.current.country}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)' }}>
              {proxyState.current.protocol?.toUpperCase()} · {proxyState.current.host}:{proxyState.current.port}
            </div>
          </div>
        )}

        {!activeAnything && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            Your real IP is visible. Connect Free VPN or add a proxy below.
          </div>
        )}

        {(vpnState.enabled || proxyState.enabled) && (
          <button
            className="btn-danger w-full mt-3"
            onClick={vpnState.enabled ? handleVpnDisconnect : handleDisconnect}
            disabled={proxyLoading || vpnState.fetching}
          >
            {proxyLoading || vpnState.fetching ? 'Disconnecting…' : '⏹ Disconnect'}
          </button>
        )}
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────────── */}
      <div className="flex gap-1" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
        {([
          { id: 'vpn', label: '🌐 Free VPN' },
          { id: 'country', label: '🌍 Country List' },
          { id: 'custom', label: '⚙️ Custom' },
        ] as { id: PanelTab; label: string }[]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: tab === id ? 'rgba(99,102,241,0.3)' : 'transparent',
            color: tab === id ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
            border: tab === id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── FREE VPN TAB ───────────────────────────────────────────────────── */}
      {tab === 'vpn' && (
        <div className="flex flex-col gap-3">
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Automatically finds and connects to a <strong style={{ color: 'rgba(255,255,255,0.7)' }}>free working proxy</strong> in
            your chosen country. No account or payment needed. If one stops working, tap Reconnect to get a fresh one.
          </div>

          {/* Country grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {FREE_VPN_COUNTRIES.map((c) => (
              <button key={c.code} onClick={() => setSelectedVpnCountry(c.code)} style={{
                padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${selectedVpnCountry === c.code ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                background: selectedVpnCountry === c.code ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                color: selectedVpnCountry === c.code ? '#e0e0ff' : 'rgba(255,255,255,0.6)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 20 }}>{c.flag}</span>
                <span style={{ fontSize: 10 }}>{c.name}</span>
              </button>
            ))}
          </div>

          {/* Error message */}
          {vpnState.error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fca5a5', lineHeight: 1.5,
            }}>
              ⚠️ {vpnState.error}
            </div>
          )}

          {/* Fetching indicator */}
          {vpnState.fetching && (
            <div style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#a5b4fc', lineHeight: 1.6,
            }}>
              🔄 Fetching fresh proxies for {FREE_VPN_COUNTRIES.find(c => c.code === selectedVpnCountry)?.name}…
              <br /><span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Testing connections, this may take 5–15 seconds</span>
            </div>
          )}

          {!vpnState.enabled && !vpnState.fetching && (
            <button className="btn-primary w-full" onClick={handleVpnConnect}
              style={{ padding: '11px 0', fontSize: 13 }}>
              🔒 Connect Free VPN
            </button>
          )}

          {vpnState.enabled && !vpnState.fetching && (
            <button
              onClick={handleVpnConnect}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)',
                color: '#a5b4fc',
              }}
            >
              🔄 Reconnect / Get New IP
            </button>
          )}

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, textAlign: 'center' }}>
            Free proxies can be slow or go offline. For reliable agent automation,
            use residential proxies (Webshare, Bright Data) in the Agent task form.
          </div>
        </div>
      )}

      {/* ── COUNTRY LIST TAB ───────────────────────────────────────────────── */}
      {tab === 'country' && (
        <>
          <input className="input-dark" placeholder="Search countries…"
            value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="flex flex-col gap-1" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filteredCountries.map((country) => (
              <button key={country.code} onClick={() => { setSelectedCountry(country); setSelectedProxyIdx(0); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 10, border: `1px solid ${selectedCountry?.code === country.code ? '#6366f1' : 'transparent'}`,
                  background: selectedCountry?.code === country.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: selectedCountry?.code === country.code ? '#e8e8f0' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', textAlign: 'left', width: '100%', fontSize: 13,
                }}>
                <span style={{ fontSize: 18 }}>{country.flag}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{country.name}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {country.proxies.length} proxy{country.proxies.length !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>

          {selectedCountry && selectedCountry.proxies.length > 1 && (
            <div>
              <label className="form-label">Select Server</label>
              <div className="flex flex-col gap-1">
                {selectedCountry.proxies.map((p, i) => (
                  <button key={i} onClick={() => setSelectedProxyIdx(i)} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', borderRadius: 8, fontSize: 12,
                    border: `1px solid ${selectedProxyIdx === i ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                    background: selectedProxyIdx === i ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: selectedProxyIdx === i ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}>
                    <span>{p.host}:{p.port}</span>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: p.speed === 'fast' ? 'rgba(34,197,94,0.15)' : p.speed === 'medium' ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                      color: p.speed === 'fast' ? '#4ade80' : p.speed === 'medium' ? '#facc15' : '#f87171',
                    }}>{p.speed}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="form-label">Username (optional)</label>
              <input className="input-dark" placeholder="user" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="form-label">Password (optional)</label>
              <input className="input-dark" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {!proxyState.enabled && (
            <button className="btn-primary w-full" onClick={handleConnect}
              disabled={proxyLoading || !selectedCountry}>
              {proxyLoading ? 'Connecting…' : '🔒 Connect'}
            </button>
          )}
        </>
      )}

      {/* ── CUSTOM TAB ─────────────────────────────────────────────────────── */}
      {tab === 'custom' && (
        <>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Enter any proxy manually. Credentials are embedded securely in the connection — all formats work.
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="form-label">Host / IP</label>
              <input className="input-dark" placeholder="proxy.example.com"
                value={customHost} onChange={(e) => setCustomHost(e.target.value)} />
            </div>
            <div style={{ width: 80 }}>
              <label className="form-label">Port</label>
              <input className="input-dark" type="number" placeholder="8080"
                value={customPort} onChange={(e) => setCustomPort(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Protocol</label>
            <div className="flex gap-2">
              {(['http', 'socks5'] as const).map((p) => (
                <button key={p} onClick={() => setCustomProtocol(p)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${customProtocol === p ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                  background: customProtocol === p ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: customProtocol === p ? '#a5b4fc' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
                }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="form-label">Username (optional)</label>
              <input className="input-dark" placeholder="user" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="form-label">Password (optional)</label>
              <input className="input-dark" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {!proxyState.enabled && (
            <button className="btn-primary w-full" onClick={handleConnect}
              disabled={proxyLoading || !customHost}>
              {proxyLoading ? 'Connecting…' : '🔒 Connect'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
