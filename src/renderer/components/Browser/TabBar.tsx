import React from 'react';
import type { TabInfo } from '../../store/types';

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
}

export function TabBar({ tabs, activeTabId, onActivate, onClose, onNewTab }: TabBarProps) {
  return (
    <div className="no-drag flex items-end gap-1 flex-1 overflow-x-auto overflow-y-hidden">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-item no-drag group ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => onActivate(tab.id)}
          title={tab.title || tab.url}
        >
          {/* Favicon or spinner */}
          <span className="shrink-0" style={{ width: 14, height: 14, display: 'flex', alignItems: 'center' }}>
            {tab.isLoading ? (
              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
            ) : tab.favicon ? (
              <img
                src={tab.favicon}
                alt=""
                style={{ width: 14, height: 14, objectFit: 'contain' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            )}
          </span>

          {/* Title */}
          <span className="truncate flex-1 text-xs" style={{ maxWidth: 120 }}>
            {tab.title || 'New Tab'}
          </span>

          {/* Close button */}
          <button
            className="no-drag shrink-0 opacity-0 group-hover:opacity-100 hover:text-white transition-all rounded-full"
            style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}

      {/* New tab button */}
      <button
        className="no-drag shrink-0 flex items-center justify-center rounded-lg transition-all"
        style={{
          width: 28, height: 28,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
        }}
        onClick={onNewTab}
        title="New Tab"
        onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'; }}
        onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
