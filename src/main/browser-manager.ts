import { BrowserWindow, WebContentsView, Rectangle } from 'electron';
import { EventEmitter } from 'events';
import path from 'path';

export interface TabInfo {
  id: string;
  view: WebContentsView;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
}

export const CHROME_HEIGHT = 90; // exported so agent-engine can use the same constant

export class BrowserManager extends EventEmitter {
  private win: BrowserWindow;
  private tabs: Map<string, TabInfo> = new Map();
  /** Tab IDs that belong to agent tasks — they have NO WebContentsView of their
   *  own; the agent engine manages per-visit views directly. */
  private agentTabs = new Set<string>();
  private activeTabId: string | null = null;
  private rendererReady = false;
  private pendingUpdates: Array<() => void> = [];
  private sidebarWidth = 0;

  constructor(win: BrowserWindow) {
    super();
    this.win = win;
    win.webContents.once('did-finish-load', () => {
      this.rendererReady = true;
      this.pendingUpdates.forEach((fn) => fn());
      this.pendingUpdates = [];
    });
  }

  getSidebarWidth(): number { return this.sidebarWidth; }

  setSidebarWidth(width: number) {
    this.sidebarWidth = width;
    this.repositionViews();
  }

  getBrowserBounds(): Rectangle {
    const [width, height] = this.win.getContentSize();
    return {
      x: 0,
      y: CHROME_HEIGHT,
      width: Math.max(200, width - this.sidebarWidth),
      height: Math.max(200, height - CHROME_HEIGHT),
    };
  }

  /** Return the currently active tab ID (used by agent to check visibility). */
  getActiveTabId(): string | null { return this.activeTabId; }

  // ── Agent virtual tab management ───────────────────────────────────────────

  /**
   * Register a virtual "agent tab" that shows in the tab bar but has no
   * WebContentsView.  The agent engine manages its own per-visit views.
   * Automatically activates the tab so the user sees the agent running.
   */
  registerAgentTab(tabId: string, title: string) {
    this.agentTabs.add(tabId);

    // Hide any currently active real tab's view
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      try { this.win.contentView.removeChildView(this.tabs.get(this.activeTabId)!.view); } catch { }
    }
    this.activeTabId = tabId;
    this.emit('tab-switched', tabId);

    // Tell renderer to add this tab to the tab bar
    const doSend = () => {
      try {
        if (!this.win.isDestroyed() && !this.win.webContents.isDestroyed())
          this.win.webContents.send('tab-created', {
            id: tabId, url: '', title, favicon: '🤖', isLoading: true,
          });
      } catch { }
    };
    if (this.rendererReady) doSend(); else this.pendingUpdates.push(doSend);
  }

  /**
   * Remove the agent's virtual tab from the tab bar and switch to the next
   * available real tab (or open a new one if none exist).
   */
  unregisterAgentTab(tabId: string) {
    this.agentTabs.delete(tabId);

    if (this.activeTabId === tabId) {
      const nextId = [...this.tabs.keys()][0] ?? null;
      if (nextId) {
        this.activeTabId = nextId;
        const tab = this.tabs.get(nextId)!;
        try {
          this.win.contentView.addChildView(tab.view);
          tab.view.setBounds(this.getBrowserBounds());
        } catch { }
        this.emit('tab-switched', nextId);
      } else {
        this.activeTabId = null;
        this.emit('tab-switched', null);
      }
    }

    // Tell renderer to remove the tab from the tab bar
    try {
      if (!this.win.isDestroyed() && !this.win.webContents.isDestroyed())
        this.win.webContents.send('tab-closed', tabId);
    } catch { }
  }

  // ── Tab factories ──────────────────────────────────────────────────────────

  createTab(id: string, url = 'about:blank'): TabInfo {
    return this._createView(id, url, false);
  }

  /**
   * Create a stealth tab for user-browsing (injects agent-preload.js to hide
   * navigator.webdriver). The agent engine manages its OWN views separately.
   */
  createAgentTab(id: string, url = 'about:blank'): TabInfo {
    return this._createView(id, url, true);
  }

  private _createView(id: string, url: string, stealth: boolean): TabInfo {
    const preloadPath = stealth
      ? path.join(__dirname, 'agent-preload.js')
      : undefined;

    const view = new WebContentsView({
      webPreferences: {
        ...(preloadPath ? { preload: preloadPath } : {}),
        sandbox: !stealth,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        javascript: true,
      },
    });
    view.setBackgroundColor('#ffffff');
    view.webContents.loadURL(url).catch(() => {});

    view.webContents.on('did-start-loading', () => {
      const tab = this.tabs.get(id);
      if (tab && !view.webContents.isDestroyed()) { tab.isLoading = true; this.sendTabUpdate(id); }
    });
    view.webContents.on('did-stop-loading', () => {
      const tab = this.tabs.get(id);
      if (tab && !view.webContents.isDestroyed()) {
        tab.isLoading = false; tab.url = view.webContents.getURL(); this.sendTabUpdate(id);
      }
    });
    view.webContents.on('page-title-updated', (_, title) => {
      const tab = this.tabs.get(id);
      if (tab && !view.webContents.isDestroyed()) { tab.title = title; this.sendTabUpdate(id); }
    });
    view.webContents.on('page-favicon-updated', (_, favicons) => {
      const tab = this.tabs.get(id);
      if (tab && !view.webContents.isDestroyed() && favicons.length > 0) { tab.favicon = favicons[0]; this.sendTabUpdate(id); }
    });
    view.webContents.on('did-navigate', (_, navUrl) => {
      const tab = this.tabs.get(id);
      if (tab && !view.webContents.isDestroyed()) { tab.url = navUrl; this.sendTabUpdate(id); }
    });
    view.webContents.on('did-navigate-in-page', (_, navUrl) => {
      const tab = this.tabs.get(id);
      if (tab && !view.webContents.isDestroyed()) { tab.url = navUrl; this.sendTabUpdate(id); }
    });

    const tabInfo: TabInfo = { id, view, url, title: 'New Tab', favicon: '', isLoading: true };
    this.tabs.set(id, tabInfo);
    return tabInfo;
  }

  // ── Tab operations ─────────────────────────────────────────────────────────

  activateTab(id: string) {
    if (this.activeTabId === id) return;

    // Hide view of current real tab (agent tabs have no view to hide)
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      try { this.win.contentView.removeChildView(this.tabs.get(this.activeTabId)!.view); } catch { }
    }

    this.activeTabId = id;
    this.emit('tab-switched', id); // lets agent engine show/hide its views

    // Agent tabs have no persistent view — agent handles view via tab-switched event
    if (this.agentTabs.has(id)) return;

    const tab = this.tabs.get(id);
    if (!tab) return;
    try {
      this.win.contentView.addChildView(tab.view);
      tab.view.setBounds(this.getBrowserBounds());
    } catch { }
  }

  closeTab(id: string) {
    // Agent tabs: emit event so the corresponding task can be stopped
    if (this.agentTabs.has(id)) {
      this.emit('agent-tab-closed', id);
      this.unregisterAgentTab(id);
      return;
    }

    const tab = this.tabs.get(id);
    if (!tab) return;
    if (this.activeTabId === id) {
      try { this.win.contentView.removeChildView(tab.view); } catch { }
      this.activeTabId = null;
      this.emit('tab-switched', null);
    }
    try { (tab.view.webContents as any).destroy(); } catch { }
    this.tabs.delete(id);
  }

  navigateTab(id: string, url: string) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    let nav = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
      nav = url.includes('.') && !url.includes(' ')
        ? 'https://' + url
        : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    try { tab.view.webContents.loadURL(nav); } catch { }
  }

  goBack(id: string)      { const t = this.tabs.get(id); try { if (t?.view.webContents.canGoBack())    t.view.webContents.goBack();    } catch { } }
  goForward(id: string)   { const t = this.tabs.get(id); try { if (t?.view.webContents.canGoForward()) t.view.webContents.goForward(); } catch { } }
  reload(id: string)      { const t = this.tabs.get(id); try { t?.view.webContents.reload();             } catch { } }
  stopLoading(id: string) { const t = this.tabs.get(id); try { t?.view.webContents.stop();               } catch { } }

  repositionViews() {
    if (!this.activeTabId || this.agentTabs.has(this.activeTabId)) return;
    const tab = this.tabs.get(this.activeTabId);
    try { if (tab && !this.win.isDestroyed()) tab.view.setBounds(this.getBrowserBounds()); } catch { }
  }

  getWebContents(id: string) { return this.tabs.get(id)?.view.webContents; }

  /** Tell the renderer a new REAL tab was created (e.g. by the agent via window.open). */
  sendTabCreated(id: string) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const doSend = () => {
      try {
        if (this.win.isDestroyed() || this.win.webContents.isDestroyed()) return;
        const { view: _v, ...info } = tab;
        this.win.webContents.send('tab-created', info);
      } catch { }
    };
    if (this.rendererReady) doSend(); else this.pendingUpdates.push(doSend);
  }

  private sendTabUpdate(id: string) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const doSend = () => {
      try {
        if (this.win.isDestroyed() || this.win.webContents.isDestroyed()) return;
        const { view: _v, ...info } = tab;
        this.win.webContents.send('tab-updated', info);
      } catch { }
    };
    if (this.rendererReady) doSend(); else this.pendingUpdates.push(doSend);
  }
}
