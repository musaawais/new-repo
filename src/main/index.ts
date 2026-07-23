import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SimpleStore } from './simple-store';
import { BrowserManager } from './browser-manager';
import { ProxyManager } from './proxy-manager';
import { AgentEngine } from './agent-engine';
// ── Stealth: remove Chromium automation flags before anything else ─────────────
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-infobars');
app.commandLine.appendSwitch('no-default-browser-check');

process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

const store = new SimpleStore();

export const refs = {
  mainWindow: null as BrowserWindow | null,
  browserManager: null as BrowserManager | null,
  proxyManager: null as ProxyManager | null,
  agentEngine: null as AgentEngine | null,
};

/** Maps agent virtual tab IDs → task IDs so we can stop the task when the tab is closed. */
const agentTabToTask = new Map<string, string>();

/** Returns the currently active proxy rules string (from VPN or manual proxy panel),
 *  or null if nothing is active. Agent sessions use this as a fallback. */
function getActiveProxyRules(): string | null {
  return refs.proxyManager?.getProxyRules() ?? null;
}

// ── Register ALL IPC handlers exactly once ────────────────────────────────────
function registerIpcHandlers() {

  // ── Browser ────────────────────────────────────────────────────────────────
  ipcMain.handle('browser:new-tab', (_, url?: string) => {
    const bm = refs.browserManager;
    if (!bm) return null;
    const id = uuidv4();
    const tab = bm.createTab(id, url || 'https://www.google.com');
    bm.activateTab(id);
    return { id, url: tab.url, title: tab.title, favicon: tab.favicon, isLoading: true };
  });

  ipcMain.handle('browser:close-tab', (_, id: string) => {
    refs.browserManager?.closeTab(id); return { success: true };
  });

  ipcMain.handle('browser:activate-tab', (_, id: string) => {
    refs.browserManager?.activateTab(id); return { success: true };
  });

  ipcMain.handle('browser:navigate', (_, id: string, url: string) => {
    refs.browserManager?.navigateTab(id, url); return { success: true };
  });

  ipcMain.handle('browser:go-back', (_, id: string) => {
    refs.browserManager?.goBack(id); return { success: true };
  });

  ipcMain.handle('browser:go-forward', (_, id: string) => {
    refs.browserManager?.goForward(id); return { success: true };
  });

  ipcMain.handle('browser:reload', (_, id: string) => {
    refs.browserManager?.reload(id); return { success: true };
  });

  ipcMain.handle('browser:stop', (_, id: string) => {
    refs.browserManager?.stopLoading(id); return { success: true };
  });

  ipcMain.handle('browser:set-sidebar-width', (_, width: number) => {
    refs.browserManager?.setSidebarWidth(width); return { success: true };
  });

  // ── Proxy ─────────────────────────────────────────────────────────────────
  ipcMain.handle('proxy:set', async (_, config) => {
    if (refs.proxyManager) await refs.proxyManager.setProxy(config);
    return { success: true };
  });

  ipcMain.handle('proxy:clear', async () => {
    if (refs.proxyManager) await refs.proxyManager.clearProxy();
    return { success: true };
  });

  ipcMain.handle('proxy:get-state', () => refs.proxyManager?.getState() ?? null);

  // VPN feature removed — use Proxy panel for proxy configuration
  ipcMain.handle('vpn:connect', async () => ({ success: false, error: 'Use proxy settings instead' }));
  ipcMain.handle('vpn:disconnect', async () => ({ success: true }));
  ipcMain.handle('vpn:get-state', () => null);

  // ── Agent ─────────────────────────────────────────────────────────────────
  ipcMain.handle('agent:create-task', (_, input) => {
    if (!refs.agentEngine) throw new Error('Agent engine not ready');
    return refs.agentEngine.createTask(input);
  });

  ipcMain.handle('agent:update-task', (_, taskId: string, updates: any) => {
    if (!refs.agentEngine) throw new Error('Agent engine not ready');
    const updated = refs.agentEngine.updateTask(taskId, updates);
    if (!updated) throw new Error('Task not found or is currently running — stop the task first');
    return updated;
  });

  ipcMain.handle('agent:start-task', async (_, taskId: string) => {
    const win = refs.mainWindow;
    const bm = refs.browserManager;
    const ae = refs.agentEngine;
    if (!win || !bm || !ae) return { success: false, error: 'App not ready' };

    const task = ae.getTask(taskId);
    if (!task) return { success: false, error: 'Task not found' };

    // Create a virtual agent tab that appears in the browser tab bar
    const agentTabId = `agent-tab-${taskId}-${Date.now()}`;
    const tabTitle = task.name || 'Agent Task';
    bm.registerAgentTab(agentTabId, `🤖 ${tabTitle}`);
    agentTabToTask.set(agentTabId, taskId);

    // Start the task — pass callbacks so the agent can manage view visibility
    ae.startTask(
      taskId,
      win,
      () => bm.getSidebarWidth(),
      () => getActiveProxyRules(),
      agentTabId,
      () => bm.getActiveTabId(),
      (cb) => {
        bm.on('tab-switched', cb);
        return () => bm.off('tab-switched', cb);
      },
    ).catch(console.error).finally(() => {
      // Clean up the agent tab when the task finishes or errors
      bm.unregisterAgentTab(agentTabId);
      agentTabToTask.delete(agentTabId);
    });

    return { success: true };
  });

  ipcMain.handle('agent:stop-task', (_, id: string) => {
    refs.agentEngine?.stopTask(id); return { success: true };
  });

  ipcMain.handle('agent:delete-task', (_, id: string) => {
    refs.agentEngine?.deleteTask(id); return { success: true };
  });

  ipcMain.handle('agent:get-all-tasks', () => refs.agentEngine?.getAllTasks() ?? []);

  // ── Store ──────────────────────────────────────────────────────────────────
  ipcMain.handle('store:get', (_, key: string) => store.get(key));

  ipcMain.handle('store:set', (_, key: string, value: unknown) => {
    store.set(key, value); return { success: true };
  });
}

// ── Window factory ────────────────────────────────────────────────────────────
function getRendererURL() {
  return `file://${path.join(__dirname, '../renderer/index.html')}`;
}

async function createMainWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f13',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  refs.mainWindow = win;
  refs.proxyManager = new ProxyManager();
  refs.agentEngine = new AgentEngine();
  refs.browserManager = new BrowserManager(win);

  // ── Agent tab closed by user → stop the corresponding task ────────────────
  refs.browserManager.on('agent-tab-closed', (tabId: string) => {
    const taskId = agentTabToTask.get(tabId);
    if (taskId && refs.agentEngine) {
      refs.agentEngine.stopTask(taskId);
      agentTabToTask.delete(tabId);
    }
  });

  // ── Agent status → renderer ───────────────────────────────────────────────
  refs.agentEngine.onStatusChange((task) => {
    try {
      if (refs.mainWindow && !refs.mainWindow.isDestroyed() && !refs.mainWindow.webContents.isDestroyed()) {
        refs.mainWindow.webContents.send('agent:task-updated', task);
      }
    } catch { }
  });

  win.loadURL(getRendererURL());
  win.on('resize', () => refs.browserManager?.repositionViews());
  win.on('closed', () => {
    if (refs.mainWindow === win) { refs.mainWindow = null; refs.browserManager = null; }
  });

  app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      try {
        if (refs.mainWindow && !refs.mainWindow.isDestroyed())
          refs.mainWindow.webContents.send('open-url-in-new-tab', url);
      } catch { }
      return { action: 'deny' };
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Strip tracking / CSP headers so any site loads
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Frame-Options': [],
        'Content-Security-Policy': [],
      },
    });
  });

  registerIpcHandlers();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
