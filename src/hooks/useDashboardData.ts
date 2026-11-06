import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../services/apiService'
import type { DeviceStatus, HealthStatus, Insights, ReadingRange, SensorReading } from '../types/api'

export interface DashboardData {
  health: HealthStatus | null
  latest: SensorReading | null
  readings: SensorReading[]
  device: DeviceStatus | null
  insights: Insights | null
}

const initialData: DashboardData = { health: null, latest: null, readings: [], device: null, insights: null }

export const useDashboardData = (range: ReadingRange, refreshInterval: number) => {
  const [data, setData] = useState<DashboardData>(initialData)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const requestId = useRef(0)

  const load = useCallback(async (isRefresh = false) => {
    const currentRequest = ++requestId.current
    isRefresh ? setRefreshing(true) : setLoading(true)
    setErrors([])

    const results = await Promise.allSettled([
      api.getHealth(),
      api.getLatest(),
      api.getReadings(range),
      api.getDeviceStatus(),
      api.getInsights(),
    ])

    if (currentRequest !== requestId.current) return
    const next = { ...data }
    const nextErrors: string[] = []
    const labels = ['Backend health', 'Latest reading', 'Reading history', 'Device status', 'Environmental insights']
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const message = result.reason instanceof ApiError ? result.reason.message : 'Unexpected backend response.'
        nextErrors.push(`${labels[index]}: ${message}`)
        return
      }
      if (index === 0) next.health = result.value as HealthStatus
      if (index === 1) next.latest = result.value as SensorReading | null
      if (index === 2) next.readings = result.value as SensorReading[]
      if (index === 3) next.device = result.value as DeviceStatus
      if (index === 4) next.insights = result.value as Insights | null
    })
    setData(next)
    setErrors([...new Set(nextErrors)])
    setLoading(false)
    setRefreshing(false)
  }, [data, range])

  useEffect(() => { void load() }, [range])
  useEffect(() => {
    if (!refreshInterval) return
    const timer = window.setInterval(() => { void load(true) }, refreshInterval)
    return () => window.clearInterval(timer)
  }, [load, refreshInterval])

  return { data, loading, refreshing, errors, refresh: () => load(true) }
}
