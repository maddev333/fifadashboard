import { useState, useEffect } from 'react'
import { useAlerts, readCustomAlerts } from '../hooks/useAlerts'

const STORAGE_KEY = 'custom_alerts'

export default function Admin() {
  const { alerts } = useAlerts()
  const [isAdmin, setIsAdmin] = useState(false)
  const [storedAlerts, setStoredAlerts] = useState([])
  const [form, setForm] = useState({ title: '', message: '', severity: 'medium', scope: 'venue', venueId: '' })

  useEffect(() => {
    setStoredAlerts(readCustomAlerts())
  }, [])

  const handleAdd = (e) => {
    e.preventDefault()
    const newAlert = {
      id: `alt-custom-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...form
    }
    const updated = [newAlert, ...storedAlerts]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setStoredAlerts(updated)
    setForm({ title: '', message: '', severity: 'medium', scope: 'venue', venueId: '' })
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
        <h2>Admin Mode</h2>
        <p style={{ color: '#94a3b8' }}>On GitHub Pages there is no backend auth. This is a client-only demo toggle.</p>
        <button
          onClick={() => setIsAdmin(true)}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#0ea5e9',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Enable Edit Mode
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Admin / Edit Mode</h1>
        <button onClick={() => setIsAdmin(false)} style={{ padding: '0.3rem 0.6rem', cursor: 'pointer' }}>Exit Admin</button>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Post New Alert</h3>
        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '0.75rem' }}>
          <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
          <textarea placeholder="Message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minHeight: 60 }} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} style={{ padding: '0.5rem', borderRadius: 4, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input placeholder="Venue ID (optional)" value={form.venueId} onChange={e => setForm(f => ({ ...f, venueId: e.target.value }))} style={{ flex: 1, padding: '0.5rem', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
          </div>
          <button type="submit" style={{ padding: '0.5rem', borderRadius: 4, border: 'none', background: '#22c55e', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Add Alert
          </button>
        </form>
      </div>

      <h3>Custom Alerts ({storedAlerts.length})</h3>
      {storedAlerts.map(a => (
        <div key={a.id} style={{ background: '#1e293b', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #334155' }}>
          <strong style={{ color: a.severity === 'critical' ? '#ef4444' : '#e2e8f0' }}>{a.title}</strong>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{a.message}</div>
        </div>
      ))}

      <div style={{ marginTop: '1.5rem' }}>
        <h3>All Alerts in Current Session View ({alerts.length})</h3>
        {alerts.slice(0, 8).map(a => (
          <div key={a.id} style={{ background: '#1e293b', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #334155' }}>
            <strong style={{ color: a.severity === 'critical' ? '#ef4444' : '#e2e8f0' }}>{a.title}</strong>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{a.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
