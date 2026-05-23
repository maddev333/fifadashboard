import { useEffect, useRef, useState } from 'react'
import * as atlas from 'azure-maps-control'
import { useData } from '../hooks/useData'

const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY

export default function LiveMap() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const venueMarkersRef = useRef([])
  const incidentMarkersRef = useRef([])
  const { data: venues } = useData('venues')
  const { data: incidents } = useData('incidents')
  const [showVenues, setShowVenues] = useState(true)
  const [showIncidents, setShowIncidents] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!AZURE_MAPS_KEY || !mapContainer.current || mapRef.current) return

    const map = new atlas.Map(mapContainer.current, {
      view: 'Auto',
      center: [-100, 35],
      zoom: 3,
      style: 'grayscale_dark',
      authOptions: {
        authType: atlas.AuthenticationType.subscriptionKey,
        subscriptionKey: AZURE_MAPS_KEY
      }
    })

    map.events.add('ready', () => {
      popupRef.current = new atlas.Popup({ pixelOffset: [0, -10] })
      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      map.dispose()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    venueMarkersRef.current.forEach(m => map.markers.remove(m))
    venueMarkersRef.current = []

    if (showVenues) {
      venues.forEach(v => {
        const el = document.createElement('div')
        el.style.width = '16px'
        el.style.height = '16px'
        el.style.background = '#22c55e'
        el.style.borderRadius = '50%'
        el.style.border = '2px solid white'
        el.style.cursor = 'pointer'

        const marker = new atlas.HtmlMarker({
          htmlContent: el.outerHTML,
          position: [v.lng, v.lat]
        })

        map.events.add('click', marker, () => {
          popupRef.current.setOptions({
            content: `<div style="padding:8px;font-family:sans-serif"><strong>${v.name}</strong><br/>${v.city}<br/>Status: ${v.status}</div>`,
            position: [v.lng, v.lat]
          })
          popupRef.current.open(map)
        })

        map.markers.add(marker)
        venueMarkersRef.current.push(marker)
      })
    }
  }, [mapReady, venues, showVenues])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    incidentMarkersRef.current.forEach(m => map.markers.remove(m))
    incidentMarkersRef.current = []

    if (showIncidents) {
      incidents.forEach(i => {
        const color = i.severity === 'high' ? '#ef4444' : '#f59e0b'
        const el = document.createElement('div')
        el.style.width = '14px'
        el.style.height = '14px'
        el.style.background = color
        el.style.borderRadius = '50%'
        el.style.border = '2px solid white'
        el.style.cursor = 'pointer'

        const marker = new atlas.HtmlMarker({
          htmlContent: el.outerHTML,
          position: [i.lng, i.lat]
        })

        map.events.add('click', marker, () => {
          popupRef.current.setOptions({
            content: `<div style="padding:8px;font-family:sans-serif"><strong>${i.title}</strong><br/><em>${i.severity}</em><br/>${i.description}</div>`,
            position: [i.lng, i.lat]
          })
          popupRef.current.open(map)
        })

        map.markers.add(marker)
        incidentMarkersRef.current.push(marker)
      })
    }
  }, [mapReady, incidents, showIncidents])

  const renderFallback = () => (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
      <h2 style={{ marginTop: 0 }}>Map Preview Unavailable</h2>
      <p style={{ color: '#cbd5e1' }}>
        Add <code>VITE_AZURE_MAPS_KEY</code> to enable the interactive Azure Maps experience.
        Until then, this page still provides an operations summary of venues and incidents.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <h3>Venues ({venues.length})</h3>
          {venues.map(v => (
            <div key={v.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
              <strong>{v.name}</strong>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{v.city}, {v.country}</div>
            </div>
          ))}
        </div>
        <div>
          <h3>Open Incidents ({incidents.filter(i => i.status === 'open').length})</h3>
          {incidents.map(i => (
            <div key={i.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
              <strong>{i.title}</strong>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{i.severity} • {i.source}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Live Map</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
        <label style={{ color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" checked={showVenues} onChange={() => setShowVenues(s => !s)} /> Venues
        </label>
        <label style={{ color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" checked={showIncidents} onChange={() => setShowIncidents(s => !s)} /> Incidents
        </label>
      </div>
      {!AZURE_MAPS_KEY && (
        <div style={{
          background: '#7c2d12',
          color: '#fed7aa',
          padding: '0.75rem 1rem',
          borderRadius: 6,
          marginBottom: '0.75rem',
          fontWeight: 600
        }}>
          ⚠️ Missing VITE_AZURE_MAPS_KEY. Showing a non-map operational fallback instead.
        </div>
      )}
      {AZURE_MAPS_KEY ? (
        <div ref={mapContainer} style={{ width: '100%', height: 500, borderRadius: 8, border: '1px solid #334155' }} />
      ) : renderFallback()}
    </div>
  )
}
