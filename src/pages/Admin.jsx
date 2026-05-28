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
      <div className="page-container" style={{ maxWidth: 400, marginTop: '2rem', textAlign: 'center' }}>
        <h2>Admin Mode</h2>
        <p className="text-muted">On GitHub Pages there is no backend auth. This is a client-only demo toggle.</p>
        <button
          onClick={() => setIsAdmin(true)}
          className="btn btn-primary"
          type="button"
        >
          Enable Edit Mode
        </button>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h1>Admin / Edit Mode</h1>
        <button onClick={() => setIsAdmin(false)} className="btn" type="button">Exit Admin</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Post New Alert</h3>
        <form onSubmit={handleAdd}>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">New Alert Details</legend>
            <div className="form-group">
              <label htmlFor="alert-title" className="form-label">Title</label>
              <input
                id="alert-title"
                name="title"
                type="text"
                placeholder="e.g., Gate B Delay"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="input"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="alert-message" className="form-label">Message</label>
              <textarea
                id="alert-message"
                name="message"
                placeholder="Describe the alert..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                className="textarea"
                autoComplete="off"
              />
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label htmlFor="alert-severity" className="form-label">Severity</label>
                <select
                  id="alert-severity"
                  name="severity"
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="select"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label htmlFor="alert-venue" className="form-label">Venue ID <span className="text-muted">(optional)</span></label>
                <input
                  id="alert-venue"
                  name="venueId"
                  type="text"
                  placeholder="e.g., new-york-new-jersey-stadium"
                  value={form.venueId}
                  onChange={e => setForm(f => ({ ...f, venueId: e.target.value }))}
                  className="input"
                  autoComplete="off"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">
              Add Alert
            </button>
          </fieldset>
        </form>
      </div>

      <h3>Custom Alerts ({storedAlerts.length})</h3>
      {storedAlerts.map(a => (
        <div key={a.id} className="card" style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: a.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-text)' }}>{a.title}</strong>
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>{a.message}</div>
        </div>
      ))}

      <div style={{ marginTop: '1.5rem' }}>
        <h3>All Alerts in Current Session View ({alerts.length})</h3>
        {alerts.slice(0, 8).map(a => (
          <div key={a.id} className="card" style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: a.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-text)' }}>{a.title}</strong>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{a.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
