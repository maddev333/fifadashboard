import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { useAlerts } from '../hooks/useAlerts'

function KpiCard({ title, value, color = 'var(--color-accent)' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{title}</div>
      <div className="kpi-value" style={{ '--kpi-color': color }}>{value}</div>
    </div>
  )
}

function AlertBanner({ alerts }) {
  const critical = alerts.filter(a => a.severity === 'critical')
  if (critical.length === 0) return null
  return (
    <div className="alert-critical">
      🚨 {critical.length} Critical Alert{critical.length > 1 ? 's' : ''}: {critical.map(a => a.title).join(' • ')}
    </div>
  )
}

export default function Dashboard() {
  const { data: venues } = useData('venues')
  const { data: matches } = useData('matches')
  const { data: incidents } = useData('incidents')
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
  const weatherWarnings = alerts.filter(a => a.severity === 'critical').length
  const getVenueLink = (venueId) => ({
    pathname: '/map',
    search: `?venue=${encodeURIComponent(venueId)}`,
  })

  return (
    <div className="page-container">
      <h1 className="page-title">Operations Dashboard</h1>
      <p className="text-muted" style={{ marginTop: 0, marginBottom: '1rem' }}>
        {selectedDate ? `Default operating date: ${selectedDate}` : 'No match schedule loaded.'}
      </p>

      <AlertBanner alerts={alerts} />

      <div className="flex-gap" style={{ marginBottom: '1.5rem' }}>
        <KpiCard title="Matches On Selected Date" value={todayMatches.length} color="var(--color-accent)" />
        <KpiCard title="Active Venues" value={activeVenues} color="var(--color-success)" />
        <KpiCard title="Open Incidents" value={openIncidents} color="var(--color-danger)" />
        <KpiCard title="Critical Alerts" value={weatherWarnings} color="var(--color-warning)" />
      </div>

      <div className="grid-2" style={{ gap: '1rem' }}>
        <div className="card">
          <h3 className="uppercase-label" style={{ marginTop: 0 }}>Schedule Snapshot</h3>
          {todayMatches.length === 0 && <p>No matches scheduled.</p>}
          {todayMatches.map(m => (
            <div key={m.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
              <strong>{m.homeTeam}</strong> vs <strong>{m.awayTeam}</strong>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                {m.timeLocal} @{' '}
                <Link
                  to={getVenueLink(m.venueId)}
                  style={{ fontWeight: 600 }}
                >
                  {venues.find(v => v.id === m.venueId)?.name || m.venueId}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="uppercase-label" style={{ marginTop: 0 }}>Latest Alerts</h3>
          {alerts.slice(0, 5).map(a => (
            <div key={a.id} style={{
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--color-border)',
              color: a.severity === 'critical' ? 'var(--color-pink-300)' : 'var(--color-text)'
            }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: a.severity === 'critical' ? 'var(--color-danger)' : a.severity === 'high' ? 'var(--color-warning)' : 'var(--color-success)',
                marginRight: 8
              }} />
              {a.title}
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{a.message}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 className="uppercase-label" style={{ marginTop: 0 }}>Venue Readiness</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Venue</th>
              <th>City</th>
              <th>Status</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {venues.map(v => (
              <tr key={v.id}>
                <td>
                  <Link
                    to={getVenueLink(v.id)}
                    style={{ fontWeight: 600 }}
                  >
                    {v.name}
                  </Link>
                </td>
                <td>{v.city}</td>
                <td style={{ color: v.status === 'ready' ? 'var(--color-success)' : 'var(--color-warning)', textTransform: 'capitalize' }}>{v.status}</td>
                <td style={{ textTransform: 'capitalize' }}>{v.riskLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
