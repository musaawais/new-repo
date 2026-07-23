/// <reference lib="dom" />
/**
 * Stealth preload — injected into every agent tab BEFORE any page scripts run.
 *
 * Removes Electron/Chromium automation markers that Google and anti-bot
 * services check to identify headless/automated browsers.
 */

// ── 1. Remove navigator.webdriver (the #1 bot signal) ────────────────────────
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true,
});

// ── 2. Fake plugin list (real Chrome always has these) ────────────────────────
const fakePlugins = [
  { name: 'Chrome PDF Plugin',       filename: 'internal-pdf-viewer',          description: 'Portable Document Format', length: 1 },
  { name: 'Chrome PDF Viewer',       filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 0 },
  { name: 'Native Client',           filename: 'internal-nacl-plugin',          description: '', length: 2 },
];
const fakePluginArray = Object.assign(fakePlugins, {
  item: (i: number) => fakePlugins[i] ?? null,
  namedItem: (name: string) => fakePlugins.find((p) => p.name === name) ?? null,
  refresh: () => {},
  [Symbol.iterator]: function* () { yield* fakePlugins; },
});
Object.defineProperty(navigator, 'plugins', {
  get: () => fakePluginArray,
  configurable: true,
});

// ── 3. Set languages (empty array is another bot signal) ─────────────────────
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
  configurable: true,
});

// ── 4. Add window.chrome object that real Chrome has ─────────────────────────
if (!(window as any).chrome) {
  (window as any).chrome = {};
}
const chrome = (window as any).chrome;
chrome.runtime = chrome.runtime || {};
chrome.loadTimes = chrome.loadTimes || function () {
  return {
    requestTime: Date.now() / 1000 - 0.4,
    startLoadTime: Date.now() / 1000 - 0.3,
    commitLoadTime: Date.now() / 1000 - 0.2,
    finishDocumentLoadTime: Date.now() / 1000 - 0.1,
    finishLoadTime: Date.now() / 1000,
    firstPaintTime: Date.now() / 1000 - 0.05,
    firstPaintAfterLoadTime: 0,
    navigationType: 'Other',
    wasFetchedViaSpdy: false,
    wasNpnNegotiated: false,
    npnNegotiatedProtocol: 'unknown',
    wasAlternateProtocolAvailable: false,
    connectionInfo: 'http/1.1',
  };
};
chrome.csi = chrome.csi || function () {
  return {
    startE: Date.now(),
    onloadT: Date.now(),
    pageT: Date.now() - 1000 + Math.random() * 500,
    tran: 15,
  };
};

// ── 5. Randomise hardware concurrency to avoid fingerprinting ────────────────
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => [2, 4, 8][Math.floor(Math.random() * 3)],
  configurable: true,
});

// ── 6. Spoof permissions (getNotifications etc.) ─────────────────────────────
if (navigator.permissions && navigator.permissions.query) {
  const origQuery = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = (desc: any) => {
    if (desc && desc.name === 'notifications') {
      return Promise.resolve({ state: 'denied', onchange: null } as PermissionStatus);
    }
    return origQuery(desc);
  };
}
