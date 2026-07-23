import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { TabInfo, SidebarView } from '../../store/types';

interface NavigationBarProps {
  activeTab: TabInfo | null;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  onToggleSidebar: (view: SidebarView) => void;
}

function NavBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      className="no-drag flex items-center justify-center rounded-lg transition-all"
      style={{
        width: 30, height: 30, border: 'none', cursor: 'pointer',
        background: 'transparent', color: 'rgba(255,255,255,0.5)',
      }}
      onClick={onClick}
      title={title}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
      }}
    >
      {children}
    </button>
  );
}

function SidebarBtn({
  view, label, children, active, onToggle,
}: {
  view: SidebarView;
  label: string;
  children: React.ReactNode;
  active: boolean;
  onToggle: (v: SidebarView) => void;
}) {
  return (
    <button
      className="no-drag flex items-center justify-center rounded-lg transition-all"
      style={{
        width: 30, height: 30, border: 'none', cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
        color: active ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
      }}
      onClick={() => onToggle(view)}
      title={label}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
        }
      }}
    >
      {children}
    </button>
  );
}

export function NavigationBar({
  activeTab, onNavigate, onBack, onForward, onReload,
  sidebarOpen, sidebarView, onToggleSidebar,
}: NavigationBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused && activeTab?.url && activeTab.url !== 'about:blank') {
      setInputValue(activeTab.url);
    }
  }, [activeTab?.url, focused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onNavigate(inputValue.trim());
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setInputValue(activeTab?.url || '');
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setFocused(true);
    inputRef.current?.select();
  };

  const handleBlur = () => {
    setFocused(false);
    if (activeTab?.url) setInputValue(activeTab.url);
  };

  const displayUrl = focused ? inputValue : (activeTab?.url || '');
  const isSecure = activeTab?.url?.startsWith('https://');

  return (
    <div className="no-drag flex items-center gap-2 flex-1">
      {/* Back/Forward/Reload */}
      <NavBtn onClick={onBack} title="Back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </NavBtn>
      <NavBtn onClick={onForward} title="Forward">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </NavBtn>
      <NavBtn onClick={onReload} title="Reload">
        {activeTab?.isLoading ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        )}
      </NavBtn>

      {/* Address bar */}
      <div
        className="flex-1 flex items-center gap-2 rounded-xl transition-all"
        style={{
          background: focused ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
          padding: '0 12px',
          height: 34,
        }}
      >
        {/* Lock icon */}
        {!focused && activeTab?.url && (
          <span style={{ color: isSecure ? '#4ade80' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {isSecure ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            )}
          </span>
        )}
        <input
          ref={inputRef}
          value={displayUrl}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search or enter URL"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e8e8f0', fontSize: 13, fontWeight: 400,
          }}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* Right toolbar: Agent, Proxy, Settings */}
      <div className="flex items-center gap-1 ml-1">
        <SidebarBtn view="agent" label="Agent Mode" active={sidebarOpen && sidebarView === 'agent'} onToggle={onToggleSidebar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            <path d="M16 3.5c1.7.7 3 2.4 3 4.5"/>
          </svg>
        </SidebarBtn>
        <SidebarBtn view="proxy" label="VPN / Proxy" active={sidebarOpen && sidebarView === 'proxy'} onToggle={onToggleSidebar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </SidebarBtn>
        <SidebarBtn view="settings" label="Settings" active={sidebarOpen && sidebarView === 'settings'} onToggle={onToggleSidebar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </SidebarBtn>
      </div>
    </div>
  );
}
