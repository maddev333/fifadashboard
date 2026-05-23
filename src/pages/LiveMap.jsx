import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as atlas from 'azure-maps-control'
import { useData } from '../hooks/useData'

const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY
const WEATHER_REFRESH_MS = 10 * 60 * 1000
const FOCUSED_VENUE_ZOOM = 11
const FOCUSED_WEATHER_RADIUS_METERS = 25000
const WEATHER_OVERLAY_ID = 'weather-radar-overlay'

function isFiniteCoordinate(value) {
  return value != null && value !== '' && Number.isFinite(Number(value))
}

function hasValidLatLng(item) {
  return item && isFiniteCoordinate(item.lat) && isFiniteCoordinate(item.lng)
}

function toCoordinatePair(item) {
  return [Number(item.lng), Number(item.lat)]
}

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
  return venues
    .filter(hasValidLatLng)
    .map((venue, index) => {
      const conditions = ['Clear', 'Clouds', 'Rain', 'Storm']
      return {
        venueId: venue.id,
        name: venue.name,
        lat: Number(venue.lat),
        lng: Number(venue.lng),
        condition: conditions[index % conditions.length],
        temperatureF: 68 + (index % 7) * 3,
        windMph: 6 + (index % 6) * 2,
        source: 'Fallback simulation',
        isLive: false
      }
    })
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
    lat: Number(venue.lat),
    lng: Number(venue.lng),
    condition,
    temperatureF,
    windMph,
    source: 'Azure Maps Current Conditions',
    isLive: true,
    phrase,
    fetchedAt: new Date().toISOString()
  }
}

function getDistanceInMeters(a, b) {
  if (!hasValidLatLng(a) || !hasValidLatLng(b)) return Number.POSITIVE_INFINITY

  const earthRadius = 6371000
  const toRadians = degrees => (degrees * Math.PI) / 180
  const lat1 = toRadians(Number(a.lat))
  const lat2 = toRadians(Number(b.lat))
  const deltaLat = lat2 - lat1
  const deltaLng = toRadians(Number(b.lng) - Number(a.lng))
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function getVisibleWeatherSignals(weatherSignals, selectedVenue) {
  if (!hasValidLatLng(selectedVenue)) return weatherSignals

  return weatherSignals.filter(signal => (
    signal.venueId === selectedVenue.id || getDistanceInMeters(signal, selectedVenue) <= FOCUSED_WEATHER_RADIUS_METERS
  ))
}

function focusMap(map, venues, selectedVenue) {
  if (!map) return

  const validVenues = venues.filter(hasValidLatLng)
  const validSelectedVenue = hasValidLatLng(selectedVenue) ? selectedVenue : null

  if (validSelectedVenue) {
    map.setCamera({
      center: toCoordinatePair(validSelectedVenue),
      zoom: FOCUSED_VENUE_ZOOM,
      type: 'ease',
      duration: 1200
    })
    return
  }

  if (!validVenues.length) return

  try {
    map.setCamera({
      bounds: atlas.data.BoundingBox.fromData(validVenues.map(toCoordinatePair)),
      padding: 60
    })
  } catch {
    // ignore if bounding box fails
  }
}

function buildWeatherTileUrl() {
  return `https://atlas.microsoft.com/map/tile?api-version=2.1&tilesetId=microsoft.weather.radar.main&zoom={z}&x={x}&y={y}&tileSize=256&language=en-US&timeStamp=now&subscription-key=${AZURE_MAPS_KEY}`
}

function syncWeatherOverlay(map, enabled) {
  if (!map || !map.layers) return

  const existingLayer = map.layers.getLayerById(WEATHER_OVERLAY_ID)

  if (!enabled) {
    if (existingLayer) {
      map.layers.remove(existingLayer)
    }
    return
  }

  if (existingLayer) return

  const weatherOverlay = new atlas.layer.TileLayer({
    tileUrl: buildWeatherTileUrl(),
    opacity: 0.65,
    tileSize: 256,
    fadeDuration: 0,
    visible: true
  }, WEATHER_OVERLAY_ID)

  map.layers.add(weatherOverlay, 'labels')
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
  const [searchParams] = useSearchParams()
  const selectedVenueId = searchParams.get('venue') || ''
  const selectedVenue = useMemo(
    () => venues.find(venue => venue.id === selectedVenueId) || null,
    [venues, selectedVenueId]
  )
  const validVenues = useMemo(() => venues.filter(hasValidLatLng), [venues])
  const validIncidents = useMemo(() => incidents.filter(hasValidLatLng), [incidents])
  const [showVenues, setShowVenues] = useState(true)
  const [showIncidents, setShowIncidents] = useState(true)
  const [showTraffic, setShowTraffic] = useState(false)
  const [showWeather, setShowWeather] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [weatherSignals, setWeatherSignals] = useState([])
  const [weatherMode, setWeatherMode] = useState('loading')
  const [weatherStatus, setWeatherStatus] = useState('Loading live venue weather…')
  const fallbackWeatherSignals = useMemo(() => buildFallbackWeatherSignals(validVenues), [validVenues])
  const visibleWeatherSignals = useMemo(
    () => getVisibleWeatherSignals(weatherSignals, selectedVenue),
    [weatherSignals, selectedVenue]
  )

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
    if (!AZURE_MAPS_KEY || !validVenues.length) return

    let active = true

    const loadWeather = async () => {
      weatherAbortRef.current?.abort()
      const controller = new AbortController()
      weatherAbortRef.current = controller
      setWeatherMode(current => current === 'live' ? 'live' : 'loading')
      setWeatherStatus('Refreshing live venue weather from Azure Maps…')

      const settled = await Promise.allSettled(
        validVenues.map(venue => fetchVenueWeather(venue, controller.signal))
      )

      if (!active || controller.signal.aborted) return

      const live = settled
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)

      const failedCount = settled.length - live.length

      if (live.length) {
        const merged = validVenues.map(venue => {
          const found = live.find(item => item.venueId === venue.id)
          return found || fallbackWeatherSignals.find(item => item.venueId === venue.id)
        })

        setWeatherSignals(merged.filter(Boolean))
        setWeatherMode(failedCount ? 'mixed' : 'live')
        setWeatherStatus(
          failedCount
            ? `Live weather loaded for ${live.length}/${validVenues.length} venues. Radar overlay remains enabled.`
            : `Live weather loaded for all ${live.length} venues with Azure Maps radar overlay enabled.`
        )
      } else {
        setWeatherSignals(fallbackWeatherSignals)
        setWeatherMode('fallback')
        setWeatherStatus('Azure Maps weather calls failed, so fallback venue weather is shown while the radar overlay remains available.')
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
  }, [validVenues, fallbackWeatherSignals])

  useEffect(() => {
    if (!AZURE_MAPS_KEY || !mapContainer.current || mapRef.current) return

    isDisposedRef.current = false
    const initialCenter = hasValidLatLng(selectedVenue)
      ? toCoordinatePair(selectedVenue)
      : validVenues.length
        ? toCoordinatePair(validVenues[0])
        : [-100, 35]

    const map = new atlas.Map(mapContainer.current, {
      view: 'Auto',
      center: initialCenter,
      zoom: hasValidLatLng(selectedVenue) ? FOCUSED_VENUE_ZOOM : 3,
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

      syncWeatherOverlay(map, showWeather)

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

      focusMap(map, validVenues, selectedVenue)
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

      if (map.layers.getLayerById(WEATHER_OVERLAY_ID)) {
        map.layers.remove(WEATHER_OVERLAY_ID)
      }

      dataSourceRef.current = null
      mapRef.current = null
      map.dispose()
    }
  }, [validVenues, selectedVenue, showWeather])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !validVenues.length) return

    focusMap(map, validVenues, selectedVenue)
  }, [mapReady, validVenues, selectedVenue])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    map.setTraffic({
      flow: showTraffic ? 'relative' : 'none',
      incidents: false
    })
  }, [mapReady, showTraffic])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    syncWeatherOverlay(map, showWeather)
  }, [mapReady, showWeather])

  useEffect(() => {
    const source = dataSourceRef.current
    if (!mapReady || !source) return

    source.clear()

    if (showVenues) {
      source.add(validVenues.map(v => new atlas.data.Feature(
        new atlas.data.Point(toCoordinatePair(v)),
        {
          layerType: 'venue',
          title: v.name,
          subtitle: `${v.city}, ${v.country}`,
          detail: `Status: ${v.status} • Risk: ${v.riskLevel}`
        }
      )))
    }

    if (showIncidents) {
      source.add(validIncidents.map(i => new atlas.data.Feature(
        new atlas.data.Point(toCoordinatePair(i)),
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
      source.add(visibleWeatherSignals.map(signal => new atlas.data.Feature(
        new atlas.data.Point(toCoordinatePair(signal)),
        {
          layerType: 'weather',
          color: getWeatherColor(signal.condition),
          title: `${signal.name} weather`,
          subtitle: `${signal.condition} • ${signal.temperatureF}°F`,
          detail: `Wind ${signal.windMph} mph • ${signal.source}${signal.phrase ? ` • ${signal.phrase}` : ''}`
        }
      )))
    }
  }, [mapReady, validVenues, validIncidents, showVenues, showIncidents, showWeather, visibleWeatherSignals])

  const renderFallback = () => (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
      <h2 style={{ marginTop: 0 }}>Map Preview Unavailable</h2>
      <p style={{ color: '#cbd5e1' }}>
        Add <code>VITE_AZURE_MAPS_KEY</code> to enable the interactive Azure Maps experience.
        Venue coverage, Azure Maps traffic, and a live weather radar overlay are preconfigured, while venue weather markers fall back to static simulation.
      </p>
      {selectedVenue && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#0f172a', borderRadius: 6, color: '#bae6fd' }}>
          Focused venue: <strong>{selectedVenue.name}</strong> ({selectedVenue.city}, {selectedVenue.country})
        </div>
      )}
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
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Azure Maps weather radar overlay available when toggled on</div>
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Weather markers shown for visible venues: {visibleWeatherSignals.length}</div>
          <div style={{ color: '#e2e8f0', padding: '0.25rem 0' }}>Open incidents: {incidents.filter(i => i.status === 'open').length}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Live Map</h1>
          {selectedVenue && (
            <p style={{ marginTop: 0, color: '#94a3b8' }}>
              Focused on <strong style={{ color: '#e2e8f0' }}>{selectedVenue.name}</strong> in {selectedVenue.city}, {selectedVenue.country}.
              {' '}<Link to="/map" style={{ color: '#38bdf8' }}>Show all venues</Link>
            </p>
          )}
          {!selectedVenue && selectedVenueId && (
            <p style={{ marginTop: 0, color: '#fda4af' }}>
              Venue <strong>{selectedVenueId}</strong> was not found. Showing all venues instead.
            </p>
          )}
        </div>
      </div>
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
          <input type="checkbox" checked={showWeather} onChange={() => setShowWeather(s => !s)} /> Weather Overlay + Markers
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
            Live weather markers are loaded from Azure Maps Current Conditions for each venue and refresh every 10 minutes.
            The Weather Overlay toggle also adds an Azure Maps radar tile layer so precipitation patterns are visible across the full map.
          </p>
        </>
      ) : renderFallback()}
    </div>
  )
}
