import { useMemo } from 'react'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

const TAB_CONFIG = [
  { key: 'feed', label: 'Feed' },
  { key: 'matches', label: 'Matches' },
  { key: 'staffing', label: 'Staffing' },
  { key: 'venue', label: 'Venue' },
]

function colorForSeverity(sev) {
  if (sev === 'critical') return '#7f1d1d'
  if (sev === 'high') return '#7c2d12'
  if (sev === 'medium') return '#713f12'
  return '#1e293b'
}

function normalizeFeedItem(item, defaults = {}) {
  return {
    ...defaults,
    ...item,
    source: item.source || defaults.source || 'Operations',
    severity: item.severity || defaults.severity || 'low',
    timestamp: item.timestamp || defaults.timestamp || new Date().toISOString()
  }
}

function useIntelligenceFeed(alerts, incidents, weatherSignals) {
  return useMemo(() => {
    const alertItems = alerts.map(a => normalizeFeedItem({ ...a, kind: 'alert', source: a.scope || 'Ops' }))
    const incidentItems = incidents.map(i => normalizeFeedItem({ ...i, kind: 'incident', source: i.source || 'Field' }))
    const weatherItems = weatherSignals.map(w => normalizeFeedItem({ ...w, kind: 'weather', source: w.isLive ? 'Live Weather' : 'Weather Fallback' }, { severity: 'low' }))
    return [...alertItems, ...incidentItems, ...weatherItems].sort((a, b) => {
      const d = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
      if (d !== 0) return d
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  }, [alerts, incidents, weatherSignals])
}

export default function DetailDrawer({ tab, onTabChange, venues, incidents, matches, staffing, alerts, weatherSignals, selectedVenueId }) {
  const feed = useIntelligenceFeed(alerts, incidents, weatherSignals)
  const selectedVenue = venues.find(v => v.id === selectedVenueId) || null
  const selectedMatches = matches.filter(m => m.venueId === selectedVenueId)
  const selectedIncidents = incidents.filter(i => i.venueId === selectedVenueId)

  const open = staffing.filter(s => s.status === 'open')
  const byVenue = useMemo(() => venues.map(v => ({
    ...v,
    assigned: staffing.filter(s => s.venueId === v.id && s.status === 'assigned').length,
    open: staffing.filter(s => s.venueId === v.id && s.status === 'open').length
  })), [venues, staffing])

  const isOpen = !!tab

  return (
    <div style={{
      position: 'absolute',
      top: 56,
      bottom: 16,
      right: isOpen ? 16 : undefined,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      alignItems: 'flex-end'
    }}>
      {/* Tab pills */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        alignItems: 'flex-end'
      }}>
        {TAB_CONFIG.map(t => {
          const active = tab === t.key
          const disabled = t.key === 'venue' && !selectedVenue
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(active ? null : t.key)}
              disabled={disabled}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 6,
                border: '1px solid #334155',
                background: active ? '#0ea5e9' : 'rgba(15, 23, 42, 0.92)',
                backdropFilter: active ? 'none' : 'blur(6px)',
                color: disabled ? '#475569' : active ? '#fff' : '#e2e8f0',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Drawer content */}
      {isOpen && (
        <div style={{
          width: 320,
          maxHeight: 'calc(100vh - 140px)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #334155',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '0.6rem 0.75rem',
            borderBottom: '1px solid #334155',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#94a3b8',
            letterSpacing: '0.04em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {TAB_CONFIG.find(t => t.key === tab)?.label}
            <button
              onClick={() => onTabChange(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0.5rem 0.75rem', flex: 1 }}>
            {tab === 'feed' && (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {feed.slice(0, 50).map(item => (
                  <div key={`${item.kind}-${item.id}`} style={{
                    background: colorForSeverity(item.severity),
                    borderRadius: 6,
                    padding: '0.5rem 0.6rem',
                    border: '1px solid #334155',
                    color: '#e2e8f0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>
                        {item.kind} • {item.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: 3 }}>{item.message || item.description}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                      {new Date(item.timestamp).toLocaleString()} • {item.source}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'matches' && (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {matches.map(m => {
                  const v = venues.find(venue => venue.id === m.venueId)
                  return (
                    <div key={m.id} style={{ background: '#1e293b', borderRadius: 6, padding: '0.5rem 0.6rem', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.date} • {m.stage}{m.group ? ` • Group ${m.group}` : ''}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{m.homeTeam} vs {m.awayTeam}</div>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{m.timeLocal} @ {v?.name || m.venueId}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'staffing' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1, background: '#1e293b', borderRadius: 6, padding: '0.5rem', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>{staffing.length}</div>
                  </div>
                  <div style={{ flex: 1, background: '#1e293b', borderRadius: 6, padding: '0.5rem', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Open</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{open.length}</div>
                  </div>
                </div>
                <table style={{ width: '100%', color: '#e2e8f0', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.35rem 0' }}>Venue</th>
                      <th>Assigned</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byVenue.map(v => (
                      <tr key={v.id} style={{ borderTop: '1px solid #334155' }}>
                        <td style={{ padding: '0.35rem 0' }}>{v.name}</td>
                        <td>{v.assigned}</td>
                        <td style={{ color: v.open > 0 ? '#ef4444' : '#22c55e' }}>{v.open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'venue' && selectedVenue && (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedVenue.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{selectedVenue.city}, {selectedVenue.state}, {selectedVenue.country}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Capacity: {selectedVenue.capacity?.toLocaleString?.() || selectedVenue.capacity}</div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: selectedVenue.status === 'ready' ? '#14532d' : '#713f12',
                      color: selectedVenue.status === 'ready' ? '#86efac' : '#fcd34d'
                    }}>
                      {selectedVenue.status}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 8 }}>Risk: {selectedVenue.riskLevel}</span>
                  </div>
                </div>

                {selectedMatches.length > 0 && (
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Scheduled Matches</div>
                    {selectedMatches.map(m => (
                      <div key={m.id} style={{ fontSize: '0.85rem', color: '#e2e8f0', padding: '0.25rem 0' }}>
                        {m.date} {m.timeLocal}: <strong>{m.homeTeam}</strong> vs <strong>{m.awayTeam}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {selectedIncidents.length > 0 && (
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Open Incidents</div>
                    {selectedIncidents.map(i => (
                      <div key={i.id} style={{ fontSize: '0.8rem', color: '#e2e8f0', padding: '0.25rem 0' }}>
                        <span style={{ color: i.severity === 'high' ? '#ef4444' : '#f59e0b' }}>●</span> {i.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
