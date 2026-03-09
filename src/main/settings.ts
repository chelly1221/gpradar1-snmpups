import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { UpsSettings, Ups2Settings } from '../shared/types'
import { DEFAULT_UPS1_SETTINGS, DEFAULT_UPS2_SETTINGS } from '../shared/constants'
import logger from './logger'

const SETTINGS_FILENAME = 'settings.json'
const UPS2_SETTINGS_FILENAME = 'ups2_settings.json'
const KEEPALIVE_SETTINGS_FILENAME = 'keepalive_settings.json'

const DEFAULT_KEEPALIVE_SETTINGS = {
  keepalive_enabled: false,
  keepalive_ip: '192.168.1.200',
  keepalive_port: 9100,
}

/**
 * Returns the directory where settings files are stored.
 * In production (packaged): directory containing the executable.
 * In development: current working directory.
 */
export function getSettingsDir(): string {
  if (app.isPackaged) {
    return path.dirname(process.execPath)
  }
  return process.cwd()
}

/**
 * Load a JSON file from the settings directory.
 * If the file does not exist, create it with the provided defaults.
 * Any keys present in defaults but missing from the loaded file are merged in.
 */
export function loadJsonWithDefaults<T extends object>(filename: string, defaults: T): T {
  const filepath = path.join(getSettingsDir(), filename)

  let loaded: Partial<T> = {}

  if (fs.existsSync(filepath)) {
    try {
      const raw = fs.readFileSync(filepath, 'utf-8')
      loaded = JSON.parse(raw) as Partial<T>
    } catch (err) {
      logger.error(`Failed to parse ${filename}: ${err}`)
      loaded = {}
    }
  } else {
    logger.info(`${filename} not found, creating with defaults.`)
    saveJsonToFile(filename, defaults)
    return { ...defaults }
  }

  // Merge any missing keys from defaults
  const merged = { ...defaults, ...loaded } as T

  // Check if any keys were missing and re-save if so
  const hadMissingKeys = (Object.keys(defaults) as Array<keyof T>).some(
    (key) => !(key in loaded)
  )
  if (hadMissingKeys) {
    saveJsonToFile(filename, merged)
  }

  return merged
}

/**
 * Save an object as formatted JSON (indent 4, UTF-8) to the settings directory.
 */
export function saveJsonToFile(filename: string, data: object): void {
  const filepath = path.join(getSettingsDir(), filename)
  const tmpPath = filepath + '.tmp'
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 4), 'utf-8')
    fs.renameSync(tmpPath, filepath)
  } catch (err) {
    logger.error(`Failed to save ${filename}: ${err}`)
    try { fs.unlinkSync(tmpPath) } catch { /* ignore cleanup error */ }
  }
}

/**
 * Load UPS #1 settings from settings.json, falling back to defaults.
 */
export function getUps1Settings(): UpsSettings {
  return loadJsonWithDefaults<UpsSettings>(SETTINGS_FILENAME, DEFAULT_UPS1_SETTINGS)
}

/**
 * Load UPS #2 settings from ups2_settings.json, falling back to defaults.
 */
export function getUps2Settings(): Ups2Settings {
  return loadJsonWithDefaults<Ups2Settings>(UPS2_SETTINGS_FILENAME, DEFAULT_UPS2_SETTINGS)
}

/**
 * Save UPS #1 settings to settings.json.
 */
export function saveUps1Settings(settings: UpsSettings): void {
  saveJsonToFile(SETTINGS_FILENAME, settings)
}

/**
 * Save UPS #2 settings to ups2_settings.json.
 */
export function saveUps2Settings(settings: Ups2Settings): void {
  saveJsonToFile(UPS2_SETTINGS_FILENAME, settings)
}

/**
 * Load keepalive settings from keepalive_settings.json, falling back to defaults.
 */
export function getKeepAliveSettings(): {
  keepalive_enabled: boolean
  keepalive_ip: string
  keepalive_port: number
} {
  return loadJsonWithDefaults(KEEPALIVE_SETTINGS_FILENAME, DEFAULT_KEEPALIVE_SETTINGS)
}
