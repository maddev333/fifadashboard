export default function KpiOverlay({ stats = [] }) {
  return (
    <div style={{
      position: 'absolute',
      top: 56,
      left: 16,
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
      zIndex: 10,
      pointerEvents: 'none',
      maxWidth: 'calc(100% - 32px)'
    }}>
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
            minWidth: 100,
            flex: '0 1 auto'
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {s.label}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}
