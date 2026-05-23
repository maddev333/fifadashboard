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
    if (sev === 'critical') return '#7f1d1d'
    if (sev === 'high') return '#7c2d12'
    if (sev === 'medium') return '#713f12'
    return '#1e293b'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Intelligence Feed</h1>
      <div style={{
        background: weatherMode === 'fallback' ? '#7c2d12' : '#0f766e',
        color: weatherMode === 'fallback' ? '#fed7aa' : '#ccfbf1',
        padding: '0.75rem 1rem',
        borderRadius: 6,
        marginBottom: '1rem',
        fontWeight: 600
      }}>
        {hasAzureMapsKey
          ? (weatherMode === 'fallback'
            ? 'Live weather is unavailable right now, so the feed is showing fallback venue weather signals.'
            : 'Intelligence Feed includes live Azure Maps venue weather signals refreshed every 10 minutes.')
          : 'Azure Maps key is missing, so the feed is showing fallback venue weather signals.'}
      </div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          style={{ padding: '0.4rem', borderRadius: 6, background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}
        >
          <option value="all">All Sources</option>
          <option value="Ops">Operations</option>
          <option value="Field">Field</option>
          <option value="Traffic">Traffic</option>
          <option value="Security">Security</option>
          <option value="Live Weather">Live Weather</option>
          <option value="Weather Fallback">Weather Fallback</option>
        </select>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{filtered.length} signals shown</span>
      </div>
      {filtered.map(item => (
        <div key={`${item.kind}-${item.id}`} style={{
          background: color(item.severity),
          borderRadius: 8,
          padding: '0.75rem 1rem',
          marginBottom: '0.75rem',
          border: '1px solid #334155',
          color: '#e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <strong>{item.title}</strong>
            <span style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: 4
            }}>{item.kind} • {item.severity}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: 4 }}>{item.message || item.description}</div>
          {item.condition && (
            <div style={{ fontSize: '0.8rem', color: '#bae6fd', marginTop: 6 }}>
              Condition: {item.condition} • Temp: {item.temperatureF}°F • Wind: {item.windMph} mph
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
            {new Date(item.timestamp).toLocaleString()} • Source: {item.source}
          </div>
        </div>
      ))}
    </div>
  )
}
