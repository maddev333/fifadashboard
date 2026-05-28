import { useEffect, useMemo, useRef, useState } from 'react'
import * as atlas from 'azure-maps-control'
import { hasValidLatLng, toCoordinatePair, getDistanceInMeters } from '../utils/geo'

const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY
const FOCUSED_VENUE_ZOOM = 11
const HOST_REGION_CENTER = [-99.5, 37.5]
const DEFAULT_ALL_VENUES_ZOOM = 3
const FOCUSED_WEATHER_RADIUS_METERS = 25000
const WEATHER_OVERLAY_ID = 'weather-radar-overlay'

/*
 * The colors below are map rendering values passed to the Azure Maps
 * bubble/ symbol layers. They are not CSS styles and do not participate
 * in the component theme token system.
 */
function getWeatherColor(condition) {
  switch (condition) {
    case 'Storm': return '#8b5cf6'
    case 'Rain': return '#0ea5e9'
    case 'Clouds': return '#94a3b8'
    case 'Snow': return '#e2e8f0'
    default: return '#facc15'
  }
}

function getVenueMarkerColor(venue, selectedVenueId, featuredVenueId) {
  if (venue.id === selectedVenueId) return '#22c55e'
  if (venue.id === featuredVenueId) return '#f59e0b'
  if (venue.riskLevel === 'high') return '#ef4444'
  if (venue.status === 'caution') return '#f97316'
  return '#2563eb'
}

const BASE_CAMP_COLOR = '#8b5cf6'

function getVisibleWeatherSignals(weatherSignals, selectedVenue) {
  if (!hasValidLatLng(selectedVenue)) return weatherSignals
  return weatherSignals.filter(signal => (
    signal.venueId === selectedVenue.id || getDistanceInMeters(signal, selectedVenue) <= FOCUSED_WEATHER_RADIUS_METERS
  ))
}

function focusMap(map, selectedVenue) {
  if (!map) return
  if (hasValidLatLng(selectedVenue)) {
    map.setCamera({ center: toCoordinatePair(selectedVenue), zoom: FOCUSED_VENUE_ZOOM, type: 'ease', duration: 1200 })
    return
  }
  map.setCamera({ center: HOST_REGION_CENTER, zoom: DEFAULT_ALL_VENUES_ZOOM, type: 'ease', duration: 1200 })
}

function getWeatherTileTimestamp(date = new Date()) {
  const rounded = new Date(date)
  rounded.setUTCMinutes(0, 0, 0)
  return rounded.toISOString()
}

function buildWeatherTileUrl(timeStamp = getWeatherTileTimestamp()) {
  return `https://atlas.microsoft.com/map/tile?api-version=2.1&tilesetId=microsoft.weather.radar.main&zoom={z}&x={x}&y={y}&tileSize=256&language=en-US&timeStamp=${encodeURIComponent(timeStamp)}&subscription-key=${AZURE_MAPS_KEY}`
}

function syncWeatherOverlay(map, enabled) {
  if (!map || !map.layers) return
  const existingLayer = map.layers.getLayerById(WEATHER_OVERLAY_ID)
  if (!enabled) {
    if (existingLayer) map.layers.remove(existingLayer)
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

function isWebGLSupported() {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

export default function LiveMap({
  venues = [],
  incidents = [],
  baseCamps = [],
  weatherSignals = [],
  layers,
  selectedVenueId,
  featuredVenueId,
  todayMatches = [],
  nextMatchCountdown,
  onVenueClick,
  onBackgroundClick
}) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const dataSourceRef = useRef(null)
  const readyHandlerRef = useRef(null)
  const clickHandlerRef = useRef(null)
  const isDisposedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapInitError, setMapInitError] = useState(null)

  const selectedVenue = useMemo(() => venues.find(v => v.id === selectedVenueId) || null, [venues, selectedVenueId])
  const visibleWeatherSignals = useMemo(() => getVisibleWeatherSignals(weatherSignals, selectedVenue), [weatherSignals, selectedVenue])
  const todayMatchVenueIds = useMemo(() => new Set(todayMatches.map(match => match.venueId)), [todayMatches])

  // Initialize map
  useEffect(() => {
    if (!AZURE_MAPS_KEY || !mapContainer.current || mapRef.current) return
    if (!isWebGLSupported()) {
      setMapInitError('WebGL is not supported or is disabled in this browser.')
      return
    }

    isDisposedRef.current = false
    const initialCenter = hasValidLatLng(selectedVenue) ? toCoordinatePair(selectedVenue) : HOST_REGION_CENTER

    let map
    try {
      map = new atlas.Map(mapContainer.current, {
        view: 'Auto',
        center: initialCenter,
        zoom: hasValidLatLng(selectedVenue) ? FOCUSED_VENUE_ZOOM : DEFAULT_ALL_VENUES_ZOOM,
        style: 'grayscale_dark',
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: AZURE_MAPS_KEY
        }
      })
    } catch (err) {
      setMapInitError(err.message || 'Failed to initialize Azure Maps.')
      return
    }

    mapRef.current = map

    const handleMapClick = event => {
      if (isDisposedRef.current || !popupRef.current) return
      const shapes = map.layers.getRenderedShapes(event.position)
      if (!shapes.length) {
        onBackgroundClick?.()
        popupRef.current.close()
        return
      }
      const shape = shapes[0]
      const properties = shape.getProperties?.() || {}
      const geometryType = shape.getType?.()
      const coordinates = geometryType === 'Point' ? shape.getCoordinates() : event.position

      if (properties.layerType === 'venue' && properties._venueId) {
        onVenueClick?.(properties._venueId)
      } else if (properties.layerType === 'baseCamp') {
        // Base camp popup only — no drawer navigation
      }

      popupRef.current.setOptions({
        content: `<div style="padding:10px;font-family:sans-serif;min-width:240px">
          <strong>${properties.title || 'Host venue'}</strong><br/>
          <span>${properties.subtitle || ''}</span><br/>
          <span style="color:#475569">${properties.detail || ''}</span><br/>
          ${properties.countdown ? `<span style="display:inline-block;margin-top:6px;color:#ea580c;font-weight:700">Countdown: ${properties.countdown}</span>` : ''}
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

      map.layers.add(new atlas.layer.BubbleLayer(source, 'basecamp-bubbles', {
        radius: 8,
        color: BASE_CAMP_COLOR,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        opacity: 0.85,
        filter: ['==', ['get', 'layerType'], 'baseCamp']
      }))

      map.layers.add(new atlas.layer.SymbolLayer(source, 'basecamp-points', {
        textOptions: {
          textField: ['get', 'shortLabel'],
          offset: [0, 1.4],
          color: '#e2e8f0',
          size: 11,
          allowOverlap: true
        },
        filter: ['==', ['get', 'layerType'], 'baseCamp']
      }))

      map.layers.add(new atlas.layer.BubbleLayer(source, 'venue-bubbles', {
        radius: ['interpolate', ['linear'], ['get', 'matchCount'], 0, 10, 3, 16, 7, 22],
        color: ['get', 'markerColor'],
        strokeColor: '#ffffff',
        strokeWidth: 2,
        opacity: 0.9,
        filter: ['==', ['get', 'layerType'], 'venue']
      }))

      map.layers.add(new atlas.layer.SymbolLayer(source, 'venue-points', {
        textOptions: {
          textField: ['get', 'shortLabel'],
          offset: [0, 1.4],
          color: '#e2e8f0',
          size: 12,
          allowOverlap: true
        },
        filter: ['==', ['get', 'layerType'], 'venue']
      }))

      map.layers.add(new atlas.layer.BubbleLayer(source, 'incident-points', {
        radius: 8, color: ['get', 'color'], strokeColor: '#ffffff', strokeWidth: 2,
        filter: ['==', ['get', 'layerType'], 'incident']
      }))

      map.layers.add(new atlas.layer.BubbleLayer(source, 'weather-points', {
        radius: 12, color: ['get', 'color'], opacity: 0.75, strokeColor: '#ffffff', strokeWidth: 2,
        filter: ['==', ['get', 'layerType'], 'weather']
      }))

      clickHandlerRef.current = handleMapClick
      map.events.add('click', clickHandlerRef.current)
      focusMap(map, selectedVenue)
      setMapReady(true)
    }

    readyHandlerRef.current = handleReady
    map.events.add('ready', readyHandlerRef.current)

    return () => {
      isDisposedRef.current = true
      setMapReady(false)
      if (popupRef.current) { popupRef.current.close(); popupRef.current = null }
      if (readyHandlerRef.current) { map.events.remove('ready', readyHandlerRef.current); readyHandlerRef.current = null }
      if (clickHandlerRef.current) { map.events.remove('click', clickHandlerRef.current); clickHandlerRef.current = null }
      if (map.layers.getLayerById(WEATHER_OVERLAY_ID)) map.layers.remove(WEATHER_OVERLAY_ID)
      dataSourceRef.current = null
      mapRef.current = null
      map.dispose()
    }
  }, [onVenueClick, onBackgroundClick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus camera when selected venue changes
  useEffect(() => {
    if (mapReady && mapRef.current) focusMap(mapRef.current, selectedVenue)
  }, [mapReady, selectedVenue])

  // Toggle traffic
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.setTraffic({ flow: layers.traffic ? 'relative' : 'none', incidents: false })
  }, [mapReady, layers.traffic])

  // Toggle weather radar overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    syncWeatherOverlay(map, layers.weatherRadar)
  }, [mapReady, layers.weatherRadar])

  // Update data source shapes
  useEffect(() => {
    const source = dataSourceRef.current
    if (!mapReady || !source) return
    source.clear()

    if (layers.baseCamps) {
      source.add(baseCamps.map(c => new atlas.data.Feature(
        new atlas.data.Point(toCoordinatePair(c)),
        {
          layerType: 'baseCamp',
          title: c.name,
          shortLabel: c.city,
          subtitle: `${c.city}, ${c.country}`,
          detail: `${c.teams?.length || 0} team base${c.teams?.length !== 1 ? 's' : ''}${c.teams ? `: ${c.teams.join(', ')}` : ''}`,
        }
      )))
    }

    if (layers.venues) {
      source.add(venues.map(v => new atlas.data.Feature(
        new atlas.data.Point(toCoordinatePair(v)),
        {
          layerType: 'venue',
          title: v.name,
          shortLabel: v.city,
          subtitle: `${v.hostLabel || `${v.city}, ${v.country}`} • ${v.matchCount || 0} matches`,
          detail: v.nextMatch
            ? `Next: ${v.nextMatch.homeTeam} vs ${v.nextMatch.awayTeam} • ${v.nextMatch.date}${todayMatchVenueIds.has(v.id) ? ' • Matchday venue' : ''}`
            : `Status: ${v.status} • Risk: ${v.riskLevel}`,
          countdown: v.nextMatchCountdown || '',
          markerColor: getVenueMarkerColor(v, selectedVenueId, featuredVenueId),
          matchCount: v.matchCount || 0,
          _venueId: v.id
        }
      )))
    }

    if (layers.incidents) {
      source.add(incidents.map(i => new atlas.data.Feature(
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

    if (layers.weatherMarkers) {
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
  }, [mapReady, venues, incidents, baseCamps, layers.venues, layers.baseCamps, layers.incidents, layers.weatherMarkers, visibleWeatherSignals, selectedVenueId, featuredVenueId, todayMatchVenueIds])

  if (mapInitError) {
    return (
      <div className="map-fallback">
        <div className="card" style={{ maxWidth: 600, width: '100%' }}>
          <h2 style={{ marginTop: 0, color: 'var(--color-red-400)' }}>Map Unavailable</h2>
          <p style={{ color: 'var(--color-slate-300)' }}>
            The interactive map could not load because WebGL is disabled or unavailable in this browser.
            Try enabling hardware acceleration, or use a different browser/device.
          </p>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>{mapInitError}</p>
          {nextMatchCountdown && (
            <p style={{ color: 'var(--color-orange-400)', fontSize: '0.95rem', fontWeight: 700 }}>
              Next match countdown: {nextMatchCountdown}
            </p>
          )}
          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem' }}>Host Venues ({venues.length})</h3>
              {venues.map(v => (
                <div key={v.id} style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <strong>{v.name}</strong>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{v.city}, {v.country} • {v.matchCount || 0} matches</div>
                  {v.nextMatchCountdown && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-orange-400)' }}>Countdown: {v.nextMatchCountdown}</div>
                  )}
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem' }}>Base Camps ({baseCamps.length})</h3>
              {baseCamps.map(c => (
                <div key={c.id} style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <strong>{c.name}</strong>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{c.city}, {c.country}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', color: 'var(--color-purple-500)' }}>{c.teams?.join(', ')}</div>
                </div>
              ))}
              <h3 style={{ fontSize: '1rem' }}>Open Incidents</h3>
              <div style={{ fontSize: '0.85rem' }}>{incidents.filter(i => i.status === 'open').length} active incidents</div>
              <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Matchday Venues</h3>
              <div style={{ fontSize: '0.85rem' }}>{todayMatches.length} matches on the selected schedule day</div>
              <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Weather Signals</h3>
              <div style={{ fontSize: '0.85rem' }}>{visibleWeatherSignals.length} venue weather markers</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
