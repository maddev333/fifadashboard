import React from 'react'

export class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('MapErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#1e293b',
          borderRadius: 8,
          padding: '1.5rem',
          border: '1px solid #334155',
          color: '#e2e8f0',
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          <h2 style={{ marginTop: 0, color: '#f87171' }}>Map Unavailable</h2>
          <p style={{ color: '#cbd5e1' }}>
            The interactive map could not be loaded. This usually happens when WebGL is disabled
            in your browser (e.g., hardware acceleration is turned off, or you're in a sandboxed environment).
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Error: {this.state.error?.message || 'Unknown map error'}
          </p>
          {this.props.fallback || null}
        </div>
      )
    }
    return this.props.children
  }
}
