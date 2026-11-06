import type { ReactNode } from 'react'
import { Icon } from './Icon'

export const EmptyState = ({ icon = 'Activity', title, body, action }: { icon?: 'Activity' | 'CloudOff' | 'Lightbulb' | 'Gauge'; title: string; body: string; action?: ReactNode }) => (
  <div className="empty-state">
    <span className="empty-state__icon"><Icon name={icon} size={22} /></span>
    <div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  </div>
)

export const SectionHeading = ({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: ReactNode }) => (
  <div className="section-heading">
    <div>
      {eyebrow && <span className="section-heading__eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
    {action && <div className="section-heading__action">{action}</div>}
  </div>
)
