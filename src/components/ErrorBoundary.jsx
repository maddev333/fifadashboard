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
        <div className="card" style={{
          color: 'var(--color-text)',
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--color-red-400)' }}>Map Unavailable</h2>
          <p style={{ color: 'var(--color-slate-300)' }}>
            The interactive map could not be loaded. This usually happens when WebGL is disabled
            in your browser (e.g., hardware acceleration is turned off, or you're in a sandboxed environment).
          </p>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Error: {this.state.error?.message || 'Unknown map error'}
          </p>
          {this.props.fallback || null}
        </div>
      )
    }
    return this.props.children
  }
}
