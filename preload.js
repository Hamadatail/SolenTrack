const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('solenApp', {
  // App info
  getVersion:     () => ipcRenderer.invoke('app:version'),
  getPlatform:    () => ipcRenderer.invoke('app:platform'),
  getDataPath:    () => ipcRenderer.invoke('app:dataPath'),

  // File-based storage — unlimited, persistent, auto-backed-up
  readStore:      ()       => ipcRenderer.invoke('store:read'),
  writeStore:     (data)   => ipcRenderer.invoke('store:write', data),
  backupNow:      ()       => ipcRenderer.invoke('store:backup'),

  // Native dialogs
  showSaveDialog: (opts)   => ipcRenderer.invoke('dialog:save', opts),
  showOpenDialog: (opts)   => ipcRenderer.invoke('dialog:open', opts),

  // Are we running inside Electron?
  isElectron: true,
});
