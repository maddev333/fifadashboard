import { useState } from 'react'
import { useData } from '../hooks/useData'

export default function MatchOps() {
  const { data: matches } = useData('matches')
  const { data: venues } = useData('venues')
  const [filter, setFilter] = useState('')

  const filtered = matches.filter(m =>
    m.homeTeam.toLowerCase().includes(filter.toLowerCase()) ||
    m.awayTeam.toLowerCase().includes(filter.toLowerCase()) ||
    m.venueId.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Match Operations</h1>
      <input
        placeholder="Search matches..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 6,
          border: '1px solid #334155',
          background: '#1e293b',
          color: '#e2e8f0',
          marginBottom: '1rem',
          width: '100%',
          maxWidth: 400
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filtered.map(m => {
          const venue = venues.find(v => v.id === m.venueId)
          return (
            <div key={m.id} style={{
              background: '#1e293b',
              borderRadius: 8,
              padding: '1rem',
              border: '1px solid #334155'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>{m.date} • {m.stage}{m.group ? ` • Group ${m.group}` : ''}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                {m.homeTeam} vs {m.awayTeam}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{m.timeLocal} local @ {venue?.name || m.venueId}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 8 }}>Broadcaster: {m.broadcaster}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
