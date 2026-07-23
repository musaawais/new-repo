export interface Country {
  name: string;
  code: string;
  flag: string;
  proxies: ProxyEntry[];
}

export interface ProxyEntry {
  host: string;
  port: number;
  protocol: 'http' | 'socks5';
  speed: 'fast' | 'medium' | 'slow';
}

// Curated list of countries with example proxy configurations.
// In production, populate from a live proxy feed or the user's own proxies.
export const COUNTRIES: Country[] = [
  { name: 'United States', code: 'US', flag: '🇺🇸', proxies: [
    { host: '104.248.63.15', port: 8080, protocol: 'http', speed: 'fast' },
    { host: '192.241.121.1', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', proxies: [
    { host: '178.62.93.129', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Germany', code: 'DE', flag: '🇩🇪', proxies: [
    { host: '167.235.253.58', port: 8080, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'France', code: 'FR', flag: '🇫🇷', proxies: [
    { host: '92.222.161.184', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', proxies: [
    { host: '138.68.60.8', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Canada', code: 'CA', flag: '🇨🇦', proxies: [
    { host: '66.165.249.197', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Australia', code: 'AU', flag: '🇦🇺', proxies: [
    { host: '101.99.33.190', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Japan', code: 'JP', flag: '🇯🇵', proxies: [
    { host: '202.12.90.97', port: 8080, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', proxies: [
    { host: '118.67.128.67', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', proxies: [
    { host: '128.199.211.189', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'India', code: 'IN', flag: '🇮🇳', proxies: [
    { host: '103.76.27.38', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', proxies: [
    { host: '177.93.33.246', port: 3128, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', proxies: [
    { host: '148.235.59.49', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', proxies: [
    { host: '186.10.84.78', port: 3128, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Russia', code: 'RU', flag: '🇷🇺', proxies: [
    { host: '213.234.100.1', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', proxies: [
    { host: '176.114.244.212', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Poland', code: 'PL', flag: '🇵🇱', proxies: [
    { host: '188.116.181.252', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Spain', code: 'ES', flag: '🇪🇸', proxies: [
    { host: '195.10.205.27', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Italy', code: 'IT', flag: '🇮🇹', proxies: [
    { host: '93.57.82.86', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', proxies: [
    { host: '130.61.51.181', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Norway', code: 'NO', flag: '🇳🇴', proxies: [
    { host: '84.208.91.73', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', proxies: [
    { host: '213.184.143.26', port: 80, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', proxies: [
    { host: '176.88.0.10', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', proxies: [
    { host: '41.84.143.230', port: 8080, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', proxies: [
    { host: '41.78.95.137', port: 8080, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', proxies: [
    { host: '102.182.233.0', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'China', code: 'CN', flag: '🇨🇳', proxies: [
    { host: '116.62.145.175', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰', proxies: [
    { host: '47.52.73.72', port: 8080, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Taiwan', code: 'TW', flag: '🇹🇼', proxies: [
    { host: '120.117.74.20', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', proxies: [
    { host: '103.216.103.26', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', proxies: [
    { host: '103.153.149.180', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', proxies: [
    { host: '103.216.144.95', port: 8080, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', proxies: [
    { host: '118.101.145.61', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', proxies: [
    { host: '103.28.121.230', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', proxies: [
    { host: '182.178.75.65', port: 8080, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', proxies: [
    { host: '103.47.145.219', port: 8080, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', proxies: [
    { host: '176.105.27.43', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'UAE', code: 'AE', flag: '🇦🇪', proxies: [
    { host: '185.93.3.122', port: 8080, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Israel', code: 'IL', flag: '🇮🇱', proxies: [
    { host: '185.20.224.236', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', proxies: [
    { host: '5.181.104.27', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Romania', code: 'RO', flag: '🇷🇴', proxies: [
    { host: '5.189.186.211', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', proxies: [
    { host: '37.252.21.27', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Hungary', code: 'HU', flag: '🇭🇺', proxies: [
    { host: '91.185.99.12', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Finland', code: 'FI', flag: '🇫🇮', proxies: [
    { host: '95.217.10.115', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', proxies: [
    { host: '185.61.152.137', port: 3128, protocol: 'http', speed: 'fast' },
  ]},
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', proxies: [
    { host: '91.109.26.134', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Austria', code: 'AT', flag: '🇦🇹', proxies: [
    { host: '77.119.129.54', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Greece', code: 'GR', flag: '🇬🇷', proxies: [
    { host: '62.103.80.195', port: 3128, protocol: 'http', speed: 'slow' },
  ]},
  { name: 'Chile', code: 'CL', flag: '🇨🇱', proxies: [
    { host: '200.54.194.12', port: 3128, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', proxies: [
    { host: '190.14.241.186', port: 8080, protocol: 'http', speed: 'medium' },
  ]},
  { name: 'Peru', code: 'PE', flag: '🇵🇪', proxies: [
    { host: '190.254.1.122', port: 8080, protocol: 'http', speed: 'slow' },
  ]},
];
