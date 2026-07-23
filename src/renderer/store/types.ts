export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
}

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

export interface VpnState {
  enabled: boolean;
  countryCode: string;
  countryName: string;
  currentProxy: { host: string; port: number; protocol: string } | null;
  fetching: boolean;
  error: string | null;
}

export interface AgentTaskInput {
  name: string;
  keyword: string;
  /** Optional: paste a full Google search URL (e.g. https://www.google.com/search?q=…)
   *  to skip typing on Google and jump directly to results — helps avoid CAPTCHA. */
  directSearchUrl?: string;
  urls: string[];
  country: string;
  countryCode: string;
  /**
   * Proxy list — one entry per line.
   * Supported formats:
   *   host:port
   *   host:port:username:password
   *   http://username:password@host:port
   *   socks5://username:password@host:port
   *
   * The engine rotates through this list, one proxy per visit.
   * If a proxy fails, it falls back to the active VPN (if on) or direct.
   */
  proxyList: string[];
  visitCount: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  timeOnPageMin: number;
  timeOnPageMax: number;
  scrollSpeed: 'slow' | 'medium' | 'fast';
  clickInternalLinks: boolean;
  maxInternalLinks: number;
}

export interface AgentTask extends AgentTaskInput {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  totalVisits: number;
  completedVisits: number;
  logs: string[];
  createdAt: number;
}

export type SidebarView = 'browser' | 'agent' | 'proxy' | 'settings';
