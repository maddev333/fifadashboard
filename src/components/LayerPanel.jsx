const LAYERS = [
  { key: 'venues', label: 'Venues', color: '#0ea5e9' },
  { key: 'incidents', label: 'Incidents', color: '#ef4444' },
  { key: 'traffic', label: 'Live Traffic', color: '#22c55e' },
  { key: 'weatherRadar', label: 'Weather Radar', color: '#a855f7' },
  { key: 'weatherMarkers', label: 'Weather Markers', color: '#f59e0b' },
]

import { useState } from 'react'

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
}) {
  const [isOpen, onToggle] = useOpenState(true)

  return (
    <details
      open={isOpen}
      onToggle={onToggle}
      style={{
        position: 'absolute',
        top: 56,
        right: 16,
        zIndex: 10,
        width: 240,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #334155',
        borderRadius: 8,
        color: '#e2e8f0',
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
        color: '#94a3b8',
        letterSpacing: '0.04em',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>Layers & Refresh</span>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Toggle</span>
      </summary>

      <div style={{ padding: '0 0.75rem 0.75rem' }}>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          {LAYERS.map(l => (
            <label
              key={l.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '0.25rem 0',
                color: layers[l.key] ? '#e2e8f0' : '#64748b'
              }}
            >
              <input
                type="checkbox"
                checked={!!layers[l.key]}
                onChange={() => onChange(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
              />
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: l.color,
                opacity: layers[l.key] ? 1 : 0.3
              }} />
              {l.label}
            </label>
          ))}
        </div>

        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #334155',
          display: 'grid',
          gap: '0.5rem'
        }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <span>Refresh interval</span>
            <select
              value={refreshSeconds}
              onChange={(event) => onRefreshSecondsChange(Number(event.target.value))}
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '0.45rem 0.5rem',
                fontSize: '0.82rem'
              }}
            >
              {refreshOptions.map(seconds => (
                <option key={seconds} value={seconds}>{seconds} seconds</option>
              ))}
            </select>
          </label>

          <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.15rem' }}>Current ET time</div>
            <div style={{ fontWeight: 600 }}>{currentTimeLabel}</div>
          </div>
        </div>

        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #334155',
          fontSize: '0.7rem',
          color: weatherMode === 'fallback' ? '#fbbf24' : weatherMode === 'live' ? '#4ade80' : '#94a3b8'
        }}>
          {weatherStatus}
        </div>
      </div>
    </details>
  )
}
