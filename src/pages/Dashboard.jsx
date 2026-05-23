import { useMemo } from 'react'
import { useData } from '../hooks/useData'
import { useAlerts } from '../hooks/useAlerts'

function KpiCard({ title, value, color = '#0ea5e9' }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 8,
      padding: '1rem',
      minWidth: 140,
      flex: '1 1 140px',
      border: '1px solid #334155'
    }}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function AlertBanner({ alerts }) {
  const critical = alerts.filter(a => a.severity === 'critical')
  if (critical.length === 0) return null
  return (
    <div style={{
      background: '#7f1d1d',
      color: '#fecaca',
      padding: '0.75rem 1rem',
      borderRadius: 6,
      marginBottom: '1rem',
      fontWeight: 600
    }}>
      🚨 {critical.length} Critical Alert{critical.length > 1 ? 's' : ''}: {critical.map(a => a.title).join(' • ')}
    </div>
  )
}

export default function Dashboard() {
  const { data: venues } = useData('venues')
  const { data: matches } = useData('matches')
  const { data: incidents } = useData('incidents')
  const { data: staffing } = useData('staffing')
  const { alerts } = useAlerts()

  const selectedDate = useMemo(() => {
    const dates = matches
      .map(match => match.date)
      .filter(Boolean)
      .sort()

    return dates[0] || ''
  }, [matches])

  const todayMatches = selectedDate ? matches.filter(m => m.date === selectedDate) : []
  const activeVenues = [...new Set(todayMatches.map(m => m.venueId))].length
  const openIncidents = incidents.filter(i => i.status === 'open').length
  const openShifts = staffing.filter(s => s.status === 'open').length
  const weatherWarnings = alerts.filter(a => a.severity === 'critical').length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Operations Dashboard</h1>
      <p style={{ marginTop: 0, marginBottom: '1rem', color: '#94a3b8' }}>
        {selectedDate ? `Default operating date: ${selectedDate}` : 'No match schedule loaded.'}
      </p>

      <AlertBanner alerts={alerts} />

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <KpiCard title="Matches On Selected Date" value={todayMatches.length} color="#38bdf8" />
        <KpiCard title="Active Venues" value={activeVenues} color="#22c55e" />
        <KpiCard title="Open Incidents" value={openIncidents} color="#ef4444" />
        <KpiCard title="Critical Alerts" value={weatherWarnings} color="#f59e0b" />
        <KpiCard title="Open Shifts" value={openShifts} color="#a855f7" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase' }}>Schedule Snapshot</h3>
          {todayMatches.length === 0 && <p style={{ color: '#cbd5e1' }}>No matches scheduled.</p>}
          {todayMatches.map(m => (
            <div key={m.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
              <strong>{m.homeTeam}</strong> vs <strong>{m.awayTeam}</strong>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{m.timeLocal} @ {venues.find(v => v.id === m.venueId)?.name || m.venueId}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase' }}>Latest Alerts</h3>
          {alerts.slice(0, 5).map(a => (
            <div key={a.id} style={{
              padding: '0.5rem 0',
              borderBottom: '1px solid #334155',
              color: a.severity === 'critical' ? '#fecaca' : '#e2e8f0'
            }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: a.severity === 'critical' ? '#ef4444' : a.severity === 'high' ? '#f59e0b' : '#22c55e',
                marginRight: 8
              }} />
              {a.title}
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{a.message}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155', marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase' }}>Venue Readiness</h3>
        <table style={{ width: '100%', color: '#e2e8f0', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8' }}>
              <th style={{ padding: '0.5rem 0' }}>Venue</th>
              <th>City</th>
              <th>Status</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {venues.map(v => (
              <tr key={v.id} style={{ borderTop: '1px solid #334155' }}>
                <td style={{ padding: '0.5rem 0' }}>{v.name}</td>
                <td>{v.city}</td>
                <td style={{ color: v.status === 'ready' ? '#22c55e' : '#f59e0b', textTransform: 'capitalize' }}>{v.status}</td>
                <td style={{ textTransform: 'capitalize' }}>{v.riskLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
