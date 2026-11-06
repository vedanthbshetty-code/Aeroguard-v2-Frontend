import { Icon, type IconName } from './Icon'

export type StatusTone = 'positive' | 'warning' | 'neutral' | 'negative'

export const StatusPill = ({ label, tone = 'neutral', icon = 'Activity' }: { label: string; tone?: StatusTone; icon?: IconName }) => (
  <span className={`status-pill status-pill--${tone}`}>
    <Icon name={icon} size={14} />
    <span>{label}</span>
  </span>
)
