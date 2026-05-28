import { useState } from 'react'
import { useData } from '../hooks/useData'

export default function Staffing() {
  const { data: staffing } = useData('staffing')
  const { data: venues } = useData('venues')
  const [view, setView] = useState('summary')

  const open = staffing.filter(s => s.status === 'open')
  const byVenue = venues.map(v => ({
    ...v,
    assigned: staffing.filter(s => s.venueId === v.id && s.status === 'assigned').length,
    open: staffing.filter(s => s.venueId === v.id && s.status === 'open').length
  }))

  return (
    <div className="page-container">
      <h1 className="page-title">Staffing Dashboard</h1>

      <div className="flex-gap" style={{ marginBottom: '1rem' }}>
        {['summary', 'byEmployee', 'byVenue'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={view === v ? 'btn btn-primary' : 'btn'}
            type="button"
          >
            {v.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </button>
        ))}
      </div>

      {view === 'summary' && (
        <div className="flex-gap">
          <div className="kpi-card" style={{ minWidth: 200 }}>
            <div className="kpi-label">Total Assignments</div>
            <div className="kpi-value" style={{ '--kpi-color': 'var(--color-accent)' }}>{staffing.length}</div>
          </div>
          <div className="kpi-card" style={{ minWidth: 200 }}>
            <div className="kpi-label">Open Shifts</div>
            <div className="kpi-value" style={{ '--kpi-color': 'var(--color-danger)' }}>{open.length}</div>
          </div>
        </div>
      )}

      {view === 'byVenue' && (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Assigned</th>
                <th>Open</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {byVenue.map(v => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{v.assigned}</td>
                  <td style={{ color: v.open > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{v.open}</td>
                  <td>{v.assigned + v.open > 0 ? Math.round((v.assigned / (v.assigned + v.open)) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'byEmployee' && (
        <div className="grid-auto">
          {staffing.map(s => (
            <div key={s.id} className="card" style={{ padding: '0.75rem' }}>
              <div style={{ fontWeight: 600 }}>{s.employeeName}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{s.role} • {s.shift}</div>
              <div style={{ fontSize: '0.8rem', color: s.status === 'open' ? 'var(--color-danger)' : 'var(--color-success)' }}>{s.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
