import React, { useState } from 'react';

const api = (window as any).api;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="glass rounded-xl p-3 flex items-center justify-between gap-3">
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? '#6366f1' : 'rgba(255,255,255,0.15)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 22 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const [adblock, setAdblock] = useState(true);
  const [doNotTrack, setDoNotTrack] = useState(true);
  const [javascript, setJavascript] = useState(true);
  const [images, setImages] = useState(true);
  const [cookies, setCookies] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="flex flex-col gap-5 p-4">
      <Section title="Privacy">
        <ToggleRow label="Ad Blocker" description="Block ads and trackers" value={adblock} onChange={setAdblock} />
        <ToggleRow label="Do Not Track" description="Send DNT header with requests" value={doNotTrack} onChange={setDoNotTrack} />
        <ToggleRow label="Block Cookies" description="Block third-party cookies" value={cookies} onChange={setCookies} />
      </Section>

      <Section title="Browser">
        <ToggleRow label="JavaScript" description="Enable JavaScript on all pages" value={javascript} onChange={setJavascript} />
        <ToggleRow label="Load Images" description="Load images on all pages" value={images} onChange={setImages} />
        <ToggleRow label="Dark Mode" description="Apply dark mode to browser UI" value={darkMode} onChange={setDarkMode} />
      </Section>

      <Section title="About">
        <div className="glass rounded-xl p-4 flex flex-col gap-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          <div className="flex justify-between">
            <span>App</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>AgentBrowser</span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Platform</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>macOS (Intel x64)</span>
          </div>
          <div className="flex justify-between">
            <span>Engine</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>Electron 30 + Chromium</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
