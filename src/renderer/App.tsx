import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TabInfo, AgentTask, SidebarView } from './store/types';
import { TabBar } from './components/Browser/TabBar';
import { NavigationBar } from './components/Browser/NavigationBar';
import { Sidebar } from './components/Sidebar';

declare global {
  interface Window { api: typeof import('./api').api; }
}

const api = window.api;
const SIDEBAR_WIDTH = 320;

export default function App() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>('browser');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);

  const activeTabIdRef = useRef<string | null>(null);
  activeTabIdRef.current = activeTabId;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    openNewTab();
    api.agent.getAllTasks().then((tasks) => { if (tasks) setAgentTasks(tasks); }).catch(() => {});
  }, []); // eslint-disable-line

  // ── Sidebar width → main process (so browser view doesn't cover sidebar) ─
  useEffect(() => {
    api.browser.setSidebarWidth(sidebarOpen ? SIDEBAR_WIDTH : 0).catch(() => {});
  }, [sidebarOpen]);

  // ── Tab events from main ──────────────────────────────────────────────────
  useEffect(() => {
    // Tab state changed (url, title, favicon, isLoading)
    const offUpdated = api.browser.onTabUpdated((info: TabInfo) => {
      setTabs((prev) => prev.map((t) => (t.id === info.id ? { ...t, ...info } : t)));
    });

    // Agent (or main process) created a brand-new tab — add it to the tab bar
    const offCreated = api.browser.onTabCreated((info: TabInfo) => {
      setTabs((prev) => {
        if (prev.find((t) => t.id === info.id)) return prev; // already present
        return [...prev, info];
      });
      setActiveTabId(info.id);
    });

    // Main process removed a tab (agent finished / user closed agent tab)
    const offClosed = api.browser.onTabClosed((id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabIdRef.current && next.length > 0) {
          const last = next[next.length - 1];
          setActiveTabId(last.id);
          api.browser.activateTab(last.id).catch(() => {});
        }
        return next;
      });
    });

    // window.open() redirected here
    const offUrl = api.browser.onOpenUrl((url: string) => openNewTab(url));

    return () => { offUpdated(); offCreated(); offClosed(); offUrl(); };
  }, []); // eslint-disable-line

  // ── Agent task events ─────────────────────────────────────────────────────
  useEffect(() => {
    const off = api.agent.onTaskUpdated((task: AgentTask) => {
      setAgentTasks((prev) => {
        const i = prev.findIndex((t) => t.id === task.id);
        if (i >= 0) { const next = [...prev]; next[i] = task; return next; }
        return [...prev, task];
      });
    });
    return off;
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openNewTab = useCallback(async (url?: string) => {
    try {
      const tab = await api.browser.newTab(url);
      if (!tab) return;
      setTabs((prev) => {
        if (prev.find((t) => t.id === tab.id)) return prev;
        return [...prev, tab];
      });
      setActiveTabId(tab.id);
    } catch (err) { console.error('openNewTab', err); }
  }, []);

  const closeTab = useCallback(async (id: string) => {
    try { await api.browser.closeTab(id); } catch { }
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (id === activeTabIdRef.current) {
        if (next.length > 0) {
          const last = next[next.length - 1];
          setActiveTabId(last.id);
          api.browser.activateTab(last.id).catch(() => {});
        } else {
          openNewTab();
        }
      }
      return next;
    });
  }, [openNewTab]);

  const activateTab = useCallback(async (id: string) => {
    setActiveTabId(id);
    try { await api.browser.activateTab(id); } catch { }
  }, []);

  const navigate = useCallback(async (url: string) => {
    const id = activeTabIdRef.current;
    if (!id) return;
    try { await api.browser.navigate(id, url); } catch { }
  }, []);

  const goBack    = useCallback(async () => { const id = activeTabIdRef.current; if (id) try { await api.browser.goBack(id);    } catch { } }, []);
  const goForward = useCallback(async () => { const id = activeTabIdRef.current; if (id) try { await api.browser.goForward(id); } catch { } }, []);
  const reload    = useCallback(async () => { const id = activeTabIdRef.current; if (id) try { await api.browser.reload(id);    } catch { } }, []);

  const handleToggleSidebar = useCallback((view: SidebarView) => {
    setSidebarView(view);
    setSidebarOpen((open) => (sidebarView === view ? !open : true));
  }, [sidebarView]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f0f13]">
      {/* ── Chrome (tabs + nav, 90 px) ──────────────────────────────────── */}
      <div className="drag-region flex flex-col shrink-0 border-b border-white/[0.06]" style={{ height: 90 }}>
        <div className="flex items-center pl-[80px] pr-2 pt-2" style={{ height: 42 }}>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onActivate={activateTab}
            onClose={closeTab}
            onNewTab={() => openNewTab()}
          />
        </div>
        <div className="flex items-center px-3 pb-2 gap-2" style={{ height: 48 }}>
          <NavigationBar
            activeTab={activeTab}
            onNavigate={navigate}
            onBack={goBack}
            onForward={goForward}
            onReload={reload}
            sidebarOpen={sidebarOpen}
            sidebarView={sidebarView}
            onToggleSidebar={handleToggleSidebar}
          />
        </div>
      </div>

      {/* ── Content: native browser view + HTML sidebar ──────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Electron places the WebContentsView behind this flex container.
            The view's right edge is kept clear of the sidebar via setSidebarWidth. */}
        <div className="flex-1" />

        {sidebarOpen && (
          <div className="sidebar flex flex-col shrink-0 overflow-hidden" style={{ width: SIDEBAR_WIDTH }}>
            <Sidebar
              view={sidebarView}
              agentTasks={agentTasks}
              onTasksChange={setAgentTasks}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
