# SolenTrack — Desktop App

Professional time tracker, session manager & invoice generator by SolenVisuals.

---

## Quick Start (Run Locally)

### Prerequisites
- **Node.js** v18 or newer → https://nodejs.org

### 1. Install dependencies
Open a terminal in this folder and run:

```
npm install
```

### 2. Launch the app
```
npm start
```

That's it. SolenTrack opens as a native desktop window.

---

## Build an Installer (optional)

Create a distributable `.exe` installer for Windows:
```
npm run build-win
```

Mac `.dmg`:
```
npm run build-mac
```

Linux `.AppImage`:
```
npm run build-linux
```

The output lands in the `dist/` folder.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / stop simple timer (on Tracker page) |
| `Esc` | Close modals / exit fullscreen |
| `N` | Open new time entry |
| `Ctrl+R` | Reload app |
| `Ctrl+Q` | Quit |
| `Ctrl++/-` | Zoom in / out |

---

## Data & Storage

All your data is stored in your **browser's localStorage** inside the Electron window.
To back up: go to **Settings → Export JSON Backup**.
To restore: go to **Settings → Import JSON**.

---

## Tray Icon

SolenTrack lives in your system tray when minimised.
Click the tray icon to show/hide the window.

---

## Support
hello@solenvisuals.com | www.solenvisuals.com
