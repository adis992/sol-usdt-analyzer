const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SOL/USDT Analyzer',
    backgroundColor: '#0a0a1a',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // required for Binance WebSocket from file://
      allowRunningInsecureContent: true
    },
    frame: true,
    autoHideMenuBar: true,
    show: false
  })

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// System tray
function createTray() {
  try {
    const iconPath = path.join(__dirname, '../public/icon.ico')
    const icon = nativeImage.createFromPath(iconPath)
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
    const contextMenu = Menu.buildFromTemplate([
      { label: 'SOL/USDT Analyzer', enabled: false },
      { type: 'separator' },
      { label: 'Otvori', click: () => mainWindow?.show() },
      { label: 'Minimizuj', click: () => mainWindow?.minimize() },
      { type: 'separator' },
      { label: 'Zatvori', click: () => app.quit() }
    ])
    tray.setToolTip('SOL/USDT Analyzer')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
      }
    })
  } catch (e) {
    console.log('Tray creation skipped:', e.message)
  }
}

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-platform', () => process.platform)
ipcMain.handle('show-notification', (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})
ipcMain.on('minimize-to-tray', () => mainWindow?.hide())
ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Auto-updater (placeholder for future implementation)
app.on('ready', () => {
  // Future: autoUpdater.checkForUpdatesAndNotify()
})
