const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');

// ── Keep a global reference so window isn't GC'd ──────────────
let mainWindow = null;
let tray       = null;
const isDev    = process.argv.includes('--dev');

// ── Single-instance lock ───────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── Create main window ─────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 820,
    minWidth:  640,
    minHeight: 500,
    title: 'SolenTrack',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
    // Remove default menu bar (we build our own)
    autoHideMenuBar: true,
    // Nice frame
    frame: true,
    show: false,   // show after ready-to-show for no white flash
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window once fully loaded (no white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Minimise to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          title: 'SolenTrack',
          content: 'Still running — click the tray icon to reopen.',
          iconType: 'info',
        });
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Application menu ───────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'SolenTrack',
      submenu: [
        { label: 'About SolenTrack', click: showAbout },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuiting = true; app.quit(); } },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reload() },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { label: 'Show / Hide', click: toggleWindow },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── System tray ────────────────────────────────────────────────
function createTray() {
  // Use a simple built-in icon if no asset exists
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  const fs = require('fs');
  if (!fs.existsSync(iconPath)) {
    // Skip tray on missing icon — not critical
    return;
  }
  tray = new Tray(iconPath);
  tray.setToolTip('SolenTrack — Time Manager');
  const menu = Menu.buildFromTemplate([
    { label: 'Open SolenTrack', click: showWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', toggleWindow);
}

function showWindow()  { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } }
function toggleWindow(){ if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : showWindow(); } }

// ── About dialog ───────────────────────────────────────────────
function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About SolenTrack',
    message: 'SolenTrack v1.0',
    detail: 'Professional time tracker & invoice manager\nby SolenVisuals\n\nhello@solenvisuals.com\nwww.solenvisuals.com',
    buttons: ['Close'],
  });
}

// ── IPC handlers (called from renderer via preload) ────────────
ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('dialog:save',  async (_, opts) => dialog.showSaveDialog(mainWindow, opts));
ipcMain.handle('dialog:open',  async (_, opts) => dialog.showOpenDialog(mainWindow, opts));

// ── App lifecycle ──────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  buildMenu();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
});

app.on('window-all-closed', () => {
  // On Windows/Linux quit when all windows closed
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { app.isQuiting = true; });
