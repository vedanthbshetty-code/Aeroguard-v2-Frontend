import type { LucideIcon } from 'lucide-react'
import { Activity, BarChart3, Bell, CheckCircle2, ChevronDown, CircleHelp, CloudOff, Cpu, Gauge, History, LayoutDashboard, Lightbulb, Menu, RefreshCw, Server, Settings, SlidersHorizontal, Thermometer, WifiOff, Wind, X, Zap, Clock3 } from 'lucide-react'

const icons = { Activity, BarChart3, Bell, CheckCircle2, ChevronDown, CircleHelp, CloudOff, Cpu, Gauge, History, LayoutDashboard, Lightbulb, Menu, RefreshCw, Server, Settings, SlidersHorizontal, Thermometer, WifiOff, Wind, X, Zap, Clock3 }
export type IconName = keyof typeof icons

export const Icon = ({ name, size = 18, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) => {
  const Component = icons[name] as LucideIcon
  return <Component aria-hidden="true" size={size} strokeWidth={strokeWidth} />
}
