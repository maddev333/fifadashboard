import { useEffect, useMemo, useRef, useState } from 'react'
import * as atlas from 'azure-maps-control'
import { useData } from '../hooks/useData'

const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY
const WEATHER_REFRESH_MS = 10 * 60 * 1000

function getWeatherColor(condition) {
  switch (condition) {
    case 'Storm': return '#8b5cf6'
    case 'Rain': return '#0ea5e9'
    case 'Clouds': return '#94a3b8'
    case 'Snow': return '#e2e8f0'
    default: return '#facc15'
  }
}

function buildFallbackWeatherSignals(venues) {
  const conditions = ['Clear', 'Clouds', 'Rain', 'Storm']
  return venues.map((venue, index) => ({
    venueId: venue.id,
    name: venue.name,
    lat: venue.lat,
    lng: venue.lng,
    condition: conditions[index % conditions.length],
    temperatureF: 68 + (index % 7) * 3,
    windMph: 6 + (index % 6) * 2,
    source: 'Fallback simulation',
    isLive: false
  }))
}

function normalizeCondition(iconCode = '') {
  const code = iconCode.toString().toLowerCase()
  if (code.includes('thunder') || code.includes('storm')) return 'Storm'
  if (code.includes('rain') || code.includes('shower') || code.includes('drizzle')) return 'Rain'
  if (code.includes('snow') || code.includes('ice') || code.includes('flurr')) return 'Snow'
  if (code.includes('cloud') || code.includes('overcast') || code.includes('fog')) return 'Clouds'
  return 'Clear'
}

async function fetchVenueWeather(venue, signal) {
  const response = await fetch(
    `https://atlas.microsoft.com/weather/currentConditions/json?api-version=1.1&query=${venue.lat},${venue.lng}&subscription-key=${AZURE_MAPS_KEY}&unit=imperial`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(`Weather fetch failed for ${venue.name}`)
  }

  const payload = await response.json()
  const result = payload?.results?.[0]

  if (!result) {
    throw new Error(`No weather returned for ${venue.name}`)
  }

  const phrase = result.phrase || result.iconPhrase || 'Clear'
  const condition = normalizeCondition(phrase)
  const temperatureF = Math.round(result.temperature?.value ?? result.temperature?.imperial?.value ?? 0)
  const windMph = Math.round(result.wind?.speed?.value ?? result.wind?.speed?.imperial?.value ?? 0)

  return {
    venueId: venue.id,
    name: venue.name,
    lat: venue.lat,
    lng: venue.lng,
    condition,
    temperatureF,
    windMph,
    source: 'Azure Maps Current Conditions',
    isLive: true,
    phrase,
    fetchedAt: new Date().toISOString()
  }
}

export default function LiveMap() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const dataSourceRef = useRef(null)
  const readyHandlerRef = useRef(null)
  const clickHandlerRef = useRef(null)
  const isDisposedRef = useRef(false)
  const weatherAbortRef = useRef(null)
  const weatherRefreshRef = useRef(null)
  const { data: venues } = useData('venues')
  const { data: incidents } = useData('incidents')
  const [showVenues, setShowVenues] = useState(true)
  const [showIncidents, setShowIncidents] = useState(true)
  const [showTraffic, setShowTraffic] = useState(false)
  const [showWeather, setShowWeather] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [weatherSignals, setWeatherSignals] = useState([])
  const [weatherMode, setWeatherMode] = useState('loading')
  const [weatherStatus, setWeatherStatus] = useState('Loading live venue weather…')
  const fallbackWeatherSignals = useMemo(() => buildFallbackWeatherSignals(venues), [venues])

  useEffect(() => {
    setWeatherSignals(fallbackWeatherSignals)
    setWeatherMode(fallbackWeatherSignals.length ? 'fallback' : 'loading')
    setWeatherStatus(
      fallbackWeatherSignals.length
        ? 'Showing fallback weather until live Azure Maps conditions load.'
        : 'Loading venue coverage…'
    )
  }, [fallbackWeatherSignals])

  useEffect(() => {
    if (!AZURE_MAPS_KEY || !venues.length) return

    let active = true

    const loadWeather = async () => {
      weatherAbortRef.current?.abort()
      const controller = new AbortController()
      weatherAbortRef.current = controller
      setWeatherMode(current => current === 'live' ? 'live' : 'loading')
      setWeatherStatus('Refreshing live venue weather from Azure Maps…')

      const settled = await Promise.allSettled(
        venues.map(venue => fetchVenueWeather(venue, controller.signal))
      )

      if (!active || controller.signal.aborted) return

      const live = settled
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)

      const failedCount = settled.length - live.length

      if (live.length) {
        const merged = venues.map(venue => {
          const found = live.find(item => item.venueId === venue.id)
          return found || fallbackWeatherSignals.find(item => item.venueId === venue.id)
        })

        setWeatherSignals(merged.filter(Boolean))
        setWeatherMode(failedCount ? 'mixed' : 'live')
        setWeatherStatus(
          failedCount
            ? `Live weather loaded for ${live.length}/${venues.length} venues. Remaining venues use fallback conditions.`
            : `Live weather loaded for all ${live.length} venues.`
        )
      } else {
        setWeatherSignals(fallbackWeatherSignals)
        setWeatherMode('fallback')
        setWeatherStatus('Azure Maps weather calls failed, so fallback venue weather is shown.')
      }
    }

    loadWeather()
    weatherRefreshRef.current = window.setInterval(loadWeather, WEATHER_REFRESH_MS)

    return () => {
      active = false
      weatherAbortRef.current?.abort()
      weatherAbortRef.current = null
      if (weatherRefreshRef.current) {
        window.clearInterval(weatherRefreshRef.current)
        weatherRefreshRef.current = null
      }
    }
  }, [venues, fallbackWeatherSignals])

  useEffect(() => {
    if (!AZURE_MAPS_KEY || !mapContainer.current || mapRef.current) return

    isDisposedRef.current = false
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

    mapRef.current = map

    const handleMapClick = event => {
      if (isDisposedRef.current || !popupRef.current) return

      const shapes = map.layers.getRenderedShapes(event.position)
      if (!shapes.length) return

      const shape = shapes[0]
      const properties = shape.getProperties?.() || {}
      const geometryType = shape.getType?.()
      const coordinates = geometryType === 'Point'
        ? shape.getCoordinates()
        : event.position

      popupRef.current.setOptions({
        content: `<div style="padding:10px;font-family:sans-serif;min-width:220px">
          <strong>${properties.title || 'Map item'}</strong><br/>
          <span>${properties.subtitle || ''}</span><br/>
          <span style="color:#475569">${properties.detail || ''}</span>
        </div>`,
        position: coordinates
      })
      popupRef.current.open(map)
    }

    const handleReady = () => {
      if (isDisposedRef.current) return

      popupRef.current = new atlas.Popup({ pixelOffset: [0, -18] })
      const source = new atlas.source.DataSource()
      map.sources.add(source)
      dataSourceRef.current = source

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

      clickHandlerRef.current = handleMapClick
      map.events.add('click', clickHandlerRef.current)

      const bounds = atlas.data.BoundingBox.fromData(venues.map(v => [v.lng, v.lat]))
      if (bounds) {
        map.setCamera({ bounds, padding: 60 })
      }

      setMapReady(true)
    }

    readyHandlerRef.current = handleReady
    map.events.add('ready', readyHandlerRef.current)

    return () => {
      isDisposedRef.current = true
      setMapReady(false)

      if (popupRef.current) {
        popupRef.current.close()
        popupRef.current = null
      }

      if (readyHandlerRef.current) {
        map.events.remove('ready', readyHandlerRef.current)
        readyHandlerRef.current = null
      }

      if (clickHandlerRef.current) {
        map.events.remove('click', clickHandlerRef.current)
        clickHandlerRef.current = null
      }

      dataSourceRef.current = null
      mapRef.current = null
      map.dispose()
    }
  }, [venues])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !venues.length) return

    try {
      map.setCamera({
        bounds: atlas.data.BoundingBox.fromData(venues.map(v => [v.lng, v.lat])),
        padding: 60
      })
    } catch {
      // ignore if bounding box fails
    }
  }, [mapReady, venues])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    map.setTraffic({
      flow: showTraffic ? 'relative' : 'none',
      incidents: false
    })
  }, [mapReady, showTraffic])

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

    if (showWeather) {
      source.add(weatherSignals.map(signal => new atlas.data.Feature(
        new atlas.data.Point([signal.lng, signal.lat]),
        {
          layerType: 'weather',
          color: getWeatherColor(signal.condition),
          title: `${signal.name} weather`,
          subtitle: `${signal.condition} • ${signal.temperatureF}°F`,
          detail: `Wind ${signal.windMph} mph • ${signal.source}${signal.phrase ? ` • ${signal.phrase}` : ''}`
        }
      )))
    }
  }, [mapReady, venues, incidents, showVenues, showIncidents, showWeather, weatherSignals])

  const renderFallback = () => (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
      <h2 style={{ marginTop: 0 }}>Map Preview Unavailable</h2>
      <p style={{ color: '#cbd5e1' }}>
        Add <code>VITE_AZURE_MAPS_KEY</code> to enable the interactive Azure Maps experience.
        Venue coverage and incident overlays are preconfigured in data, and venue weather falls back to static simulation.
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
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Live Azure Maps traffic flow available when toggled on</div>
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Weather markers shown for all venues: {weatherSignals.length}</div>
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
      <div style={{
        background: weatherMode === 'fallback' ? '#7c2d12' : '#0f766e',
        color: weatherMode === 'fallback' ? '#fed7aa' : '#ccfbf1',
        padding: '0.75rem 1rem',
        borderRadius: 6,
        marginBottom: '0.75rem',
        fontWeight: 600
      }}>
        {weatherStatus}
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
        <>
          <div ref={mapContainer} style={{ width: '100%', height: 560, borderRadius: 8, border: '1px solid #334155' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.75rem' }}>
            Live weather is loaded directly from Azure Maps Current Conditions for each venue and refreshes every 10 minutes.
            If a venue call fails, the map keeps a fallback simulated marker for that location.
          </p>
        </>
      ) : renderFallback()}
    </div>
  )
}
