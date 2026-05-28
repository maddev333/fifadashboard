import { useMemo, useState } from 'react'
import { useAlerts } from '../hooks/useAlerts'
import { useData } from '../hooks/useData'
import { useVenueWeather } from '../hooks/useVenueWeather'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

function normalizeFeedItem(item, defaults = {}) {
  return {
    ...defaults,
    ...item,
    source: item.source || defaults.source || 'Operations',
    severity: item.severity || defaults.severity || 'low',
    timestamp: item.timestamp || defaults.timestamp || new Date().toISOString()
  }
}

export default function IntelligenceFeed() {
  const { data: venues } = useData('venues')
  const { data: incidents } = useData('incidents')
  const { alerts } = useAlerts()
  const { weatherSignals, weatherMode, hasAzureMapsKey } = useVenueWeather(venues)
  const [sourceFilter, setSourceFilter] = useState('all')

  const feed = useMemo(() => {
    const alertItems = alerts.map(a => normalizeFeedItem({
      ...a,
      kind: 'alert',
      source: a.scope || 'Ops'
    }))

    const incidentItems = incidents.map(i => normalizeFeedItem({
      ...i,
      kind: 'incident',
      source: i.source || 'Field'
    }))

    const weatherItems = weatherSignals.map(signal => normalizeFeedItem({
      ...signal,
      kind: 'weather',
      source: signal.isLive ? 'Live Weather' : 'Weather Fallback'
    }, {
      severity: 'low'
    }))

    return [...alertItems, ...incidentItems, ...weatherItems].sort((a, b) => {
      const severityDelta = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
      if (severityDelta !== 0) return severityDelta
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  }, [alerts, incidents, weatherSignals])

  const filtered = sourceFilter === 'all'
    ? feed
    : feed.filter(f => f.source?.toLowerCase().includes(sourceFilter.toLowerCase()))

  const color = (sev) => {
    if (sev === 'critical') return 'var(--surface-critical)'
    if (sev === 'high') return 'var(--surface-warning)'
    if (sev === 'medium') return 'var(--surface-caution)'
    return 'var(--surface-card)'
  }

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <h1 className="page-title">Intelligence Feed</h1>
      <div className={weatherMode === 'fallback' ? 'alert-warning' : 'alert-info'} style={{
        background: weatherMode === 'fallback' ? 'var(--surface-warning)' : 'var(--color-teal-500)',
        color: weatherMode === 'fallback' ? 'var(--color-orange-400)' : 'var(--color-slate-900)'
      }}>
        {hasAzureMapsKey
          ? (weatherMode === 'fallback'
            ? 'Live weather is unavailable right now, so the feed is showing fallback venue weather signals.'
            : 'Intelligence Feed includes live Azure Maps venue weather signals refreshed every 10 minutes.')
          : 'Azure Maps key is missing, so the feed is showing fallback venue weather signals.'}
      </div>
      <div className="flex-gap" style={{ marginBottom: '1rem', alignItems: 'center' }}>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="select"
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="all">All Sources</option>
          <option value="Ops">Operations</option>
          <option value="Field">Field</option>
          <option value="Traffic">Traffic</option>
          <option value="Security">Security</option>
          <option value="Live Weather">Live Weather</option>
          <option value="Weather Fallback">Weather Fallback</option>
        </select>
        <span className="text-muted" style={{ fontSize: '0.9rem' }}>{filtered.length} signals shown</span>
      </div>
      <div className="feed-list">
        {filtered.map(item => (
          <div key={`${item.kind}-${item.id}`} className="feed-item" style={{
            background: color(item.severity)
          }}>
            <div className="flex-between" style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <strong>{item.title}</strong>
              <span className="tag">{item.kind} • {item.severity}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-300)', marginTop: 4 }}>{item.message || item.description}</div>
            {item.condition && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-blue-300)', marginTop: 6 }}>
                Condition: {item.condition} • Temp: {item.temperatureF}°F • Wind: {item.windMph} mph
              </div>
            )}
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
              {new Date(item.timestamp).toLocaleString()} • Source: {item.source}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
