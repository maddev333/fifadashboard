import { useState } from 'react'
import { useData } from '../hooks/useData'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

export default function IntelligenceFeed() {
  const { data: alerts } = useData('alerts')
  const { data: incidents } = useData('incidents')
  const [sourceFilter, setSourceFilter] = useState('all')

  const feed = [
    ...alerts.map(a => ({ ...a, kind: 'alert', source: a.scope || 'Ops' })),
    ...incidents.map(i => ({ ...i, kind: 'incident', source: i.source || 'Field' }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const filtered = sourceFilter === 'all' ? feed : feed.filter(f => f.source?.toLowerCase().includes(sourceFilter.toLowerCase()))

  const color = (sev) => {
    if (sev === 'critical') return '#7f1d1d'
    if (sev === 'high') return '#7c2d12'
    if (sev === 'medium') return '#713f12'
    return '#1e293b'
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Intelligence Feed</h1>
      <div style={{ marginBottom: '1rem' }}>
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
        </select>
      </div>
      {filtered.map(item => (
        <div key={item.id} style={{
          background: color(item.severity),
          borderRadius: 8,
          padding: '0.75rem 1rem',
          marginBottom: '0.75rem',
          border: '1px solid #334155',
          color: '#e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
            {new Date(item.timestamp).toLocaleString()} • Source: {item.source}
          </div>
        </div>
      ))}
    </div>
  )
}
