/**
 * preload.js
 * Secure context bridge — exposes a safe API to the renderer (index.html)
 * without enabling full Node.js access.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('solenApp', {
  // App info
  getVersion:  () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),

  // Native save dialog (for CSV / JSON exports)
  showSaveDialog: (opts) => ipcRenderer.invoke('dialog:save', opts),

  // Native open dialog (for JSON import)
  showOpenDialog: (opts) => ipcRenderer.invoke('dialog:open', opts),
});
