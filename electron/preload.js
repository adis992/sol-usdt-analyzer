const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  isElectron: true
})
