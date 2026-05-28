export default function KpiOverlay({ stats = [] }) {
  return (
    <aside aria-label="Key metrics"
      className="panel-glass pointer-none"
      style={{
        position: 'absolute',
        top: 56,
        left: 16,
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        zIndex: 10,
        maxWidth: 'calc(100% - 32px)',
        padding: '0.5rem'
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="pointer-auto"
          style={{
            padding: '0.5rem 0.75rem',
            minWidth: 100,
            flex: '0 1 auto'
          }}
        >
          <div className="kpi-label">
            {s.label}
          </div>
          <div className="kpi-value" style={{ '--kpi-color': s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </aside>
  )
}
