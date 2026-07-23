/// <reference lib="dom" />
/**
 * Agent Engine v3 — 100% Real Human Browser Automation
 *
 * Every visit runs in its own isolated Electron session so:
 *   • Google Analytics sees a BRAND NEW USER each time (fresh cookies)
 *   • A different proxy IP is used per visit (real IP rotation)
 *   • A different browser fingerprint (user agent) is used per visit
 *   • The Referer header is set to https://www.google.com/ so GA4 and
 *     Google Search Console attribute traffic as organic Google search
 *
 * The automation is fully VISIBLE — the user watches Google load, the
 * keyword being typed, search results appearing, the target page loading
 * and scrolling — exactly like a real human using the browser.
 *
 * MAC address is a layer-2 concept only visible on local networks. On
 * the open internet, servers see only the IP address (from the proxy).
 * Session isolation + proxy rotation is the correct solution.
 */

import {
  BrowserWindow,
  WebContentsView,
  session as electronSession,
} from 'electron';
import { v4 as uuidv4 } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentTask {
  id: string;
  name: string;
  keyword: string;
  /** Optional: a full Google search URL (e.g. https://www.google.com/search?q=…).
   *  When set, the agent loads this URL directly instead of typing on Google,
   *  which avoids the typing simulation that can trigger CAPTCHA. */
  directSearchUrl?: string;
  urls: string[];
  country: string;
  countryCode: string;
  proxyList: string[];
  visitCount: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  timeOnPageMin: number;
  timeOnPageMax: number;
  scrollSpeed: 'slow' | 'medium' | 'fast';
  clickInternalLinks: boolean;
  maxInternalLinks: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  totalVisits: number;
  completedVisits: number;
  logs: string[];
  createdAt: number;
}

export type AgentTaskInput = Omit<AgentTask,
  'id' | 'status' | 'progress' | 'totalVisits' | 'completedVisits' | 'logs' | 'createdAt'>;

interface ParsedProxy {
  protocol: 'http' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

// ── Large realistic User-Agent pool (rotated per visit) ───────────────────────

const UA_DESKTOP = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
];

const UA_MOBILE = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.99 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
];

const UA_TABLET = [
  'Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 16_7_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; SM-X906C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.136 Safari/537.36',
];

const CHROME_HEIGHT = 90; // must match BrowserManager.CHROME_HEIGHT

// ── Engine ────────────────────────────────────────────────────────────────────

export class AgentEngine {
  private tasks: Map<string, AgentTask> = new Map();
  private runningTasks: Map<string, boolean> = new Map();
  private statusCallback: ((task: AgentTask) => void) | null = null;

  onStatusChange(cb: (task: AgentTask) => void) { this.statusCallback = cb; }

  createTask(input: AgentTaskInput): AgentTask {
    const task: AgentTask = {
      id: uuidv4(),
      ...input,
      status: 'idle',
      progress: 0,
      totalVisits: input.visitCount * input.urls.length,
      completedVisits: 0,
      logs: [],
      createdAt: Date.now(),
    };
    this.tasks.set(task.id, task);
    this.emitStatus(task);
    return task;
  }

  /**
   * Start a task. Each visit creates its own isolated WebContentsView + session.
   * @param taskId  Task to run.
   * @param mainWin The main BrowserWindow (views are attached to it).
   * @param getSidebarWidth Callback returning current sidebar width in pixels.
   */
  async startTask(
    taskId: string,
    mainWin: BrowserWindow,
    getSidebarWidth: () => number,
    getFallbackProxyRules?: () => string | null,
    agentTabId?: string,
    getActiveTabId?: () => string | null,
    onTabSwitch?: (cb: (activeId: string | null) => void) => () => void,
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'running') return;

    task.status = 'running';
    task.logs = [];
    task.completedVisits = 0;
    task.progress = 0;
    this.runningTasks.set(taskId, true);
    this.emitStatus(task);

    try {
      await this.runAllVisits(
        task, mainWin, getSidebarWidth, getFallbackProxyRules,
        agentTabId, getActiveTabId, onTabSwitch,
      );
    } catch (err) {
      task.status = 'error';
      task.logs.push(`❌ Fatal: ${(err as Error).message}`);
      this.emitStatus(task);
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  stopTask(taskId: string): void {
    this.runningTasks.set(taskId, false);
    const task = this.tasks.get(taskId);
    if (task) { task.status = 'idle'; task.logs.push('⏹ Stopped.'); this.emitStatus(task); }
  }

  deleteTask(taskId: string): void { this.stopTask(taskId); this.tasks.delete(taskId); }
  getAllTasks(): AgentTask[] { return Array.from(this.tasks.values()); }
  getTask(id: string): AgentTask | undefined { return this.tasks.get(id); }

  /**
   * Update a task's configuration.  Only allowed when the task is NOT running.
   * Returns the updated task, or null if not found / currently running.
   */
  updateTask(taskId: string, updates: Partial<AgentTaskInput>): AgentTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'running') return null;
    Object.assign(task, updates);
    // Recalculate derived fields
    task.totalVisits = task.visitCount * task.urls.length;
    // Reset completion state so the updated config runs fresh
    task.completedVisits = 0;
    task.progress = 0;
    task.status = 'idle';
    this.emitStatus(task);
    return task;
  }

  // ── Visit orchestration ──────────────────────────────────────────────────

  private async runAllVisits(
    task: AgentTask,
    mainWin: BrowserWindow,
    getSidebarWidth: () => number,
    getFallbackProxyRules?: () => string | null,
    agentTabId?: string,
    getActiveTabId?: () => string | null,
    onTabSwitch?: (cb: (activeId: string | null) => void) => () => void,
  ): Promise<void> {
    const proxies = task.proxyList.map(parseProxy).filter((p): p is ParsedProxy => p !== null);

    // When the task has no per-visit proxies, use the active VPN / manual proxy.
    // This also makes the VISIBLE browser tab (defaultSession) show the correct
    // country while the agent is running — so you see the same IP it uses.
    const fallbackRules = proxies.length === 0 ? (getFallbackProxyRules?.() ?? null) : null;

    let visitIndex = 0;

    for (let v = 0; v < task.visitCount; v++) {
      for (const targetUrl of task.urls) {
        if (!this.isRunning(task)) return;

        visitIndex++;
        const label = `Visit ${visitIndex}/${task.totalVisits}`;
        const proxy = proxies.length > 0 ? proxies[(visitIndex - 1) % proxies.length] : null;
        const ua = pickUA(task.deviceType, visitIndex);

        task.logs.push(
          `\n${label}: 🚀 Starting — ` +
          (proxy ? `Proxy: ${proxy.host}:${proxy.port}` : fallbackRules ? 'Using active VPN' : 'Direct (no proxy)')
        );
        this.emitStatus(task);

        await this.runOneVisit({
          task, label, targetUrl, proxy, ua, mainWin, getSidebarWidth, fallbackRules,
          agentTabId, getActiveTabId, onTabSwitch,
        });
        if (!this.isRunning(task)) return;

        task.completedVisits++;
        task.progress = Math.round((task.completedVisits / task.totalVisits) * 100);
        task.logs.push(`${label}: ✅ Done (${task.progress}% complete)`);
        this.emitStatus(task);

        // Human-like pause between visits (3–8 seconds)
        if (visitIndex < task.totalVisits) await this.sleep(3000 + Math.random() * 5000);
      }
    }

    task.status = 'completed';
    task.progress = 100;
    task.logs.push('🎉 All visits complete!');
    this.emitStatus(task);
  }

  // ── Single visit in its own isolated session/view ───────────────────────

  private async runOneVisit(opts: {
    task: AgentTask;
    label: string;
    targetUrl: string;
    proxy: ParsedProxy | null;
    ua: string;
    mainWin: BrowserWindow;
    getSidebarWidth: () => number;
    fallbackRules: string | null;
    /** ID of the agent's virtual tab — agent view is only shown when this tab is active. */
    agentTabId?: string;
    /** Returns the currently active tab ID (from BrowserManager). */
    getActiveTabId?: () => string | null;
    /** Subscribe to tab-switch events; returns an unsubscribe function. */
    onTabSwitch?: (cb: (activeId: string | null) => void) => () => void;
  }): Promise<void> {
    const { task, label, targetUrl, proxy, ua, mainWin, getSidebarWidth, fallbackRules } = opts;

    // ── 1. Create isolated session (fresh cookies = new user in GA4) ──────
    const partition = `tmp:visit-${uuidv4()}`;
    const ses = electronSession.fromPartition(partition, { cache: false });

    // ── 2. Apply proxy to this session ────────────────────────────────────
    if (proxy) {
      // Embed credentials in the URL — works for most proxies.
      const proxyRules = buildProxyRules(proxy);
      try { await ses.setProxy({ proxyRules }); } catch { /* ignore */ }

      // BACKUP: also handle 407 Proxy-Auth-Required via login event.
      // Some proxy servers ignore URL-embedded credentials and still send 407.
      if (proxy.username) {
        ses.on('login', (_req: any, authInfo: any, callback: Function) => {
          if (authInfo.isProxy) {
            callback(proxy.username, proxy.password ?? '');
          } else {
            callback('', '');
          }
        });
      }
    } else if (fallbackRules) {
      // No per-task proxy — inherit the active VPN or manual proxy
      try { await ses.setProxy({ proxyRules: fallbackRules }); } catch { /* ignore */ }
    } else {
      // No proxy at all — follow OS network settings so system VPN still works.
      // Fresh fromPartition sessions don't inherit system proxy automatically.
      try { await ses.setProxy({ mode: 'system' } as any); } catch { /* ignore */ }
    }

    // Remove tracking/automation headers
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      delete headers['X-Powered-By'];
      // Set realistic Accept-Language header
      headers['Accept-Language'] = 'en-US,en;q=0.9';
      callback({ requestHeaders: headers });
    });

    // Strip X-Frame-Options and CSP that might block page display
    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'X-Frame-Options': [],
          'Content-Security-Policy': [],
        },
      });
    });

    // ── 3. Create a visible WebContentsView for this visit ────────────────
    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        contextIsolation: true,
        nodeIntegration: false,
        javascript: true,
        images: true,
        webSecurity: false,   // allow cross-origin for proxy environments
      },
    });
    view.setBackgroundColor('#ffffff');

    const wc = view.webContents;

    // Set realistic user agent
    wc.setUserAgent(ua);

    // ── Stealth: inject per-page JS to remove Chromium automation fingerprints
    wc.on('dom-ready', () => {
      if (wc.isDestroyed()) return;
      wc.executeJavaScript(`
        (function() {
          // 1. Hide webdriver flag — the #1 bot-detection signal
          try {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
          } catch(e) {}

          // 2. Add chrome object — absent in headless / automation profiles
          if (!window.chrome) {
            window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
          }

          // 3. Realistic plugin list (empty in headless Chrome)
          try {
            Object.defineProperty(navigator, 'plugins', {
              get: () => [{
                name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer',
                description: 'Portable Document Format', length: 1
              }],
              configurable: true
            });
          } catch(e) {}

          // 4. Fix permissions API (headless returns denied for notifications)
          try {
            var origQuery = window.navigator.permissions.query.bind(navigator.permissions);
            navigator.permissions.query = function(p) {
              if (p.name === 'notifications') return Promise.resolve({ state: Notification.permission });
              return origQuery(p);
            };
          } catch(e) {}
        })();
      `).catch(() => {});
    });

    // ── Multi-tab: only show this visit's view when the agent's tab is active ─
    const { agentTabId, getActiveTabId, onTabSwitch } = opts;
    const isMyTabActive = () => !agentTabId || (getActiveTabId?.() === agentTabId);

    const showView = () => {
      if (mainWin.isDestroyed()) return;
      try {
        mainWin.contentView.addChildView(view);
        view.setBounds(getContentBounds(mainWin, getSidebarWidth()));
      } catch { }
    };
    const hideView = () => {
      try { mainWin.contentView.removeChildView(view); } catch { }
    };

    // Initial show/hide based on active tab
    if (isMyTabActive()) showView(); else hideView();

    // Listen for tab switches during this visit
    let offTabSwitch: (() => void) | undefined;
    if (onTabSwitch && agentTabId) {
      offTabSwitch = onTabSwitch((newActiveId) => {
        if (wc.isDestroyed()) return;
        if (newActiveId === agentTabId) showView(); else hideView();
      });
    }

    // Re-apply bounds if window resizes during visit
    const onResize = () => {
      if (!mainWin.isDestroyed() && isMyTabActive()) {
        try { view.setBounds(getContentBounds(mainWin, getSidebarWidth())); } catch { }
      }
    };
    mainWin.on('resize', onResize);

    // Send tab-updated events so the address bar tracks the URL
    const tabUpdateId = agentTabId ?? 'agent-live';
    const sendUpdate = (url: string, title = '', loading = false) => {
      try {
        if (!mainWin.isDestroyed())
          mainWin.webContents.send('tab-updated', {
            id: tabUpdateId, url, title: title || url, favicon: '', isLoading: loading,
          });
      } catch { }
    };
    wc.on('did-navigate', (_, url) => sendUpdate(url, '', true));
    wc.on('did-finish-load', () => sendUpdate(wc.getURL(), wc.getTitle(), false));
    wc.on('page-title-updated', (_, title) => sendUpdate(wc.getURL(), title, wc.isLoading()));

    try {
      // ── 4. Validate proxy — generous timeout for residential proxies ──
      if (proxy) {
        task.logs.push(`${label}: 🔌 Testing proxy ${proxy.host}:${proxy.port}...`);
        this.emitStatus(task);
        // 25-second timeout — residential proxies are legitimately slow
        const ok = await this.proxyWorks(proxy, 25_000);
        if (ok) {
          task.logs.push(`${label}: ✅ Proxy connected`);
          this.emitStatus(task);
        } else {
          // Don't fall back to real IP — skip this visit and move to next proxy
          task.logs.push(`${label}: ⚠️ Proxy timed out — skipping this visit (next visit will use next proxy)`);
          this.emitStatus(task);
          return; // skip visit, don't leak real IP
        }
      }

      // ── 5. Navigate to search results or Google ────────────────────────
      if (task.directSearchUrl) {
        // DIRECT MODE: load a pre-formed search URL — skips typing entirely,
        // reducing CAPTCHA risk because no character-by-character simulation.
        task.logs.push(`${label}: 🔗 Loading search results directly (skips typing → fewer CAPTCHAs)...`);
        this.emitStatus(task);

        const loaded = await this.navigateTo(wc, task.directSearchUrl);
        if (!loaded) {
          task.logs.push(`${label}: ❌ Could not load search URL. Check internet/proxy.`);
          this.emitStatus(task);
          return;
        }
        await this.waitForIdle(wc, 15_000);
        if (!this.isRunning(task)) return;

        if (await this.hasCaptcha(wc)) {
          task.logs.push(`${label}: 🔒 CAPTCHA detected! Please solve it in the browser. Waiting 120s...`);
          this.emitStatus(task);
          await this.waitForCaptchaGone(wc, task, 120_000);
        }

        task.logs.push(`${label}: ✅ Search results loaded`);
        this.emitStatus(task);
        await this.sleep(800 + Math.random() * 600);

        const targetDomain = safeDomain(targetUrl);
        task.logs.push(`${label}: 🖱️ Scanning up to 100 results for "${targetDomain}"...`);
        this.emitStatus(task);

        const clicked = await this.clickSearchResult(wc, targetDomain, targetUrl);
        if (clicked) {
          task.logs.push(`${label}: ✅ Clicked result — Referer = google.com`);
          this.emitStatus(task);
          await this.waitForIdle(wc, 20_000);
        } else {
          task.logs.push(`${label}: ↗️ Not in results — navigating directly with Google referrer`);
          this.emitStatus(task);
          await this.navigateWithReferrer(wc, targetUrl, 'https://www.google.com/');
        }

      } else if (task.keyword) {
        // Load 100 results directly — no typing simulation (CAPTCHA risk) and
        // enough results per page that the target site is almost always visible.
        const searchUrl =
          `https://www.google.com/search?q=${encodeURIComponent(task.keyword)}&num=100&hl=en`;
        task.logs.push(`${label}: 🔍 Loading 100 Google results for "${task.keyword}"...`);
        this.emitStatus(task);

        const loaded = await this.navigateTo(wc, searchUrl);
        if (!loaded) {
          task.logs.push(`${label}: ❌ Could not reach Google. Check proxy or internet.`);
          this.emitStatus(task);
          return;
        }

        await this.waitForIdle(wc, 12_000);
        if (!this.isRunning(task)) return;

        // ── 6. CAPTCHA check ─────────────────────────────────────────────
        if (await this.hasCaptcha(wc)) {
          task.logs.push(`${label}: 🔒 CAPTCHA detected! Please solve it in the browser. Waiting 120s...`);
          this.emitStatus(task);
          await this.waitForCaptchaGone(wc, task, 120_000);
        }

        task.logs.push(`${label}: ✅ Google results loaded`);
        this.emitStatus(task);
        await this.sleep(800 + Math.random() * 600); // human reading pause

        // ── 7. Scan all 100 results for target site ───────────────────────
        const targetDomain = safeDomain(targetUrl);
        task.logs.push(`${label}: 🖱️ Scanning 100 results for "${targetDomain}"...`);
        this.emitStatus(task);

        const clicked = await this.clickSearchResult(wc, targetDomain, targetUrl);

        if (clicked) {
          task.logs.push(`${label}: ✅ Clicked search result — Referer set to google.com`);
          this.emitStatus(task);
          await this.waitForIdle(wc, 20_000);
        } else {
          task.logs.push(`${label}: ↗️ Not in first 100 results — navigating with Google referrer`);
          this.emitStatus(task);
          await this.navigateWithReferrer(wc, targetUrl, 'https://www.google.com/');
        }
      } else {
        // No keyword — go directly to the target URL
        task.logs.push(`${label}: 🌐 Loading ${targetUrl}...`);
        this.emitStatus(task);
        await this.navigateTo(wc, targetUrl);
      }

      if (!this.isRunning(task)) return;

      // ── 9. CAPTCHA check on target page ──────────────────────────────
      if (await this.hasCaptcha(wc)) {
        task.logs.push(`${label}: 🔒 CAPTCHA on target page! Please solve it in the browser. Waiting 120s...`);
        this.emitStatus(task);
        await this.waitForCaptchaGone(wc, task, 120_000);
      }

      task.logs.push(`${label}: 📄 Page loaded — starting real human interaction`);
      this.emitStatus(task);

      // Brief pause before starting to scroll (human lands on page, looks around)
      await this.sleep(1200 + Math.random() * 800);

      // ── 10. Scroll the page visibly for configured duration ────────────
      const durationMs = (task.timeOnPageMin + Math.random() * (task.timeOnPageMax - task.timeOnPageMin)) * 1000;
      task.logs.push(`${label}: 📜 Scrolling page for ${Math.round(durationMs / 1000)}s (you can see this live)`);
      this.emitStatus(task);

      await this.scrollPage(wc, task, durationMs);
      if (!this.isRunning(task)) return;

      // ── 11. Visit internal links ───────────────────────────────────────
      if (task.clickInternalLinks) {
        await this.visitInternalLinks(wc, task, targetUrl, label);
      }

    } finally {
      // ── Cleanup ───────────────────────────────────────────────────────
      offTabSwitch?.();                          // stop listening for tab switches
      mainWin.removeListener('resize', onResize);
      try { mainWin.contentView.removeChildView(view); } catch { }
      // Don't destroy wc explicitly — Electron cleans up when view is removed
    }
  }

  // ── Proxy validation ──────────────────────────────────────────────────────

  /**
   * Test proxy by opening a raw TCP socket and sending an HTTP request.
   *
   * Bypasses Chromium/Electron session proxy entirely — uses Node's net module.
   * This avoids Electron 30 proxy-auth issues with isolated sessions.
   *
   * Flow:
   *  1. TCP connect to proxy host:port
   *  2. Send "GET http://ip-api.com/json HTTP/1.1" with Proxy-Authorization header
   *  3. Any HTTP 2xx/3xx response = proxy is working
   *  4. 407 = proxy reachable but credentials rejected
   *  5. Timeout / connection refused = proxy unreachable
   */
  private proxyWorks(proxy: ParsedProxy, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const net = require('net') as typeof import('net');
      const socket = new net.Socket();
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return; settled = true;
        try { socket.destroy(); } catch { /* ignore */ }
        resolve(ok);
      };

      socket.setTimeout(timeoutMs);
      socket.connect(proxy.port, proxy.host, () => {
        // TCP connected — send a real HTTP request through the proxy
        const creds = proxy.username
          ? Buffer.from(`${proxy.username}:${proxy.password ?? ''}`).toString('base64')
          : null;
        const authLine = creds ? `Proxy-Authorization: Basic ${creds}\r\n` : '';
        socket.write(
          `GET http://ip-api.com/json HTTP/1.1\r\n` +
          `Host: ip-api.com\r\n` +
          `Connection: close\r\n` +
          authLine +
          `\r\n`
        );
        socket.once('data', (data) => {
          const first = data.toString('utf8', 0, 50);
          const code = parseInt((first.split(' ')[1] ?? '0'), 10);
          // 200-399 = proxy working; 407 = proxy up but auth rejected; 0 = no HTTP response
          done(code >= 200 && code < 400);
        });
      });
      socket.on('error', () => done(false));
      socket.on('timeout', () => done(false));
    });
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  private navigateTo(wc: Electron.WebContents, url: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (wc.isDestroyed()) { resolve(false); return; }
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return; settled = true;
        clearTimeout(timer);
        wc.removeListener('did-finish-load', onFinish);
        wc.removeListener('did-fail-load', onFail as any);
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), 30_000);
      const onFinish = () => done(true);
      const onFail = (_: any, code: number) => { if (code !== -3) done(false); };
      wc.once('did-finish-load', onFinish);
      wc.once('did-fail-load', onFail as any);
      wc.loadURL(url).catch(() => done(false));
    });
  }

  /** Navigate with a custom HTTP Referer header (makes GA4 see organic traffic). */
  private navigateWithReferrer(wc: Electron.WebContents, url: string, referrer: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (wc.isDestroyed()) { resolve(false); return; }
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return; settled = true;
        clearTimeout(timer);
        wc.removeListener('did-finish-load', onFinish);
        wc.removeListener('did-fail-load', onFail as any);
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), 30_000);
      const onFinish = () => done(true);
      const onFail = (_: any, code: number) => { if (code !== -3) done(false); };
      wc.once('did-finish-load', onFinish);
      wc.once('did-fail-load', onFail as any);
      wc.loadURL(url, { extraHeaders: `Referer: ${referrer}\r\n` }).catch(() => done(false));
    });
  }

  private waitForIdle(wc: Electron.WebContents, maxMs = 10_000): Promise<void> {
    return new Promise((resolve) => {
      if (wc.isDestroyed() || !wc.isLoading()) { resolve(); return; }
      const timer = setTimeout(resolve, maxMs);
      wc.once('did-stop-loading', () => { clearTimeout(timer); resolve(); });
    });
  }

  // ── Google search interaction ─────────────────────────────────────────────

  /**
   * Inject character-by-character typing into Google's search box.
   * Each character fires real InputEvent + KeyboardEvent pairs so Google's
   * autocomplete and anti-bot systems see realistic input behavior.
   */
  private async typeIntoGoogle(wc: Electron.WebContents, keyword: string): Promise<void> {
    if (wc.isDestroyed()) return;
    try {
      const kw = JSON.stringify(keyword);
      const delay = 55; // ms between chars — realistic typing speed

      await wc.executeJavaScript(`
        (function() {
          var el = document.querySelector('textarea[name="q"]')
                || document.querySelector('input[name="q"]')
                || document.querySelector('input[type="search"]')
                || document.querySelector('[role="combobox"]');
          if (!el) return false;

          el.focus();
          el.value = '';
          el.dispatchEvent(new Event('focus', { bubbles: true }));

          var chars = ${kw}.split('');
          var t = 0;
          chars.forEach(function(ch, i) {
            setTimeout(function() {
              el.value += ch;
              el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
              el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ch, code: 'Key' + ch.toUpperCase() }));
              el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: ch }));
              el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ch }));
            }, t);
            t += ${delay} + Math.random() * 30;
          });

          // Press Enter after all chars are typed
          setTimeout(function() {
            el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13, which: 13 }));
            var form = el.closest('form');
            if (form) {
              form.submit();
            } else {
              window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(el.value);
            }
          }, t + 150);
          return true;
        })();
      `);

      // Wait for all characters to be typed + Enter + navigation start
      await this.sleep(keyword.length * delay + 600);
    } catch { /* page may have navigated — that is correct behavior */ }
  }

  /**
   * Find the target URL in Google search results and CLICK it.
   * Works with Google's 100-results-per-page layout.
   * Clicking sets document.referrer = 'https://www.google.com/' naturally,
   * so GA4/GSC record it as genuine organic Google traffic.
   */
  private async clickSearchResult(
    wc: Electron.WebContents,
    targetDomain: string,
    targetUrl: string,
  ): Promise<boolean> {
    if (wc.isDestroyed()) return false;
    try {
      const clicked: boolean = await wc.executeJavaScript(`
        (function() {
          var domain = ${JSON.stringify(targetDomain)};
          var targetUrl = ${JSON.stringify(targetUrl)};
          var targetBare = targetUrl.replace(/^https?:\\/\\//, '').replace(/\\/$/, '');

          // Build a deduped list of candidate anchors using all known Google selectors.
          // &num=100 loads up to 100 results so they are all already in the DOM.
          var seen = new Set();
          var anchors = [];
          var selectors = [
            '#search a[href]',   // main container — covers all result types
            '#rso a[href]',      // result snippet objects
            '.g a[href]',        // individual result cards (classic layout)
            '.MjjYud a[href]',   // 2024+ wrapper
            '.yuRUbf a[href]',   // result title link (appears in many layouts)
            'h3 a[href]',        // heading links — always the result title
          ];
          selectors.forEach(function(sel) {
            try {
              document.querySelectorAll(sel).forEach(function(a) {
                if (!seen.has(a)) { seen.add(a); anchors.push(a); }
              });
            } catch(e) {}
          });

          // Match by domain or bare URL
          var match = anchors.find(function(a) {
            var href = (a.href || '').replace(/^https?:\\/\\//, '').replace(/\\/$/, '');
            return href.includes(domain) || href === targetBare || href.startsWith(targetBare + '/');
          });

          if (match) {
            match.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function() { match.click(); }, 600 + Math.floor(Math.random() * 400));
            return true;
          }
          return false;
        })();
      `);
      if (clicked) await this.sleep(700);
      return clicked;
    } catch { return false; }
  }

  // ── CAPTCHA detection ─────────────────────────────────────────────────────

  private async hasCaptcha(wc: Electron.WebContents): Promise<boolean> {
    if (wc.isDestroyed()) return false;
    try {
      const found: boolean = await wc.executeJavaScript(`
        (function() {
          var body = document.body?.innerText?.toLowerCase() || '';
          var url = window.location.href.toLowerCase();
          return url.includes('captcha') || url.includes('challenge') ||
                 body.includes('recaptcha') || body.includes('hcaptcha') ||
                 body.includes('i am not a robot') || body.includes('verify you are human') ||
                 !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, .h-captcha');
        })();
      `);
      return found;
    } catch { return false; }
  }

  private async waitForCaptchaGone(wc: Electron.WebContents, task: AgentTask, maxMs: number): Promise<void> {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline && this.isRunning(task)) {
      await this.sleep(3000);
      if (!(await this.hasCaptcha(wc))) return;
    }
    task.logs.push('⚠️ CAPTCHA wait timed out — continuing anyway');
    this.emitStatus(task);
  }

  // ── Real visible scrolling ────────────────────────────────────────────────

  /**
   * Scroll the page naturally for `durationMs` milliseconds.
   *
   * Uses smooth scrollTo() so the motion is visible in the WebContentsView.
   * Fires scroll events that GA4 Enhanced Measurement picks up for scroll depth.
   * Includes human-like pauses (reading stops) and occasional scroll-up.
   */
  private async scrollPage(
    wc: Electron.WebContents,
    task: AgentTask,
    durationMs: number,
  ): Promise<void> {
    const speeds = {
      slow:   { min: 80,  max: 200, pauseMin: 1200, pauseMax: 2500 },
      medium: { min: 200, max: 400, pauseMin: 700,  pauseMax: 1500 },
      fast:   { min: 400, max: 700, pauseMin: 300,  pauseMax: 700  },
    };
    const s = speeds[task.scrollSpeed] || speeds.medium;
    const end = Date.now() + durationMs;
    let scrolledToBottom = false;

    while (Date.now() < end && this.isRunning(task)) {
      if (wc.isDestroyed()) break;

      // Occasionally scroll up a bit (humans scroll back up to re-read)
      const goUp = Math.random() < 0.18;
      const amount = s.min + Math.random() * (s.max - s.min);
      const direction = goUp ? -1 : 1;

      try {
        const result: { atBottom: boolean; scrollY: number } = await wc.executeJavaScript(`
          (function() {
            var step = ${Math.round(amount * direction)};
            var target = window.scrollY + step;
            var maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
            target = Math.max(0, Math.min(target, maxScroll));
            window.scrollTo({ top: target, behavior: 'smooth' });
            return { atBottom: target >= maxScroll - 10, scrollY: target };
          })();
        `);

        // If we're at the bottom, do a reading pause then scroll back up
        if (result.atBottom && !scrolledToBottom) {
          scrolledToBottom = true;
          task.logs.push(`  📌 Reached page bottom — reading pause...`);
          this.emitStatus(task);
          await this.sleep(2000 + Math.random() * 2000);
          // Scroll back to middle (human reads content, scrolls up)
          try {
            await wc.executeJavaScript(`
              window.scrollTo({ top: document.body.scrollHeight * 0.4, behavior: 'smooth' });
            `);
          } catch { }
          scrolledToBottom = false;
          await this.sleep(1500 + Math.random() * 1000);
          continue;
        }
      } catch { break; }

      // Human reading pause between scroll steps
      const pause = s.pauseMin + Math.random() * (s.pauseMax - s.pauseMin);
      await this.sleep(pause);
    }
  }

  // ── Internal link browsing ────────────────────────────────────────────────

  /**
   * Find internal links on the page and click them one by one.
   * Clicking (not loadURL) keeps the referrer chain intact so GA4
   * records them as page_view events in the same session.
   */
  private async visitInternalLinks(
    wc: Electron.WebContents,
    task: AgentTask,
    baseUrl: string,
    label: string,
  ): Promise<void> {
    try {
      const origin = new URL(baseUrl).origin;
      const max = task.maxInternalLinks || 3;

      const links: string[] = await wc.executeJavaScript(`
        (function() {
          var origin = ${JSON.stringify(origin)};
          var current = window.location.href;
          var seen = new Set();
          return Array.from(document.querySelectorAll('a[href]'))
            .map(function(a) { return a.href; })
            .filter(function(href) {
              try {
                var u = new URL(href);
                var ok = u.origin === origin && u.href !== current && !seen.has(u.href)
                      && !u.hash && !href.includes('login') && !href.includes('logout')
                      && !href.includes('admin') && !href.match(/\\.(pdf|zip|jpg|png|gif|svg)$/i);
                if (ok) seen.add(u.href);
                return ok;
              } catch(e) { return false; }
            })
            .sort(function() { return Math.random() - 0.5; })
            .slice(0, ${max * 4}); // grab extra to have choices after shuffle
        })();
      `);

      if (!links || links.length === 0) {
        task.logs.push(`  ℹ️ No internal links found`);
        this.emitStatus(task);
        return;
      }

      const chosen = links.slice(0, max);
      task.logs.push(`  🔗 Will visit ${chosen.length} internal pages`);
      this.emitStatus(task);

      for (const link of chosen) {
        if (!this.isRunning(task) || wc.isDestroyed()) break;

        const shortLink = link.replace(origin, '');
        task.logs.push(`  🔗 → ${shortLink}`);
        this.emitStatus(task);

        // Navigate with referrer = current page (keeps session chain real)
        const currentUrl = wc.getURL();
        await this.navigateWithReferrer(wc, link, currentUrl);
        await this.waitForIdle(wc, 15_000);

        // Scroll for 5–12 seconds on internal page
        const innerTime = 5000 + Math.random() * 7000;
        await this.scrollPage(wc, task, innerTime);
        await this.sleep(500 + Math.random() * 1000);
      }
    } catch { /* ignore — internal links are optional */ }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private isRunning(task: AgentTask): boolean { return !!this.runningTasks.get(task.id); }
  private sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
  private emitStatus(task: AgentTask): void { this.statusCallback?.(task); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a proxyRules string with credentials embedded directly in the URL.
 * Chromium supports http://user:pass@host:port and socks5://user:pass@host:port.
 * Embedding avoids the async 'login' event which can race with the first request
 * and cause auth to fail silently, especially on fast proxy test connections.
 */
function buildProxyRules(proxy: ParsedProxy): string {
  const auth = proxy.username
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? '')}@`
    : '';
  return proxy.protocol === 'socks5'
    ? `socks5://${auth}${proxy.host}:${proxy.port}`
    : `http://${auth}${proxy.host}:${proxy.port}`;
}

/** Parse proxy string into components. Supports:
 *  host:port
 *  host:port:user:pass
 *  http://user:pass@host:port
 *  socks5://user:pass@host:port
 */
/**
 * Parses a single proxy line.  Supported formats:
 *   host:port
 *   host:port:user:pass                     ← Webshare default
 *   user:pass@host:port                     (no protocol)
 *   http://[user:pass@]host:port
 *   socks5://[user:pass@]host:port
 *   socks4://[user:pass@]host:port
 *   host port [user] [pass]                 (space / tab separated)
 * Lines starting with # are treated as comments and return null.
 */
function parseProxy(line: string): ParsedProxy | null {
  try {
    line = line.trim();
    if (!line || line.startsWith('#')) return null;

    // ── Full URL with protocol prefix ─────────────────────────────────────
    if (line.includes('://')) {
      const isSocks = /^socks[45]:\/\//i.test(line);
      const u = new URL(line);
      return {
        protocol: isSocks ? 'socks5' : 'http',
        host: u.hostname,
        port: parseInt(u.port) || (isSocks ? 1080 : 8080),
        username: u.username ? decodeURIComponent(u.username) : undefined,
        password: u.password ? decodeURIComponent(u.password) : undefined,
      };
    }

    // ── user:pass@host:port (without protocol) ────────────────────────────
    if (line.includes('@')) {
      const atIdx   = line.lastIndexOf('@');
      const creds   = line.slice(0, atIdx);
      const hostPort = line.slice(atIdx + 1).split(':');
      const colonIdx = creds.indexOf(':');
      return {
        protocol: 'http',
        host:     hostPort[0],
        port:     parseInt(hostPort[1]) || 8080,
        username: colonIdx >= 0 ? creds.slice(0, colonIdx) : creds || undefined,
        password: colonIdx >= 0 ? creds.slice(colonIdx + 1) : undefined,
      };
    }

    // ── Whitespace-separated: host port [user] [pass] ─────────────────────
    if (/[ \t]/.test(line)) {
      const parts = line.split(/\s+/);
      return {
        protocol: 'http',
        host:     parts[0],
        port:     parseInt(parts[1]) || 8080,
        username: parts[2] || undefined,
        password: parts[3] || undefined,
      };
    }

    // ── Colon-separated: host:port[:user[:pass]] or user:pass:host:port ───
    const parts = line.split(':');
    if (parts.length >= 2) {
      // Detect user:pass:host:port order heuristically:
      // If part[1] is NOT a pure number (i.e. not a port), treat as password,
      // and part[2] as host, part[3] as port.
      const part1IsPort = /^\d+$/.test(parts[1]);
      const part3IsPort = parts.length >= 4 && /^\d+$/.test(parts[3]);
      if (!part1IsPort && part3IsPort) {
        return {
          protocol: 'http',
          host:     parts[2],
          port:     parseInt(parts[3]),
          username: parts[0] || undefined,
          password: parts[1] || undefined,
        };
      }
      // Standard: host:port[:user[:pass]]
      return {
        protocol: 'http',
        host:     parts[0],
        port:     parseInt(parts[1]) || 8080,
        username: parts[2] || undefined,
        password: parts[3] || undefined,
      };
    }

    return null;
  } catch { return null; }
}

/** Return the content bounds for a WebContentsView (below chrome, left of sidebar). */
function getContentBounds(win: BrowserWindow, sidebarWidth: number): Electron.Rectangle {
  const [width, height] = win.getContentSize();
  return {
    x: 0,
    y: CHROME_HEIGHT,
    width: Math.max(200, width - sidebarWidth),
    height: Math.max(200, height - CHROME_HEIGHT),
  };
}

/** Extract hostname from URL, strip www prefix. */
function safeDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** Pick a user agent from the pool, rotating deterministically per visit. */
function pickUA(deviceType: string, visitIndex: number): string {
  const pool = deviceType === 'mobile' ? UA_MOBILE : deviceType === 'tablet' ? UA_TABLET : UA_DESKTOP;
  return pool[visitIndex % pool.length];
}
