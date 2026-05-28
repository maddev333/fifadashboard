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
    <div className="page-container">
      <h1 className="page-title">Match Operations</h1>
      <input
        placeholder="Search matches..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="input"
        type="search"
        style={{ marginBottom: '1rem', width: '100%', maxWidth: 400 }}
      />
      <div className="grid-auto">
        {filtered.map(m => {
          const venue = venues.find(v => v.id === m.venueId)
          return (
            <div key={m.id} className="match-card">
              <div className="match-card-header">{m.date} • {m.stage}{m.group ? ` • Group ${m.group}` : ''}</div>
              <div className="match-card-title">{m.homeTeam} vs {m.awayTeam}</div>
              <div className="match-card-body">{m.timeLocal} local @ {venue?.name || m.venueId}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>Broadcaster: {m.broadcaster}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
