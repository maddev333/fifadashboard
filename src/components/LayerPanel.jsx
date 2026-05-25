const LAYERS = [
  { key: 'venues', label: 'Venues', color: '#0ea5e9' },
  { key: 'incidents', label: 'Incidents', color: '#ef4444' },
  { key: 'traffic', label: 'Live Traffic', color: '#22c55e' },
  { key: 'weatherRadar', label: 'Weather Radar', color: '#a855f7' },
  { key: 'weatherMarkers', label: 'Weather Markers', color: '#f59e0b' },
]

export default function LayerPanel({ layers, onChange, weatherMode, weatherStatus }) {
  return (
    <div style={{
      position: 'absolute',
      top: 56,
      right: 16,
      zIndex: 10,
      width: 200,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(6px)',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '0.75rem',
      color: '#e2e8f0'
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
        Layers
      </div>
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
        marginTop: '0.6rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid #334155',
        fontSize: '0.7rem',
        color: weatherMode === 'fallback' ? '#fbbf24' : weatherMode === 'live' ? '#4ade80' : '#94a3b8'
      }}>
        {weatherStatus}
      </div>
    </div>
  )
}
