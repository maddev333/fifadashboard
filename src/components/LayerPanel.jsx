import { useMemo, useState } from 'react'

/*
 * Layer legend colors: these are map rendering colors that match the
 * Azure Maps bubble layer colors. They are not CSS theme tokens.
 */
const refreshOptions = [5, 10, 15, 30, 60]

function useOpenState(initial = true) {
  const [isOpen, setIsOpen] = useState(initial)
  return [isOpen, (e) => setIsOpen(e.target.open)]
}

export default function LayerPanel({
  layers,
  onChange,
  weatherMode,
  weatherStatus,
  refreshSeconds,
  onRefreshSecondsChange,
  currentTimeLabel,
  mapView = 'venues',
}) {
  const [isOpen, onToggle] = useOpenState(true)

  const visibleLayers = useMemo(() => {
    if (mapView === 'base-camps') {
      return [
        { key: 'baseCamps', label: 'Base Camps', color: '#a855f7' },
        { key: 'traffic', label: 'Live Traffic', color: '#22c55e' },
        { key: 'weatherRadar', label: 'Weather Radar', color: '#a855f7' },
      ]
    }

    return [
      { key: 'venues', label: 'Venues', color: '#0ea5e9' },
      { key: 'incidents', label: 'Incidents', color: '#ef4444' },
      { key: 'traffic', label: 'Live Traffic', color: '#22c55e' },
      { key: 'weatherRadar', label: 'Weather Radar', color: '#a855f7' },
      { key: 'weatherMarkers', label: 'Weather Markers', color: '#f59e0b' },
    ]
  }, [mapView])

  return (
    <details
      open={isOpen}
      onToggle={onToggle}
      className="panel-glass"
      style={{
        position: 'absolute',
        top: 56,
        right: 16,
        zIndex: 10,
        width: 240,
        color: 'var(--color-text)',
        overflow: 'hidden'
      }}
    >
      <summary style={{
        listStyle: 'none',
        cursor: 'pointer',
        padding: '0.75rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.04em',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>Layers & Refresh</span>
        <span className="text-muted" style={{ fontSize: '0.7rem' }}>Toggle</span>
      </summary>

      <div style={{ padding: '0 0.75rem 0.75rem' }}>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          {visibleLayers.map(l => {
            const active = !!layers[l.key]
            return (
              <label
                key={l.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '0.25rem 0',
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)'
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onChange(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
                />
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: l.color,
                  opacity: active ? 1 : 0.3
                }} />
                {l.label}
              </label>
            )
          })}
        </div>

        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--color-border)',
          display: 'grid',
          gap: '0.5rem'
        }}>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Refresh interval</span>
            <select
              value={refreshSeconds}
              onChange={(event) => onRefreshSecondsChange(Number(event.target.value))}
              className="select"
            >
              {refreshOptions.map(seconds => (
                <option key={seconds} value={seconds}>{seconds} seconds</option>
              ))}
            </select>
          </label>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
            <div className="text-muted" style={{ marginBottom: '0.15rem' }}>Current ET time</div>
            <div style={{ fontWeight: 600 }}>{currentTimeLabel}</div>
          </div>
        </div>

        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.7rem',
          color: weatherMode === 'fallback' ? 'var(--color-yellow-400)' : weatherMode === 'live' ? 'var(--color-green-400)' : 'var(--color-text-muted)'
        }}>
          {weatherStatus}
        </div>
      </div>
    </details>
  )
}
