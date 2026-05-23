import { useEffect, useMemo, useRef, useState } from 'react'
import * as atlas from 'azure-maps-control'
import { useData } from '../hooks/useData'

const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY

function getTrafficColor(level) {
  switch (level) {
    case 'heavy': return '#ef4444'
    case 'moderate': return '#f59e0b'
    default: return '#22c55e'
  }
}

function getWeatherColor(condition) {
  switch (condition) {
    case 'Storm': return '#8b5cf6'
    case 'Rain': return '#0ea5e9'
    case 'Clouds': return '#94a3b8'
    default: return '#facc15'
  }
}

function buildTrafficSegments(venues) {
  return venues.map((venue, index) => ({
    ...venue,
    level: index % 5 === 0 ? 'heavy' : index % 3 === 0 ? 'moderate' : 'light',
    path: [
      [venue.lng - 0.2, venue.lat - 0.08],
      [venue.lng, venue.lat],
      [venue.lng + 0.2, venue.lat + 0.08]
    ]
  }))
}

function buildWeatherSignals(venues) {
  const conditions = ['Clear', 'Clouds', 'Rain', 'Storm']
  return venues.map((venue, index) => ({
    ...venue,
    condition: conditions[index % conditions.length],
    temperatureF: 68 + (index % 7) * 3,
    windMph: 6 + (index % 6) * 2
  }))
}

export default function LiveMap() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const dataSourceRef = useRef(null)
  const { data: venues } = useData('venues')
  const { data: incidents } = useData('incidents')
  const [showVenues, setShowVenues] = useState(true)
  const [showIncidents, setShowIncidents] = useState(true)
  const [showTraffic, setShowTraffic] = useState(true)
  const [showWeather, setShowWeather] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  const trafficSegments = useMemo(() => buildTrafficSegments(venues), [venues])
  const weatherSignals = useMemo(() => buildWeatherSignals(venues), [venues])

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
      popupRef.current = new atlas.Popup({ pixelOffset: [0, -18] })
      const source = new atlas.source.DataSource()
      map.sources.add(source)
      dataSourceRef.current = source

      map.layers.add(new atlas.layer.LineLayer(source, 'traffic-lines', {
        strokeColor: ['get', 'color'],
        strokeWidth: 6,
        filter: ['==', ['get', 'layerType'], 'traffic']
      }))

      map.layers.add(new atlas.layer.SymbolLayer(source, 'venue-points', {
        iconOptions: {
          image: 'pin-round-darkblue',
          allowOverlap: true
        },
        textOptions: {
          textField: ['get', 'title'],
          offset: [0, 1.2],
          color: '#e2e8f0',
          size: 12,
          allowOverlap: true
        },
        filter: ['==', ['get', 'layerType'], 'venue']
      }))

      map.layers.add(new atlas.layer.BubbleLayer(source, 'incident-points', {
        radius: 8,
        color: ['get', 'color'],
        strokeColor: '#ffffff',
        strokeWidth: 2,
        filter: ['==', ['get', 'layerType'], 'incident']
      }))

      map.layers.add(new atlas.layer.BubbleLayer(source, 'weather-points', {
        radius: 12,
        color: ['get', 'color'],
        opacity: 0.75,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        filter: ['==', ['get', 'layerType'], 'weather']
      }))

      map.events.add('click', event => {
        const shapes = map.layers.getRenderedShapes(event.position)
        if (!shapes.length) return
        const shape = shapes[0]
        const properties = shape.getProperties?.() || {}
        const coordinates = shape.getType?.() === 'Point'
          ? shape.getCoordinates()
          : event.position

        popupRef.current.setOptions({
          content: `<div style="padding:10px;font-family:sans-serif;min-width:220px">
            <strong>${properties.title || 'Map item'}</strong><br/>
            <span>${properties.subtitle || ''}</span><br/>
            <span style="color:#475569">${properties.detail || ''}</span>
          </div>`,
          position: Array.isArray(coordinates) ? coordinates : map.pixelToPosition(event.position)
        })
        popupRef.current.open(map)
      })

      map.setCamera({ bounds: atlas.data.BoundingBox.fromData(venues.map(v => [v.lng, v.lat])), padding: 60 })
      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      map.dispose()
      mapRef.current = null
      dataSourceRef.current = null
    }
  }, [venues])

  useEffect(() => {
    const source = dataSourceRef.current
    if (!mapReady || !source) return

    source.clear()

    if (showVenues) {
      source.add(venues.map(v => new atlas.data.Feature(
        new atlas.data.Point([v.lng, v.lat]),
        {
          layerType: 'venue',
          title: v.name,
          subtitle: `${v.city}, ${v.country}`,
          detail: `Status: ${v.status} • Risk: ${v.riskLevel}`
        }
      )))
    }

    if (showIncidents) {
      source.add(incidents.map(i => new atlas.data.Feature(
        new atlas.data.Point([i.lng, i.lat]),
        {
          layerType: 'incident',
          color: i.severity === 'high' ? '#ef4444' : '#f59e0b',
          title: i.title,
          subtitle: `${i.severity} severity • ${i.source}`,
          detail: i.description
        }
      )))
    }

    if (showTraffic) {
      source.add(trafficSegments.map(segment => new atlas.data.Feature(
        new atlas.data.LineString(segment.path),
        {
          layerType: 'traffic',
          color: getTrafficColor(segment.level),
          title: `${segment.name} traffic`,
          subtitle: `${segment.city} ingress/egress`,
          detail: `Traffic load: ${segment.level}`
        }
      )))
    }

    if (showWeather) {
      source.add(weatherSignals.map(signal => new atlas.data.Feature(
        new atlas.data.Point([signal.lng, signal.lat]),
        {
          layerType: 'weather',
          color: getWeatherColor(signal.condition),
          title: `${signal.name} weather`,
          subtitle: `${signal.condition} • ${signal.temperatureF}°F`,
          detail: `Wind ${signal.windMph} mph`
        }
      )))
    }
  }, [mapReady, venues, incidents, showVenues, showIncidents, showTraffic, showWeather, trafficSegments, weatherSignals])

  const renderFallback = () => (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
      <h2 style={{ marginTop: 0 }}>Map Preview Unavailable</h2>
      <p style={{ color: '#cbd5e1' }}>
        Add <code>VITE_AZURE_MAPS_KEY</code> to enable the interactive Azure Maps experience.
        Venue coverage, live-ops traffic indicators, and weather overlays are preconfigured in data.
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
          <h3>Operational overlays</h3>
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Traffic segments modeled for all venues: {trafficSegments.length}</div>
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Weather markers modeled for all venues: {weatherSignals.length}</div>
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Open incidents: {incidents.filter(i => i.status === 'open').length}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Live Map</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
        <label style={{ color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" checked={showVenues} onChange={() => setShowVenues(s => !s)} /> Venues
        </label>
        <label style={{ color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" checked={showIncidents} onChange={() => setShowIncidents(s => !s)} /> Incidents
        </label>
        <label style={{ color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" checked={showTraffic} onChange={() => setShowTraffic(s => !s)} /> Live Traffic
        </label>
        <label style={{ color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" checked={showWeather} onChange={() => setShowWeather(s => !s)} /> Live Weather
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
        <div ref={mapContainer} style={{ width: '100%', height: 560, borderRadius: 8, border: '1px solid #334155' }} />
      ) : renderFallback()}
    </div>
  )
}
