import { Routes, Route } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { MapErrorBoundary } from './components/ErrorBoundary'
import MapPage from './pages/MapPage'
import Admin from './pages/Admin'

function AdminLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <div style={{
        background: '#0f172a',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>← Back to Map</Link>
        <div style={{ fontWeight: 700 }}>Admin</div>
      </div>
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
