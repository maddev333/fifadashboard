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
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Staffing Dashboard</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {['summary', 'byEmployee', 'byVenue'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 6,
              border: '1px solid #334155',
              background: view === v ? '#0ea5e9' : '#1e293b',
              color: '#e2e8f0',
              cursor: 'pointer'
            }}
          >
            {v.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </button>
        ))}
      </div>

      {view === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Assignments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>{staffing.length}</div>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Open Shifts</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{open.length}</div>
          </div>
        </div>
      )}

      {view === 'byVenue' && (
        <table style={{ width: '100%', color: '#e2e8f0', borderCollapse: 'collapse', background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#0f172a', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8' }}>
              <th style={{ padding: '0.75rem' }}>Venue</th>
              <th>Assigned</th>
              <th>Open</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {byVenue.map(v => (
              <tr key={v.id} style={{ borderTop: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem' }}>{v.name}</td>
                <td>{v.assigned}</td>
                <td style={{ color: v.open > 0 ? '#ef4444' : '#22c55e' }}>{v.open}</td>
                <td>{v.assigned + v.open > 0 ? Math.round((v.assigned / (v.assigned + v.open)) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'byEmployee' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {staffing.map(s => (
            <div key={s.id} style={{ background: '#1e293b', borderRadius: 8, padding: '0.75rem', border: '1px solid #334155' }}>
              <div style={{ fontWeight: 600 }}>{s.employeeName}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.role} • {s.shift}</div>
              <div style={{ fontSize: '0.8rem', color: s.status === 'open' ? '#ef4444' : '#22c55e' }}>{s.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
