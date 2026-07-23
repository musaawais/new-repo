import React from 'react';
import type { SidebarView, AgentTask } from '../store/types';
import { AgentPanel } from './Agent/AgentPanel';
import { ProxyPanel } from './Proxy/ProxyPanel';
import { SettingsPanel } from './SettingsPanel';

interface SidebarProps {
  view: SidebarView;
  agentTasks: AgentTask[];
  onTasksChange: (tasks: AgentTask[]) => void;
  onClose: () => void;
}

const TITLES: Record<SidebarView, string> = {
  browser: 'Browser',
  agent: 'Agent Mode',
  proxy: 'VPN & Proxy',
  settings: 'Settings',
};

export function Sidebar({ view, agentTasks, onTasksChange, onClose }: SidebarProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
          {TITLES[view]}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
            borderRadius: 6, padding: 4,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'agent' && (
          <AgentPanel tasks={agentTasks} onTasksChange={onTasksChange} />
        )}
        {view === 'proxy' && <ProxyPanel />}
        {view === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
