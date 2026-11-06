import type { DeviceStatus, HealthStatus, Insights, ReadingRange, SensorReading } from '../types/api'

const REQUEST_TIMEOUT_MS = 8_000

export class ApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  return configured ? configured.replace(/\/$/, '') : ''
}

const requireBaseUrl = (): string => {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new ApiError('Backend URL is not configured. Set VITE_API_BASE_URL to the FastAPI server URL.')
  }
  return baseUrl
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError('The backend returned an invalid JSON object.')
  }
  return value as Record<string, unknown>
}

const getString = (record: Record<string, unknown>, ...keys: string[]): string | null => {
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key]) return record[key] as string
  }
  return null
}

const getNumber = (record: Record<string, unknown>, ...keys: string[]): number | null => {
  for (const key of keys) {
    if (typeof record[key] === 'number' && Number.isFinite(record[key])) return record[key] as number
  }
  return null
}

const unwrap = (value: unknown): unknown => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    return record.data ?? record.result ?? value
  }
  return value
}

const normalizeReading = (value: unknown): SensorReading => {
  const record = asRecord(value)
  const timestamp = getString(record, 'timestamp', 'recorded_at', 'recordedAt', 'created_at', 'createdAt')
  if (!timestamp) throw new ApiError('A reading is missing its timestamp.')
  return {
    timestamp,
    deviceId: getString(record, 'device_id', 'deviceId'),
    mq135RawAdc: getNumber(record, 'mq135RawAdc', 'mq135_raw_adc', 'mq135_adc', 'raw_adc', 'rawAdc'),
    mq135Voltage: getNumber(record, 'mq135Voltage', 'mq135_voltage', 'adc_voltage', 'adcVoltage', 'voltage'),
    temperatureC: getNumber(record, 'temperatureC', 'temperature_c', 'temperature'),
    humidityPct: getNumber(record, 'humidityPct', 'humidity_pct', 'humidity_percent', 'humidity'),
    pressureHpa: getNumber(record, 'pressureHpa', 'pressure_hpa', 'pressure'),
  }
}

const fetchJson = async (path: string, signal?: AbortSignal): Promise<unknown> => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const response = await fetch(`${requireBaseUrl()}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const raw = await response.text()
    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      throw new ApiError('The backend returned malformed JSON.', response.status)
    }
    if (!response.ok) {
      const message = parsed && typeof parsed === 'object' && 'detail' in parsed
        ? String((parsed as { detail: unknown }).detail)
        : `Backend request failed with HTTP ${response.status}.`
      throw new ApiError(message, response.status)
    }
    return parsed
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The backend request timed out. Check that the server is reachable.')
    }
    throw new ApiError('The backend could not be reached. Check the configured URL and network connection.')
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const record = asRecord(unwrap(await fetchJson('/api/health')))
    const status = getString(record, 'status', 'state')
    return {
      ok: record.ok === true || status === 'ok' || status === 'healthy' || status === 'up',
      status,
      message: getString(record, 'message'),
      service: getString(record, 'service'),
      version: getString(record, 'version'),
      environment: getString(record, 'environment'),
      timestamp: getString(record, 'timestamp'),
    }
  },

  async getLatest(): Promise<SensorReading | null> {
    try {
      const value = unwrap(await fetchJson('/api/latest'))
      if (!value) return null
      return normalizeReading(value)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },

  async getReadings(range: ReadingRange): Promise<SensorReading[]> {
    const now = Date.now()
    const msByRange: Record<ReadingRange, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }
    const start = new Date(now - msByRange[range]).toISOString()
    const end = new Date(now).toISOString()
    const path = `/api/readings?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=1000`
    const value = unwrap(await fetchJson(path))
    const candidates = Array.isArray(value)
      ? value
      : value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).readings)
        ? (value as { readings: unknown[] }).readings
        : []
    return candidates.map(normalizeReading).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  },

  async getDeviceStatus(): Promise<DeviceStatus> {
    const record = asRecord(unwrap(await fetchJson('/api/device-status')))
    const onlineRaw = record.is_online ?? record.online ?? record.isOnline
    return {
      deviceId: getString(record, 'deviceId', 'device_id', 'id'),
      status: getString(record, 'status', 'state'),
      online: typeof onlineRaw === 'boolean' ? onlineRaw : null,
      lastReadingAt: getString(record, 'lastReadingAt', 'last_reading_at', 'last_seen', 'lastSeen'),
      firmwareVersion: getString(record, 'firmwareVersion', 'firmware_version', 'firmware'),
      thresholdSeconds: getNumber(record, 'threshold_seconds', 'thresholdSeconds'),
      checkedAt: getString(record, 'checked_at', 'checkedAt'),
    }
  },

  async getInsights(): Promise<Insights | null> {
    const value = unwrap(await fetchJson('/api/insights'))
    if (!value) return null
    const record = asRecord(value)
    const toList = (v: unknown): string[] | string | null => {
      if (Array.isArray(v)) return v.map((x) => String(x))
      if (typeof v === 'string') return v
      return null
    }
    return {
      status: getString(record, 'status'),
      aiUsed: typeof record.ai_used === 'boolean' ? record.ai_used : (typeof record.aiUsed === 'boolean' ? record.aiUsed : null),
      aiAvailable: typeof record.ai_available === 'boolean' ? record.ai_available : (typeof record.aiAvailable === 'boolean' ? record.aiAvailable : null),
      summary: getString(record, 'summary'),
      insights: toList(record.insights),
      observations: toList(record.observations ?? record.observed_trends ?? record.observedTrends),
      statistics: record.statistics ?? null,
      readingsAnalyzed: getNumber(record, 'readings_analyzed', 'readingsAnalyzed'),
      analyzedAt: getString(record, 'generated_at', 'analyzedAt', 'analyzed_at', 'timestamp'),
      disclaimer: getString(record, 'disclaimer'),
    }
  },
}
