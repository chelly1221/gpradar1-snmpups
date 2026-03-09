import { LogMessage } from '../shared/types'
import logger from './logger'

// --- State ---

const previousThresholds: Record<string, Record<string, 'low' | 'high' | 'normal' | undefined>> = {
  '1': {},
  '2': {},
}

const previousStatus: Record<string, Record<string, string>> = {
  '1': {},
  '2': {},
}

// --- Functions ---

export function isValidNumber(value: string): number | null {
  const parsed = parseFloat(value)
  if (isNaN(parsed)) {
    return null
  }
  return parsed
}

export function checkThresholds(params: {
  label: string
  keyPrefix: string
  value: number | null
  timestamp: string
  settings: Record<string, any>
  upsId: 1 | 2
}): LogMessage | null {
  const { label, keyPrefix, value, timestamp, settings, upsId } = params

  if (value === null) {
    return null
  }

  const min: number | undefined = settings[keyPrefix + '_min']
  const max: number | undefined = settings[keyPrefix + '_max']
  const upsKey = String(upsId)
  const prev = previousThresholds[upsKey][label]

  if (min !== undefined && value < min) {
    if (prev !== 'low') {
      const message = `${timestamp} - ⚠️ ${label} 낮음 (${value} < ${min})`
      logger.warn(message)
      previousThresholds[upsKey][label] = 'low'
      return { upsId, message, timestamp }
    }
  } else if (max !== undefined && value > max) {
    if (prev !== 'high') {
      const message = `${timestamp} - ⚠️ ${label} 높음 (${value} > ${max})`
      logger.warn(message)
      previousThresholds[upsKey][label] = 'high'
      return { upsId, message, timestamp }
    }
  } else {
    if (prev === 'low' || prev === 'high') {
      const message = `${timestamp} - ✅ ${label} 정상: ${value}`
      logger.info(message)
      previousThresholds[upsKey][label] = 'normal'
      return { upsId, message, timestamp }
    }
  }

  return null
}

export function checkStatusChanges(params: {
  snmpData: Record<string, string>
  upsId: 1 | 2
  timestamp: string
}): LogMessage[] {
  const { snmpData, upsId, timestamp } = params
  const upsKey = String(upsId)
  const results: LogMessage[] = []

  for (const key of ['출력 상태', '배터리 상태']) {
    const current = snmpData[key] ?? 'No Data'
    const prev = previousStatus[upsKey][key]

    if (current !== prev) {
      const symbol = current === '정상' || current === '온라인' ? '✅' : '⚠️'
      const message = `${timestamp} - ${symbol} ${key}: ${current}`

      if (symbol === '✅') {
        logger.info(message)
      } else {
        logger.warn(message)
      }

      previousStatus[upsKey][key] = current
      results.push({ upsId, message, timestamp })
    }
  }

  return results
}

export function getThresholdStates(
  upsId: 1 | 2
): Record<string, 'low' | 'high' | 'normal' | undefined> {
  return previousThresholds[String(upsId)]
}

export function resetStates(): void {
  previousThresholds['1'] = {}
  previousThresholds['2'] = {}
  previousStatus['1'] = {}
  previousStatus['2'] = {}
}
