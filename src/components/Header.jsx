import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/map', label: 'Live Map' },
  { to: '/matches', label: 'Match Ops' },
  { to: '/feed', label: 'Intelligence Feed' },
  { to: '/admin', label: 'Admin' },
]

export default function Header() {
  const { pathname } = useLocation()

  return (
    <header style={{
      background: '#0f172a',
      color: 'white',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid #1e293b'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>⚽ World Cup Ops</div>
        <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                color: pathname === l.to ? '#38bdf8' : '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: pathname === l.to ? 600 : 400
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
