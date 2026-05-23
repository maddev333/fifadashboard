import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import LiveMap from './pages/LiveMap'
import MatchOps from './pages/MatchOps'
import IntelligenceFeed from './pages/IntelligenceFeed'
import Staffing from './pages/Staffing'
import Admin from './pages/Admin'

function App() {
  return (
    <div>
      <Header />
      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/matches" element={<MatchOps />} />
          <Route path="/feed" element={<IntelligenceFeed />} />
          <Route path="/staffing" element={<Staffing />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
