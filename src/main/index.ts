import { app, BrowserWindow, shell, screen } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { startSnmpMonitoring, stopSnmpMonitoring } from './snmp'
import { clearAllAlarmTimers } from './alarm'
import { initLogger } from './logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    title: '김포공항 제1레이더 UPS 감시 프로그램',
    icon: app.isPackaged
      ? join(process.resourcesPath, 'assets', 'icon.ico')
      : join(__dirname, '../../resources/icon.ico'),
    x: 0,
    y: 0,
    width: Math.floor(screenWidth / 2),
    height: screenHeight,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer: dev server URL in development, bundled HTML in production
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else if (!app.isPackaged && process.env['VITE_DEV_SERVER_URL']) {
    mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    initLogger()

    createWindow()

    if (mainWindow) {
      registerIpcHandlers(mainWindow)
      startSnmpMonitoring(mainWindow)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    stopSnmpMonitoring()
    clearAllAlarmTimers()
    app.quit()
  })
}
