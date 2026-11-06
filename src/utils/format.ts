export const formatNumber = (value: number | null | undefined, digits = 1): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

export const formatInteger = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export const formatTimestamp = (value: string | null | undefined, fallback = 'No timestamp supplied'): string => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export const formatTime = (value: string): string => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export const timeAgo = (value: string | null | undefined): string => {
  if (!value) return 'No reading yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp'
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return `${hours} hr ago`
}

export const isStale = (value: string | null | undefined): boolean => {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() > 15 * 60_000
}

export const asList = (value: string[] | string | null | undefined): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}
