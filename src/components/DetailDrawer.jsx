import { useMemo, useRef, useEffect, useState } from 'react'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

const TAB_CONFIG = [
  { key: 'feed', label: 'Feed' },
  { key: 'matches', label: 'Matches' },
  { key: 'venue', label: 'Venue' },
]

function colorForSeverity(sev) {
  if (sev === 'critical') return 'var(--surface-critical)'
  if (sev === 'high') return 'var(--surface-warning)'
  if (sev === 'medium') return 'var(--surface-caution)'
  return 'var(--surface-card)'
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

function CameraFeedPanel({ cameraFeed }) {
  const videoRef = useRef(null)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    if (!cameraFeed?.streamUrl || !videoRef.current) return
    setVideoError(false)

    const video = videoRef.current
    let hls = null
    let cancelled = false

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cameraFeed.streamUrl
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) return
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: true })
          hls.loadSource(cameraFeed.streamUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setVideoError(true)
              hls.destroy()
            }
          })
        } else {
          setVideoError(true)
        }
      }).catch(() => {
        if (!cancelled) setVideoError(true)
      })
    }

    return () => {
      cancelled = true
      if (hls) hls.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [cameraFeed?.streamUrl])

  if (!cameraFeed) return null

  return (
    <div className="divider" style={{ paddingTop: '0.5rem' }}>
      <div className="uppercase-label" style={{ fontSize: '0.7rem', marginBottom: 6 }}>Camera Feed</div>
      <div className="video-container">
        <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>{cameraFeed.title}</div>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
            {cameraFeed.location} • {cameraFeed.provider}
          </div>
        </div>
        <div style={{ padding: '0.75rem' }}>
          {videoError ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
              Camera feed unavailable. The stream may be offline or unsupported on this browser.
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              playsInline
              preload="none"
              className="video-player"
              aria-label={`Live camera feed: ${cameraFeed.title}`}
            />
          )}
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 8 }}>{cameraFeed.notes}</div>
          <a
            href={cameraFeed.streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 8, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600 }}
          >
            Open stream directly →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function DetailDrawer({ tab, onTabChange, venues, incidents, matches, alerts, weatherSignals, selectedVenueId }) {
  const feed = useIntelligenceFeed(alerts, incidents, weatherSignals)
  const selectedVenue = venues.find(v => v.id === selectedVenueId) || null
  const selectedMatches = matches.filter(m => m.venueId === selectedVenueId)
  const selectedIncidents = incidents.filter(i => i.venueId === selectedVenueId)

  const isOpen = !!tab

  return (
    <aside aria-label="Detail drawer" style={{
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
      <nav aria-label="Drawer tabs" style={{
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
              className={active ? 'btn btn-primary' : 'btn'}
              style={{
                padding: '0.4rem 0.8rem',
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
                minHeight: 36,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1
              }}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {isOpen && (
        <div className="panel-glass" style={{
          width: 320,
          maxHeight: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div className="uppercase-label" style={{
            padding: '0.6rem 0.75rem',
            borderBottom: '1px solid var(--color-border)',
            letterSpacing: '0.04em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {TAB_CONFIG.find(t => t.key === tab)?.label}
            <button
              onClick={() => onTabChange(null)}
              className="btn"
              aria-label="Close drawer"
              style={{ minHeight: 28, padding: '0.2rem 0.4rem', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0.5rem 0.75rem', flex: 1 }}>
            {tab === 'feed' && (
              <div className="feed-list">
                {feed.slice(0, 50).map(item => (
                  <div key={`${item.kind}-${item.id}`} className="feed-item" style={{
                    background: colorForSeverity(item.severity)
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{item.title}</strong>
                      <span className="tag">{item.kind} • {item.severity}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-300)', marginTop: 3 }}>{item.message || item.description}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                      {new Date(item.timestamp).toLocaleString()} • {item.source}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'matches' && (
              <div className="feed-list">
                {matches.map(m => {
                  const v = venues.find(venue => venue.id === m.venueId)
                  return (
                    <div key={m.id} className="card" style={{ padding: '0.5rem 0.6rem' }}>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{m.date} • {m.stage}{m.group ? ` • Group ${m.group}` : ''}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>{m.homeTeam} vs {m.awayTeam}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-300)' }}>{m.timeLocal} @ {v?.name || m.venueId}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'venue' && selectedVenue && (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedVenue.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{selectedVenue.city}, {selectedVenue.state}, {selectedVenue.country}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Capacity: {selectedVenue.capacity?.toLocaleString?.() || selectedVenue.capacity}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={selectedVenue.status === 'ready' ? 'badge badge-success' : 'badge badge-caution'}>
                      {selectedVenue.status}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.7rem', marginLeft: 8 }}>Risk: {selectedVenue.riskLevel}</span>
                  </div>
                </div>

                {selectedVenue.hasCameraFeed && (
                  <CameraFeedPanel cameraFeed={selectedVenue.cameraFeed} />
                )}

                {selectedMatches.length > 0 && (
                  <div className="divider" style={{ paddingTop: '0.5rem' }}>
                    <div className="uppercase-label" style={{ fontSize: '0.7rem', marginBottom: 4 }}>Scheduled Matches</div>
                    {selectedMatches.map(m => (
                      <div key={m.id} style={{ fontSize: '0.85rem', color: 'var(--color-text)', padding: '0.25rem 0' }}>
                        {m.date} {m.timeLocal}: <strong>{m.homeTeam}</strong> vs <strong>{m.awayTeam}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {selectedIncidents.length > 0 && (
                  <div className="divider" style={{ paddingTop: '0.5rem' }}>
                    <div className="uppercase-label" style={{ fontSize: '0.7rem', marginBottom: 4 }}>Open Incidents</div>
                    {selectedIncidents.map(i => (
                      <div key={i.id} style={{ fontSize: '0.8rem', color: 'var(--color-text)', padding: '0.25rem 0' }}>
                        <span style={{ color: i.severity === 'high' ? 'var(--color-danger)' : 'var(--color-warning)' }}>●</span> {i.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
