import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { UpsSettings, Ups2Settings } from '../shared/types'
import { getUps1Settings, getUps2Settings, saveUps1Settings, saveUps2Settings } from './settings'
import { setMuteState } from './alarm'
import logger from './logger'
import process from 'node:process'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_UPS1, (): Promise<UpsSettings> => {
    return Promise.resolve(getUps1Settings())
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_UPS2, (): Promise<Ups2Settings> => {
    return Promise.resolve(getUps2Settings())
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE_UPS1, (_event, settings: UpsSettings) => {
    try {
      saveUps1Settings(settings)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Failed to save UPS1 settings: ${msg}`)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE_UPS2, (_event, settings: Ups2Settings) => {
    try {
      saveUps2Settings(settings)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Failed to save UPS2 settings: ${msg}`)
      return { success: false, error: msg }
    }
  })

  ipcMain.on(IPC_CHANNELS.ALARM_MUTE, (_event, { upsId, muted }: { upsId: 1 | 2; muted: boolean }) => {
    setMuteState(upsId, muted)
  })

  ipcMain.on(IPC_CHANNELS.LOG_CLEAR, (_event, { upsId }: { upsId: 1 | 2 }) => {
    // No action in main; renderer handles UI clear
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_FILE, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'WAV Files', extensions: ['wav'] }]
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.GET_MEMORY_USAGE, (): number => {
    return process.memoryUsage().rss / (1024 * 1024)
  })

  logger.info('IPC handlers registered')
}
