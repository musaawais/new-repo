# AgentBrowser

A macOS browser with built-in VPN/Proxy support and AI-powered agent automation.

## Features

- **Multi-tab browsing** — Full Chromium-powered browser with tabbed interface
- **VPN / Proxy** — 50+ country proxy servers, SOCKS5 & HTTP, custom proxy support
- **Agent Mode** — Automated browsing tasks with:
  - Keyword-based research configuration
  - Multi-URL task targeting
  - Country-specific agent location
  - Visit count control
  - Device emulation (desktop, mobile, tablet)
  - Time-on-page control (20–300s)
  - Realistic scroll speed (slow/medium/fast)
  - Internal link click navigation
  - Real-time progress and activity logs

## Build for macOS (Intel)

See `build/README-build.md` for full instructions.

**Quick start on your Mac:**

```bash
# 1. Install pnpm
npm install -g pnpm

# 2. Install dependencies
pnpm install

# 3. Build the DMG
pnpm run dist:dmg

# 4. Open the DMG
open release/AgentBrowser-1.0.0.dmg
```

## Architecture

```
src/
├── main/               # Electron main process (Node.js)
│   ├── index.ts        # App entry point, BrowserWindow creation
│   ├── browser-manager.ts   # Tab/WebContentsView management
│   ├── agent-engine.ts      # Automated browsing engine
│   ├── proxy-manager.ts     # VPN/Proxy session control
│   ├── ipc-handlers.ts      # IPC bridge (main ↔ renderer)
│   └── preload.ts           # Secure context bridge
└── renderer/           # React UI (Chromium renderer)
    ├── App.tsx          # Root component
    ├── components/
    │   ├── Browser/     # Tab bar, navigation bar
    │   ├── Agent/       # Agent task panel, form, cards
    │   ├── Proxy/       # VPN/Proxy panel
    │   └── SettingsPanel.tsx
    └── data/
        └── countries.ts # 50+ country proxy database
```
