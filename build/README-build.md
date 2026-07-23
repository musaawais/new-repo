# Building AgentBrowser.dmg for macOS (Intel)

## Prerequisites

You need **macOS** with the following installed:

```bash
# Install Node.js 20+ (https://nodejs.org or via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm
```

## Build Steps

### 1. Copy the project to your Mac

Download or clone the `browser-app` directory to your Mac. Then:

```bash
cd browser-app
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build the app

```bash
pnpm run build
```

This compiles:
- TypeScript main process → `dist/main/`
- React renderer → `dist/renderer/`

### 4. Package as .dmg

```bash
pnpm run dist:dmg
```

The output will be in `release/`:
```
release/
  AgentBrowser-1.0.0.dmg        ← drag this to Applications
  AgentBrowser-1.0.0-mac.zip    ← alternate zip version
```

### 5. Install on your Mac

1. Open `AgentBrowser-1.0.0.dmg`
2. Drag **AgentBrowser** to the **Applications** folder
3. Right-click → **Open** the first time (bypasses Gatekeeper for unsigned apps)
4. You're done!

---

## First-run Gatekeeper warning

Because the app is unsigned (no Apple Developer account), macOS will show:
> "AgentBrowser" cannot be opened because the developer cannot be verified.

**Fix:** Right-click the app → **Open** → **Open** again. You only need to do this once.

Or from Terminal:
```bash
xattr -cr /Applications/AgentBrowser.app
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `electron` binary not found | Run `pnpm install` again; Electron downloads on install |
| Build fails with missing `uuid` | Run `pnpm add uuid @types/uuid` |
| DMG won't open | Try `xattr -cr` command above |
| Proxy not connecting | Use a fresh proxy server; free proxies expire frequently |

---

## App Features

### Browser
- Multi-tab browsing powered by Chromium (via Electron)
- Keyboard shortcuts: ⌘T new tab, ⌘W close tab, ⌘R reload, ⌘L focus URL bar
- macOS native look with traffic light buttons and vibrancy

### VPN / Proxy
- 50+ countries with pre-configured proxy servers
- HTTP and SOCKS5 protocol support
- Custom proxy server support (username/password auth)
- Per-session proxy — doesn't affect your system proxy

### Agent Mode
- Fully automated browsing tasks with configurable parameters
- Realistic human-like scrolling (smooth, eased)
- Internal link navigation with depth control  
- Device type emulation (desktop, mobile, tablet)
- Per-task country/proxy assignment
- Real-time progress and activity log
- Multiple concurrent tasks supported
