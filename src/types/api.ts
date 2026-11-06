export type SensorField = 'mq135RawAdc' | 'mq135Voltage' | 'temperatureC' | 'humidityPct' | 'pressureHpa'

export interface SensorReading {
  timestamp: string
  mq135RawAdc?: number | null
  mq135Voltage?: number | null
  temperatureC?: number | null
  humidityPct?: number | null
  pressureHpa?: number | null
  deviceId?: string | null
}

export interface HealthStatus {
  ok: boolean
  status?: string | null
  message?: string | null
  service?: string | null
  version?: string | null
  environment?: string | null
  timestamp?: string | null
}

export interface DeviceStatus {
  deviceId?: string | null
  status?: string | null
  online?: boolean | null
  lastReadingAt?: string | null
  firmwareVersion?: string | null
  thresholdSeconds?: number | null
  checkedAt?: string | null
}

export interface Insights {
  status?: string | null
  aiUsed?: boolean | null
  aiAvailable?: boolean | null
  summary?: string | null
  insights?: string[] | string | null
  observations?: string[] | string | null
  statistics?: unknown
  readingsAnalyzed?: number | null
  analyzedAt?: string | null
  disclaimer?: string | null
}

export type ReadingRange = '1h' | '6h' | '24h' | '7d'

export interface ApiErrorShape {
  message: string
  status?: number
  code?: string
}
