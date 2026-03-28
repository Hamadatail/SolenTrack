const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

let mainWindow = null;
let tray       = null;
const isDev    = process.argv.includes('--dev');

// ── File-based storage paths ───────────────────────────────────
const DATA_DIR   = app.getPath('userData');
const DATA_FILE  = path.join(DATA_DIR, 'solentrack-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDirs() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) { console.error('readData:', e); return null; }
}

function writeData(data) {
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
    return true;
  } catch(e) { console.error('writeData:', e); return false; }
}

function autoBackup() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    ensureDirs();
    const date = new Date().toISOString().slice(0,10);
    const dest = path.join(BACKUP_DIR, `solentrack-${date}.json`);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(DATA_FILE, dest);
      // Keep last 30 backups only
      const files = fs.readdirSync(BACKUP_DIR).filter(f=>f.endsWith('.json')).sort();
      if (files.length > 30) files.slice(0, files.length-30).forEach(f=>fs.unlinkSync(path.join(BACKUP_DIR,f)));
    }
  } catch(e) { console.error('autoBackup:', e); }
}

// ── Single instance ────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else { app.on('second-instance', () => { if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();} }); }

// ── Window ────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:1280, height:820, minWidth:680, minHeight:500,
    title:'SolenTrack', backgroundColor:'#f5f5f5',
    webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false, devTools:isDev },
    autoHideMenuBar:true, frame:true, show:false,
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => { mainWindow.show(); autoBackup(); if(isDev) mainWindow.webContents.openDevTools({mode:'detach'}); });
  mainWindow.on('close', (e) => { if(!app.isQuiting){ e.preventDefault(); mainWindow.hide(); } });
  mainWindow.on('closed', () => { mainWindow=null; });
}

// ── Menu ──────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    { label:'SolenTrack', submenu:[
      { label:'About', click:showAbout },
      { type:'separator' },
      { label:'Open Data Folder', click:()=>shell.openPath(DATA_DIR) },
      { label:'Open Backups', click:()=>{ ensureDirs(); shell.openPath(BACKUP_DIR); } },
      { type:'separator' },
      { label:'Backup Now', click:doBackup },
      { label:'Storage Info', click:showStorageInfo },
      { type:'separator' },
      { label:'Quit', accelerator:'CmdOrCtrl+Q', click:()=>{ app.isQuiting=true; app.quit(); } },
    ]},
    { label:'Edit', submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}] },
    { label:'View', submenu:[
      { label:'Reload', accelerator:'CmdOrCtrl+R', click:()=>mainWindow?.webContents.reload() },
      { type:'separator' },
      { role:'resetZoom' },{ role:'zoomIn' },{ role:'zoomOut' },
      { type:'separator' },{ role:'togglefullscreen' },
      ...(isDev?[{type:'separator'},{role:'toggleDevTools'}]:[]),
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function doBackup() {
  try {
    ensureDirs();
    if (!fs.existsSync(DATA_FILE)) { dialog.showMessageBox(mainWindow,{type:'info',message:'No data to backup yet.',buttons:['OK']}); return; }
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const dest = path.join(BACKUP_DIR, `solentrack-manual-${ts}.json`);
    fs.copyFileSync(DATA_FILE, dest);
    dialog.showMessageBox(mainWindow,{type:'info',title:'Backup Created',message:'Backup saved to:\n'+dest,buttons:['OK']});
  } catch(e) { dialog.showMessageBox(mainWindow,{type:'error',message:'Backup failed: '+e.message,buttons:['OK']}); }
}

function showStorageInfo() {
  try {
    const stat  = fs.statSync(DATA_FILE);
    const kb    = (stat.size/1024).toFixed(1);
    const data  = readData()||{};
    const backs = fs.existsSync(BACKUP_DIR)?fs.readdirSync(BACKUP_DIR).filter(f=>f.endsWith('.json')).length:0;
    dialog.showMessageBox(mainWindow,{
      type:'info', title:'Storage Info', message:'SolenTrack Data',
      detail:[
        `File size: ${kb} KB  (no limit — file based)`,``,
        `Time entries:  ${data.entries?.length||0}`,
        `Projects:      ${data.projects?.length||0}`,
        `Invoices:      ${data.invoices?.length||0}`,
        `Sessions:      ${data.sessions?.length||0}`,
        `History events:${data.history?.length||0}`,``,
        `Daily backups kept: ${backs} (max 30)`,``,
        `Location: ${DATA_FILE}`,
        `Backups:  ${BACKUP_DIR}`,
      ].join('\n'),
      buttons:['OK'],
    });
  } catch(e) { dialog.showMessageBox(mainWindow,{type:'info',message:'No data saved yet.',buttons:['OK']}); }
}

function showAbout() {
  dialog.showMessageBox(mainWindow,{
    type:'info',title:'About SolenTrack',message:'SolenTrack v1.0',
    detail:'Professional time tracker & invoice manager\nby SolenVisuals\n\nhello@solenvisuals.com\nwww.solenvisuals.com\n\nData: '+DATA_FILE,
    buttons:['Close'],
  });
}

// ── Tray ──────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname,'assets','tray.png');
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  tray.setToolTip('SolenTrack — Time Manager');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Open SolenTrack', click:showWindow},
    {type:'separator'},
    {label:'Backup Now', click:doBackup},
    {type:'separator'},
    {label:'Quit', click:()=>{ app.isQuiting=true; app.quit(); }},
  ]));
  tray.on('click', toggleWindow);
}

function showWindow()   { if(mainWindow){ mainWindow.show(); mainWindow.focus(); } }
function toggleWindow() { if(mainWindow){ mainWindow.isVisible()?mainWindow.hide():showWindow(); } }

// ── IPC ───────────────────────────────────────────────────────
ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:dataPath', () => DATA_FILE);
ipcMain.handle('store:read',   () => readData());
ipcMain.handle('store:write',  (_, data) => writeData(data));
ipcMain.handle('store:backup', () => { autoBackup(); return true; });
ipcMain.handle('dialog:save',  async (_,opts) => dialog.showSaveDialog(mainWindow,opts));
ipcMain.handle('dialog:open',  async (_,opts) => dialog.showOpenDialog(mainWindow,opts));

// ── Lifecycle ─────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow(); buildMenu(); createTray();
  app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); else showWindow(); });
});
app.on('window-all-closed', () => { if(process.platform!=='darwin') app.quit(); });
app.on('before-quit', () => { app.isQuiting=true; });
