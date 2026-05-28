import { Routes, Route } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { MapErrorBoundary } from './components/ErrorBoundary'
import MapPage from './pages/MapPage'
import Admin from './pages/Admin'

function AdminLayout() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-bg)', color: 'var(--color-text)' }}>
      <nav aria-label="Admin breadcrumb" style={{
        background: 'var(--surface-bg)',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link to="/" style={{ textDecoration: 'none', fontWeight: 600 }}>← Back to Map</Link>
        <div style={{ fontWeight: 700 }}>Admin</div>
      </nav>
      <main style={{ padding: '1rem' }}>
        <Admin />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <MapErrorBoundary>
          <MapPage />
        </MapErrorBoundary>
      } />
      <Route path="/admin" element={<AdminLayout />} />
    </Routes>
  )
}

export default App
