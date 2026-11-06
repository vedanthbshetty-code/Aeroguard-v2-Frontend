import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { IconName } from './Icon'
import { Icon } from './Icon'
import { formatNumber, formatTimestamp } from '../utils/format'

export const MetricPanel = ({
  eyebrow,
  label,
  value,
  unit,
  secondary,
  timestamp,
  trend = 'neutral',
  icon,
  accent = 'green',
}: {
  eyebrow: string
  label: string
  value: number | null | undefined
  unit: string
  secondary?: string
  timestamp?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: IconName
  accent?: 'green' | 'teal' | 'amber' | 'slate'
}) => {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  return (
    <article className={`metric-panel metric-panel--${accent}`}>
      <div className="metric-panel__topline">
        <span className="metric-panel__eyebrow">{eyebrow}</span>
        <span className="metric-panel__icon"><Icon name={icon} size={17} /></span>
      </div>
      <div className="metric-panel__label">{label}</div>
      <div className="metric-panel__value-row">
        <span className="metric-panel__value">{typeof value === 'number' ? formatNumber(value, unit === 'ADC' ? 0 : 1) : '—'}</span>
        <span className="metric-panel__unit">{unit}</span>
      </div>
      <div className="metric-panel__footer">
        <span className={`trend trend--${trend}`}><TrendIcon size={14} /> {secondary ?? 'No recent trend'}</span>
        <span className="metric-panel__timestamp">{formatTimestamp(timestamp, 'No reading')}</span>
      </div>
    </article>
  )
}
