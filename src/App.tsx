import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, ChevronRight, CircleAlert, Clock3, ExternalLink, Menu, RefreshCw, Wifi } from 'lucide-react'
import { EmptyState, SectionHeading } from './components/ChartCard'
import { Icon, type IconName } from './components/Icon'
import { MetricPanel } from './components/MetricPanel'
import { StatusPill, type StatusTone } from './components/StatusPill'
import { useDashboardData } from './hooks/useDashboardData'
import { getApiBaseUrl } from './services/apiService'
import type { ReadingRange, SensorField, SensorReading } from './types/api'
import { asList, formatInteger, formatNumber, formatTime, formatTimestamp, isStale, timeAgo } from './utils/format'

type View = 'dashboard' | 'history' | 'insights' | 'device' | 'settings'

type MetricConfig = {
  key: SensorField
  label: string
  shortLabel: string
  unit: string
  color: string
  icon: IconName
  digits: number
}

const metricConfigs: MetricConfig[] = [
  { key: 'mq135RawAdc', label: 'MQ-135 raw ADC', shortLabel: 'Gas sensor', unit: 'ADC', color: '#2d795b', icon: 'Activity', digits: 0 },
  { key: 'temperatureC', label: 'Temperature', shortLabel: 'Temperature', unit: '°C', color: '#c16d3d', icon: 'Thermometer', digits: 1 },
  { key: 'humidityPct', label: 'Relative humidity', shortLabel: 'Humidity', unit: '%', color: '#2b7580', icon: 'Wind', digits: 1 },
  { key: 'pressureHpa', label: 'Atmospheric pressure', shortLabel: 'Pressure', unit: 'hPa', color: '#667085', icon: 'Gauge', digits: 1 },
]

const navItems: { view: View; label: string; icon: IconName; path: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { view: 'history', label: 'Sensor history', icon: 'History', path: '/history' },
  { view: 'insights', label: 'AI insights', icon: 'Lightbulb', path: '/insights' },
  { view: 'device', label: 'Device information', icon: 'Cpu', path: '/device' },
  { view: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
]

const rangeOptions: { value: ReadingRange; label: string }[] = [
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
]

const viewFromPath = (path: string): View => {
  if (path === '/history') return 'history'
  if (path === '/insights') return 'insights'
  if (path === '/device') return 'device'
  if (path === '/settings') return 'settings'
  return 'dashboard'
}

const valueFor = (reading: SensorReading, key: SensorField): number | null => {
  const value = reading[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const trendFor = (readings: SensorReading[], key: SensorField): 'up' | 'down' | 'neutral' => {
  const values = readings.map((reading) => valueFor(reading, key)).filter((value): value is number => value !== null)
  if (values.length < 2) return 'neutral'
  const delta = values[values.length - 1] - values[Math.max(0, values.length - 4)]
  if (Math.abs(delta) < 0.001) return 'neutral'
  return delta > 0 ? 'up' : 'down'
}

const trendLabel = (trend: 'up' | 'down' | 'neutral') => trend === 'up' ? 'Rising recently' : trend === 'down' ? 'Falling recently' : 'No clear trend'

const humanError = (errors: string[]) => errors.length === 1 ? errors[0].replace(/^[^:]+:\s*/, '') : 'Some backend data could not be loaded.'

function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname))
  const [range, setRange] = useState<ReadingRange>('24h')
  const [refreshInterval, setRefreshInterval] = useState(() => Number(window.localStorage.getItem('aeroguard.refreshInterval')) || 0)
  const [compactMode, setCompactMode] = useState(() => window.localStorage.getItem('aeroguard.compactMode') === 'true')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { data, loading, refreshing, errors, refresh } = useDashboardData(range, refreshInterval)

  useEffect(() => {
    const handlePopState = () => setView(viewFromPath(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.compact = compactMode ? 'true' : 'false'
    window.localStorage.setItem('aeroguard.refreshInterval', String(refreshInterval))
    window.localStorage.setItem('aeroguard.compactMode', String(compactMode))
  }, [compactMode, refreshInterval])

  const navigate = (nextView: View) => {
    const nextItem = navItems.find((item) => item.view === nextView)
    if (!nextItem) return
    window.history.pushState({}, '', nextItem.path)
    setView(nextView)
    setMobileNavOpen(false)
  }

  const latestTimestamp = data.latest?.timestamp ?? data.device?.lastReadingAt ?? null
  const backendOnline = data.health?.ok === true
  const sensorAvailable = Boolean(data.latest && metricConfigs.some((metric) => valueFor(data.latest as SensorReading, metric.key) !== null))
  const deviceStale = isStale(data.device?.lastReadingAt ?? data.latest?.timestamp)
  const deviceState =
    data.device?.status === 'online' ? 'Online' :
    data.device?.status === 'stale' ? 'Stale' :
    data.device?.status === 'unknown' ? 'Unknown' :
    data.device?.online === true && !deviceStale ? 'Online' :
    data.device?.online === false ? (deviceStale ? 'Stale' : 'Offline') :
    deviceStale ? 'Stale' : 'Unknown'
  const pageMeta = navItems.find((item) => item.view === view) ?? navItems[0]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><span>AG</span><i /></div>
          <div><div className="brand-name">AeroGuard</div><div className="brand-subtitle">Environmental monitoring</div></div>
        </div>
        <div className="workspace-label">Workspace</div>
        <nav className="main-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button className={`nav-item ${view === item.view ? 'nav-item--active' : ''}`} key={item.view} onClick={() => navigate(item.view)} aria-current={view === item.view ? 'page' : undefined}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>{view === item.view && <ChevronRight size={15} className="nav-item__chevron" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footnote">
          <span className="sidebar-footnote__dot" />
          <div><strong>Frontend ready</strong><span>Awaiting backend data</span></div>
        </div>
      </aside>
      {mobileNavOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar__left"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button><div><span className="breadcrumb">AeroGuard 2.0 <span>/</span></span><strong>{pageMeta.label}</strong></div></div>
          <div className="topbar__right"><StatusPill label="Frontend available" tone="positive" icon="CheckCircle2" /><StatusPill label={backendOnline ? 'Backend connected' : 'Backend unavailable'} tone={backendOnline ? 'positive' : 'warning'} icon={backendOnline ? 'Server' : 'CloudOff'} /><button className="icon-button" onClick={() => refresh()} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17} className={refreshing ? 'spin' : ''} /></button></div>
        </header>
        <div className="page-wrap">
          {errors.length > 0 && <div className="alert-banner" role="status"><CircleAlert size={18} /><div><strong>{getApiBaseUrl() ? 'Backend data is only partially available' : 'Connect the FastAPI backend to see live data'}</strong><span>{humanError(errors)}</span></div><button onClick={() => navigate('settings')}>View setup <ChevronRight size={15} /></button></div>}
          {view === 'dashboard' && <DashboardView data={data} loading={loading} range={range} setRange={setRange} navigate={navigate} latestTimestamp={latestTimestamp} backendOnline={backendOnline} deviceState={deviceState} sensorAvailable={sensorAvailable} />}
          {view === 'history' && <HistoryView readings={data.readings} loading={loading} range={range} setRange={setRange} />}
          {view === 'insights' && <InsightsView insights={data.insights} loading={loading} navigate={navigate} />}
          {view === 'device' && <DeviceView device={data.device} latest={data.latest} loading={loading} deviceState={deviceState} />}
          {view === 'settings' && <SettingsView refreshInterval={refreshInterval} setRefreshInterval={setRefreshInterval} compactMode={compactMode} setCompactMode={setCompactMode} />}
        </div>
      </main>
    </div>
  )
}

function DashboardView({ data, loading, range, setRange, navigate, latestTimestamp, backendOnline, deviceState, sensorAvailable }: { data: ReturnType<typeof useDashboardData>['data']; loading: boolean; range: ReadingRange; setRange: (range: ReadingRange) => void; navigate: (view: View) => void; latestTimestamp: string | null; backendOnline: boolean; deviceState: string; sensorAvailable: boolean }) {
  return (
    <>
      <div className="page-intro"><div><span className="kicker">Live overview</span><h1>Environmental overview</h1><p>Calm, precise visibility into the air around your device.</p></div><div className="page-intro__meta"><span className="demo-label">LIVE DATA ONLY</span><span>Last updated <strong>{timeAgo(latestTimestamp)}</strong></span></div></div>
      <div className="status-ribbon" aria-label="System status overview"><StatusBlock label="Backend" value={backendOnline ? 'Connected' : 'Unavailable'} tone={backendOnline ? 'positive' : 'warning'} detail={backendOnline ? 'Health endpoint responding' : 'Configure API URL to connect'} icon={backendOnline ? 'Server' : 'CloudOff'} /><StatusBlock label="ESP32 device" value={deviceState} tone={deviceState === 'Online' ? 'positive' : deviceState === 'Stale' ? 'warning' : 'neutral'} detail={deviceState === 'Online' ? 'Status supplied by backend' : 'No device status confirmed'} icon="Cpu" /><StatusBlock label="Sensor data" value={sensorAvailable ? 'Available' : 'No readings'} tone={sensorAvailable ? 'positive' : 'neutral'} detail={sensorAvailable ? 'Latest payload received' : 'Waiting for a reading payload'} icon="Activity" /><StatusBlock label="Last reading" value={latestTimestamp ? timeAgo(latestTimestamp) : 'Not received'} tone={latestTimestamp && !isStale(latestTimestamp) ? 'positive' : 'neutral'} detail={latestTimestamp ? formatTimestamp(latestTimestamp) : 'No timestamp supplied'} icon="Clock3" /></div>
      <SectionHeading eyebrow="Current conditions" title="Sensor overview" body="Supplied values from the latest backend reading. Missing fields stay visible as unavailable." action={<button className="text-button" onClick={() => navigate('device')}>View device details <ChevronRight size={15} /></button>} />
      <div className="metrics-grid">
        <MetricPanel eyebrow="MQ-135" label="Raw gas sensor signal" value={data.latest?.mq135RawAdc} unit="ADC" secondary={data.latest?.mq135Voltage == null ? 'Voltage not supplied' : `${formatNumber(data.latest.mq135Voltage, 2)} V available`} timestamp={data.latest?.timestamp} trend={trendFor(data.readings, 'mq135RawAdc')} icon="Activity" accent="green" />
        <MetricPanel eyebrow="BME280" label="Temperature" value={data.latest?.temperatureC} unit="°C" secondary={trendLabel(trendFor(data.readings, 'temperatureC'))} timestamp={data.latest?.timestamp} trend={trendFor(data.readings, 'temperatureC')} icon="Thermometer" accent="amber" />
        <MetricPanel eyebrow="BME280" label="Relative humidity" value={data.latest?.humidityPct} unit="%" secondary={trendLabel(trendFor(data.readings, 'humidityPct'))} timestamp={data.latest?.timestamp} trend={trendFor(data.readings, 'humidityPct')} icon="Wind" accent="teal" />
        <MetricPanel eyebrow="BME280" label="Atmospheric pressure" value={data.latest?.pressureHpa} unit="hPa" secondary={trendLabel(trendFor(data.readings, 'pressureHpa'))} timestamp={data.latest?.timestamp} trend={trendFor(data.readings, 'pressureHpa')} icon="Gauge" accent="slate" />
      </div>
      <div className="content-grid content-grid--wide"><HistoryChart readings={data.readings} loading={loading} range={range} setRange={setRange} /><InsightsSummary insights={data.insights} loading={loading} navigate={navigate} /></div>
      <div className="device-strip"><div className="device-strip__icon"><Icon name="Cpu" size={20} /></div><div className="device-strip__copy"><span className="eyebrow">Device information</span><strong>{data.device?.deviceId ?? 'Device identifier not supplied'}</strong><span>{data.device?.firmwareVersion ? `Firmware ${data.device.firmwareVersion}` : 'Firmware version not supplied'} · {data.device?.lastReadingAt ? `Last received ${timeAgo(data.device.lastReadingAt)}` : 'No last-reading timestamp'}</span></div><StatusPill label={deviceState} tone={deviceState === 'Online' ? 'positive' : deviceState === 'Stale' ? 'warning' : 'neutral'} icon="Cpu" /><button className="outline-button" onClick={() => navigate('device')}>Open details <ExternalLink size={14} /></button></div>
    </>
  )
}

function StatusBlock({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: StatusTone; icon: IconName }) {
  return <div className="status-block"><div className={`status-block__icon status-block__icon--${tone}`}><Icon name={icon} size={17} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}

function HistoryChart({ readings, loading, range, setRange }: { readings: SensorReading[]; loading: boolean; range: ReadingRange; setRange: (range: ReadingRange) => void }) {
  const [metricKey, setMetricKey] = useState<SensorField>('temperatureC')
  const metric = metricConfigs.find((candidate) => candidate.key === metricKey) ?? metricConfigs[0]
  const chartData = useMemo(() => readings.map((reading) => ({ timestamp: reading.timestamp, label: formatTime(reading.timestamp), value: valueFor(reading, metric.key) })).filter((point): point is { timestamp: string; label: string; value: number } => point.value !== null), [metric.key, readings])
  return <section className="chart-card"><SectionHeading eyebrow="Historical monitoring" title="Readings over time" body="Select a signal and time window to request supported history from the backend." action={<div className="range-control" role="group" aria-label="History time range">{rangeOptions.map((option) => <button key={option.value} className={range === option.value ? 'range-button range-button--active' : 'range-button'} onClick={() => setRange(option.value)}>{option.label}</button>)}</div>} /><div className="chart-toolbar"><div className="metric-tabs" role="tablist" aria-label="Chart metric">{metricConfigs.map((candidate) => <button role="tab" aria-selected={metric.key === candidate.key} key={candidate.key} className={metric.key === candidate.key ? 'metric-tab metric-tab--active' : 'metric-tab'} onClick={() => setMetricKey(candidate.key)}><span className="metric-tab__dot" style={{ backgroundColor: candidate.color }} />{candidate.shortLabel}</button>)}</div><span className="chart-unit">{metric.label} · {metric.unit}</span></div>{loading ? <div className="chart-placeholder"><span className="skeleton skeleton--chart" /></div> : chartData.length === 0 ? <EmptyState title="No readings in this window" body="The backend has not supplied historical values for this sensor yet. No sample readings are generated in the frontend." /> : <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metric.color} stopOpacity={0.2} /><stop offset="100%" stopColor={metric.color} stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e9e4" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#78817c', fontSize: 11 }} minTickGap={32} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#78817c', fontSize: 11 }} width={45} /><Tooltip content={<ChartTooltip unit={metric.unit} color={metric.color} />} /><Area type="monotone" dataKey="value" stroke={metric.color} fill="url(#chartFill)" strokeWidth={2} dot={false} connectNulls={false} /></AreaChart></ResponsiveContainer></div>}</section>
}

function ChartTooltip({ active, payload, label, unit, color }: { active?: boolean; payload?: { value?: number }[]; label?: string; unit: string; color: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span>{label}</span><strong style={{ color }}>{formatNumber(payload[0].value, unit === 'ADC' ? 0 : 1)} <small>{unit}</small></strong></div>
}

function InsightsSummary({ insights, loading, navigate }: { insights: ReturnType<typeof useDashboardData>['data']['insights']; loading: boolean; navigate: (view: View) => void }) {
  const aiList = insights ? asList(insights.insights) : []
  const obsList = insights ? asList(insights.observations) : []
  const preview = aiList.length > 0 ? aiList : obsList
  const aiAvailable = insights?.aiAvailable === true
  return <section className="insight-card"><div className="insight-card__top"><div className="insight-card__icon"><Icon name="Lightbulb" size={18} /></div><span className="eyebrow">Environmental insights</span><button className="icon-button icon-button--quiet" onClick={() => navigate('insights')} aria-label="Open AI insights"><ChevronRight size={17} /></button></div>{loading ? <div className="insight-loading"><span className="skeleton skeleton--line" /><span className="skeleton skeleton--line skeleton--short" /></div> : insights?.summary ? <><h3>{insights.summary}</h3>{preview.length > 0 && <ul>{preview.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>}<span className="insight-card__timestamp">Analysis {formatTimestamp(insights.analyzedAt, 'timestamp not supplied')}</span></> : obsList.length > 0 ? <><h3>{aiAvailable ? 'Statistical observations available' : 'AI analysis unavailable'}</h3><ul>{obsList.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul><span className="insight-card__timestamp">Analysis {formatTimestamp(insights?.analyzedAt, 'timestamp not supplied')}</span></> : <EmptyState icon="Lightbulb" title="Insights are not available" body={aiAvailable ? 'The backend has not returned analysis yet.' : 'AI analysis is disabled on the backend; statistical observations will appear when readings exist.'} action={<button className="text-button" onClick={() => navigate('insights')}>Open insights view <ChevronRight size={15} /></button>} />}</section>
}

function HistoryView({ readings, loading, range, setRange }: { readings: SensorReading[]; loading: boolean; range: ReadingRange; setRange: (range: ReadingRange) => void }) {
  return <><div className="page-intro"><div><span className="kicker">Historical monitoring</span><h1>Sensor history</h1><p>Backend-supplied readings only. Select a signal and time window to inspect the record.</p></div><div className="page-intro__meta"><span className="data-contract">GET /api/readings</span></div></div><div className="history-view-grid"><HistoryChart readings={readings} loading={loading} range={range} setRange={setRange} /><section className="history-table-card"><SectionHeading eyebrow="Latest records" title="Reading timestamps" body="Values with missing fields are left blank rather than inferred." />{readings.length === 0 ? <EmptyState title="No records returned" body="This table will populate when the backend returns a reading history payload." /> : <div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>MQ-135 ADC</th><th>Temp</th><th>Humidity</th><th>Pressure</th></tr></thead><tbody>{readings.slice(-8).reverse().map((reading) => <tr key={reading.timestamp}><td>{formatTimestamp(reading.timestamp)}</td><td>{formatInteger(reading.mq135RawAdc)}</td><td>{formatNumber(reading.temperatureC)} °C</td><td>{formatNumber(reading.humidityPct)} %</td><td>{formatNumber(reading.pressureHpa)} hPa</td></tr>)}</tbody></table></div>}</section></div></>
}

function InsightsView({ insights, loading, navigate }: { insights: ReturnType<typeof useDashboardData>['data']['insights']; loading: boolean; navigate: (view: View) => void }) {
  const obsList = insights ? asList(insights.observations) : []
  const aiList = insights ? asList(insights.insights) : []
  const aiUsed = insights?.aiUsed === true
  const aiAvailable = insights?.aiAvailable === true
  if (loading) {
    return <div className="insights-loading"><span className="skeleton skeleton--hero" /><span className="skeleton skeleton--line" /></div>
  }
  if (!insights) {
    return <section className="empty-panel"><EmptyState icon="Lightbulb" title="No analysis has been supplied" body="Connect the backend insight endpoint to show observations and optional AI analysis." action={<button className="outline-button" onClick={() => navigate('settings')}>Review backend setup <ChevronRight size={15} /></button>} /></section>
  }
  return <><section className="insight-hero"><div className="insight-hero__icon"><Icon name="Lightbulb" size={22} /></div><div><span className="eyebrow">Latest analysis</span><h2>{insights.summary ?? (aiAvailable ? 'Statistical observations (AI analysis unavailable)' : 'Statistical observations only')}</h2><p>Analysis timestamp: {formatTimestamp(insights.analyzedAt)}{insights.readingsAnalyzed ? ` · ${insights.readingsAnalyzed} readings analyzed` : ''}</p></div></section><div className="insight-detail-grid"><section className="detail-card" key="observed"><div className="detail-card__heading"><Icon name="BarChart3" size={17} /><h3>Observed trends</h3></div>{obsList.length > 0 ? <ul>{obsList.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No observations supplied.</p>}</section><section className="detail-card" key="ai"><div className="detail-card__heading"><Icon name="Lightbulb" size={17} /><h3>AI insights</h3></div>{aiList.length > 0 ? <ul>{aiList.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">{aiAvailable ? (aiUsed ? 'No AI insights returned.' : 'AI analysis was unavailable or returned no result.') : 'AI analysis is disabled on the backend.'}</p>}</section><section className="detail-card" key="disclaimer"><div className="detail-card__heading"><Icon name="CircleHelp" size={17} /><h3>Disclaimer</h3></div><p className="muted">{insights.disclaimer ?? 'Observations are based on stored sensor readings only.'}</p></section></div></>
}

function DeviceView({ device, latest, loading, deviceState }: { device: ReturnType<typeof useDashboardData>['data']['device']; latest: SensorReading | null; loading: boolean; deviceState: string }) {
  const rows = [['Device identifier', device?.deviceId], ['Device status', deviceState], ['Last reading received', device?.lastReadingAt ?? latest?.timestamp], ['Firmware version', device?.firmwareVersion]]
  return <><div className="page-intro"><div><span className="kicker">Hardware context</span><h1>Device information</h1><p>Identity and status supplied by the device-status endpoint. Unknown values stay unknown.</p></div><div className="page-intro__meta"><span className="data-contract">GET /api/device-status</span></div></div><section className="device-detail-card"><div className="device-detail-card__header"><div className="device-detail-card__mark"><Icon name="Cpu" size={25} /></div><div><span className="eyebrow">ESP32 development board</span><h2>{device?.deviceId ?? 'Identifier not supplied'}</h2><p>MQ-135 + BME280 sensor assembly</p></div><StatusPill label={deviceState} tone={deviceState === 'Online' ? 'positive' : deviceState === 'Stale' ? 'warning' : 'neutral'} icon="Cpu" /></div>{loading ? <div className="rows-loading"><span className="skeleton skeleton--line" /><span className="skeleton skeleton--line" /><span className="skeleton skeleton--line" /></div> : <div className="info-rows">{rows.map(([label, value]) => <div className="info-row" key={label}><span>{label}</span><strong>{value ? label === 'Last reading received' ? formatTimestamp(value) : value : 'Not supplied by backend'}</strong></div>)}</div>}</section><section className="note-panel"><Icon name="CircleHelp" size={18} /><div><strong>Sensor labeling note</strong><p>MQ-135 values are shown as raw ADC readings. AeroGuard does not convert them to ppm or official AQI, and does not claim that this sensor alone measures PM2.5 or PM10.</p></div></section></>
}

function SettingsView({ refreshInterval, setRefreshInterval, compactMode, setCompactMode }: { refreshInterval: number; setRefreshInterval: (value: number) => void; compactMode: boolean; setCompactMode: (value: boolean) => void }) {
  const apiUrl = getApiBaseUrl()
  return <><div className="page-intro"><div><span className="kicker">Frontend preferences</span><h1>Settings</h1><p>Local display controls only. Backend settings and secrets stay outside this frontend.</p></div><div className="page-intro__meta"><span className="data-contract">LOCAL ONLY</span></div></div><div className="settings-grid"><section className="settings-card"><SectionHeading eyebrow="Connection" title="Backend URL" body="The URL is read from the browser-safe VITE_API_BASE_URL environment variable." /><div className="config-value"><span className={`config-dot ${apiUrl ? 'config-dot--ready' : ''}`} /><code>{apiUrl || 'Not configured'}</code></div><p className="settings-help">For local development, the separately supplied backend commonly runs at <code>http://127.0.0.1:8000</code>. Update your <code>.env</code> file and restart Vite; the frontend does not store credentials or API keys.</p></section><section className="settings-card"><SectionHeading eyebrow="Refresh" title="Data refresh interval" body="Automatic refresh uses the same GET endpoints and can be disabled." /><label className="field-label" htmlFor="refreshInterval">Refresh cadence</label><select id="refreshInterval" value={refreshInterval} onChange={(event) => setRefreshInterval(Number(event.target.value))}><option value={0}>Manual refresh only</option><option value={30000}>Every 30 seconds</option><option value={60000}>Every minute</option><option value={300000}>Every 5 minutes</option></select></section><section className="settings-card"><SectionHeading eyebrow="Display" title="Reading density" body="A small preference stored in this browser only." /><label className="toggle-row"><span><strong>Compact panels</strong><small>Reduce vertical spacing across measurement panels.</small></span><input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} /><span className="toggle-ui" /></label></section></div><section className="settings-footer-note"><CheckCircle2 size={18} /><span>API contract ready: <code>/api/health</code>, <code>/api/latest</code>, <code>/api/readings</code>, <code>/api/device-status</code>, and <code>/api/insights</code>.</span></section></>
}

export default App
