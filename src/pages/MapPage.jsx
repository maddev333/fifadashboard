import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { useAlerts } from '../hooks/useAlerts'
import { useVenueWeather } from '../hooks/useVenueWeather'
import { hasValidLatLng } from '../utils/geo'
import LiveMap from './LiveMap'
import KpiOverlay from '../components/KpiOverlay'
import LayerPanel from '../components/LayerPanel'
import DetailDrawer from '../components/DetailDrawer'

/* ── Eastern Time helpers ───────────────────────────────── */

const ET_TZ = 'America/New_York'
const CAMERA_FEEDS = {
  'new-york-new-jersey-stadium': {
    id: 'nyc-traffic-cam-1',
    title: 'Meadowlands Approach Traffic Camera',
    label: 'Meadowlands traffic camera',
    location: 'East Rutherford, New Jersey',
    provider: 'NJ 511',
    streamUrl: 'https://wink.njta.com/204/public/hls/WF05-24B0-46EE-0875-23D7_nj.m3u8',
    notes: 'Live HLS traffic camera covering the approach to the New York New Jersey Stadium host venue.'
  }
}

const BASE_CAMP_CITY_COORDINATES = {
  'alexandria': { lat: 38.8048, lng: -77.0469, state: 'Virginia', country: 'United States' },
  'atlanta': { lat: 33.749, lng: -84.388, state: 'Georgia', country: 'United States' },
  'austin': { lat: 30.2672, lng: -97.7431, state: 'Texas', country: 'United States' },
  'boca raton': { lat: 26.3683, lng: -80.1289, state: 'Florida', country: 'United States' },
  'boston': { lat: 42.3601, lng: -71.0589, state: 'Massachusetts', country: 'United States' },
  'cancun': { lat: 21.1619, lng: -86.8515, state: 'Quintana Roo', country: 'Mexico' },
  'charlotte': { lat: 35.2271, lng: -80.8431, state: 'North Carolina', country: 'United States' },
  'chattanooga': { lat: 35.0456, lng: -85.3097, state: 'Tennessee', country: 'United States' },
  'columbus': { lat: 39.9612, lng: -82.9988, state: 'Ohio', country: 'United States' },
  'dallas': { lat: 32.7767, lng: -96.797, state: 'Texas', country: 'United States' },
  'goleta': { lat: 34.4358, lng: -119.8276, state: 'California', country: 'United States' },
  'greenbrier county': { lat: 37.8, lng: -80.4456, state: 'West Virginia', country: 'United States' },
  'greensboro': { lat: 36.0726, lng: -79.792, state: 'North Carolina', country: 'United States' },
  'guadalajara': { lat: 20.6597, lng: -103.3496, state: 'Jalisco', country: 'Mexico' },
  'houston': { lat: 29.7604, lng: -95.3698, state: 'Texas', country: 'United States' },
  'irvine': { lat: 33.6846, lng: -117.8265, state: 'California', country: 'United States' },
  'kansas city': { lat: 39.0997, lng: -94.5786, state: 'Missouri', country: 'United States' },
  'mesa': { lat: 33.4152, lng: -111.8315, state: 'Arizona', country: 'United States' },
  'mexico city': { lat: 19.4326, lng: -99.1332, state: 'CDMX', country: 'Mexico' },
  'monterrey': { lat: 25.6866, lng: -100.3161, state: 'Nuevo León', country: 'Mexico' },
  'nashville': { lat: 36.1627, lng: -86.7816, state: 'Tennessee', country: 'United States' },
  'new tecumseth': { lat: 44.0814, lng: -79.8032, state: 'Ontario', country: 'Canada' },
  'new york new jersey': { lat: 40.7128, lng: -74.006, state: 'New York / New Jersey', country: 'United States' },
  'pachuca': { lat: 20.1011, lng: -98.7591, state: 'Hidalgo', country: 'Mexico' },
  'palm beach gardens': { lat: 26.8234, lng: -80.1387, state: 'Florida', country: 'United States' },
  'philadelphia': { lat: 39.9526, lng: -75.1652, state: 'Pennsylvania', country: 'United States' },
  'portland': { lat: 45.5152, lng: -122.6784, state: 'Oregon', country: 'United States' },
  'renton': { lat: 47.4829, lng: -122.2171, state: 'Washington', country: 'United States' },
  'san diego': { lat: 32.7157, lng: -117.1611, state: 'California', country: 'United States' },
  'san francisco bay area': { lat: 37.7749, lng: -122.4194, state: 'California', country: 'United States' },
  'sandy': { lat: 40.5649, lng: -111.8389, state: 'Utah', country: 'United States' },
  'santa barbara': { lat: 34.4208, lng: -119.6982, state: 'California', country: 'United States' },
  'spokane': { lat: 47.6588, lng: -117.426, state: 'Washington', country: 'United States' },
  'tampa': { lat: 27.9506, lng: -82.4572, state: 'Florida', country: 'United States' },
  'tijuana': { lat: 32.5149, lng: -117.0382, state: 'Baja California', country: 'Mexico' },
  'vancouver': { lat: 49.2827, lng: -123.1207, state: 'British Columbia', country: 'Canada' },
  'winston-salem': { lat: 36.0999, lng: -80.2442, state: 'North Carolina', country: 'United States' }
}

function getEtDateString(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: ET_TZ })
}

function getEtNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: ET_TZ })
  )
}

function formatEtTime(date = getEtNow()) {
  return date.toLocaleTimeString('en-US', {
    timeZone: ET_TZ,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

function parseEtDateTime(dateStr, timeStr) {
  if (!dateStr) return null
  const raw = (timeStr || '00:00').trim()
  const normalized = /^\d{1,2}:\d{2}$/.test(raw) ? `${raw}:00` : raw
  // Summer 2026 is EDT (UTC-4).  Using -04:00 keeps everything in ET.
  const parsed = new Date(`${dateStr}T${normalized}-04:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getMatchDateTime(match) {
  return parseEtDateTime(match?.date, match?.timeET)
}

function getTimeRemainingParts(targetDate, now = getEtNow()) {
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) return null
  const diffMs = targetDate.getTime() - now.getTime()
  if (diffMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { totalMs: diffMs, days, hours, minutes, seconds }
}

function formatCountdown(parts) {
  if (!parts) return 'Schedule unavailable'
  if (parts.totalMs <= 0) return 'Now live'

  const segments = []
  if (parts.days > 0) segments.push(`${parts.days}d`)
  segments.push(`${String(parts.hours).padStart(2, '0')}h`)
  segments.push(`${String(parts.minutes).padStart(2, '0')}m`)
  segments.push(`${String(parts.seconds).padStart(2, '0')}s`)

  return segments.join(' ')
}

function compareMatchDateTimes(a, b) {
  return getMatchDateTime(a) - getMatchDateTime(b)
}

function slugifyValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeCityKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function buildBaseCampRecord(camp) {
  const cityKey = normalizeCityKey(camp.city)
  const location = BASE_CAMP_CITY_COORDINATES[cityKey]
  if (!location) return null

  return {
    id: `base-camp-${slugifyValue(camp.association)}`,
    name: `${camp.association} Base Camp`,
    association: camp.association,
    city: camp.city,
    state: location.state,
    country: location.country,
    trainingSite: camp.trainingSite,
    lat: location.lat,
    lng: location.lng,
    hostLabel: `${camp.city}, ${location.country}`,
    venueLabel: camp.trainingSite,
    markerType: 'base-camp'
  }
}

/* ── Severity color tokens for KPIs ─────────────────────── */

const KPI_COLOR_INFO     = 'var(--color-accent)'
const KPI_COLOR_SUCCESS  = 'var(--color-success)'
const KPI_COLOR_WARNING  = 'var(--color-warning)'
const KPI_COLOR_DANGER   = 'var(--color-danger)'
const KPI_COLOR_ATTENTION = 'var(--color-orange-400)'
const KPI_COLOR_CAUTION  = 'var(--color-yellow-400)'
const KPI_COLOR_ACTIVE   = 'var(--color-teal-500)'

/* ── Page ────────────────────────────────────────────────── */

export default function MapPage() {
  const [refreshSeconds, setRefreshSeconds] = useState(15)
  const [mapView, setMapView] = useState('venues')
  const refreshMs = refreshSeconds * 1000
  const { data: venues } = useData('venues', refreshMs)
  const { data: incidents } = useData('incidents', refreshMs)
  const { data: matches } = useData('matches', refreshMs)
  const { data: baseCampsRaw } = useData('base-camps', refreshMs)
  const { alerts } = useAlerts()

  const [layers, setLayers] = useState({
    venues: true,
    baseCamps: true,
    incidents: true,
    traffic: false,
    weatherRadar: true,
    weatherMarkers: true,
  })

  /* 1-second timer */
  const [countdownNow, setCountdownNow] = useState(() => getEtNow())
  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(getEtNow()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const currentTimeLabel = useMemo(() => formatEtTime(countdownNow), [countdownNow])

  const validVenues = useMemo(() => venues.filter(hasValidLatLng), [venues])
  const validIncidents = useMemo(() => incidents.filter(hasValidLatLng), [incidents])
  const baseCamps = useMemo(() => baseCampsRaw.map(buildBaseCampRecord).filter(Boolean), [baseCampsRaw])

  const matchesByVenue = useMemo(() => {
    return matches.reduce((acc, match) => {
      acc[match.venueId] = [...(acc[match.venueId] || []), match].sort(compareMatchDateTimes)
      return acc
    }, {})
  }, [matches])

  /* Stable venue metadata – computed once when data loads */
  const hostVenues = useMemo(() => (
    validVenues.map(venue => {
      const venueMatches = matchesByVenue[venue.id] || []
      const sorted = [...venueMatches].sort(compareMatchDateTimes)
      const nextMatch = sorted.find(m => {
        const dt = getMatchDateTime(m)
        return dt && dt >= countdownNow
      }) || sorted[0] || null
      const nextMatchDateTime = getMatchDateTime(nextMatch)
      const cameraFeed = CAMERA_FEEDS[venue.id] || null

      return {
        ...venue,
        matches: venueMatches,
        matchCount: venueMatches.length,
        hasMatch: venueMatches.length > 0,
        nextMatch,
        nextMatchDateTime,
        cameraFeed,
        hasCameraFeed: Boolean(cameraFeed),
        hostLabel: `${venue.city}, ${venue.country}`,
        venueLabel: venueMatches.length > 0
          ? `${venueMatches.length} World Cup matches`
          : 'Host venue',
        markerType: 'venue'
      }
    })
  ), [validVenues, matchesByVenue, countdownNow])

  const featuredVenue = useMemo(() => {
    return hostVenues
      .filter(v => v.nextMatchDateTime)
      .sort((a, b) => a.nextMatchDateTime - b.nextMatchDateTime)[0] || hostVenues[0] || null
  }, [hostVenues])

  /* Live countdown string – changes every second but everything else is stable */
  const featuredCountdown = useMemo(() => {
    const parts = getTimeRemainingParts(featuredVenue?.nextMatchDateTime, countdownNow)
    return formatCountdown(parts)
  }, [featuredVenue, countdownNow])

  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [selectedBaseCampId, setSelectedBaseCampId] = useState(null)
  const [drawerTab, setDrawerTab] = useState(null)

  const { weatherSignals, weatherMode, weatherStatus } = useVenueWeather(validVenues, refreshMs)

  const handleVenueClick = useCallback((venueId) => {
    setMapView('venues')
    setSelectedVenueId(venueId)
    setSelectedBaseCampId(null)
    setDrawerTab('venue')
  }, [])

  const handleBaseCampClick = useCallback((baseCampId) => {
    setMapView('base-camps')
    setSelectedBaseCampId(baseCampId)
    setSelectedVenueId(null)
    setDrawerTab('base-camp')
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedVenueId(null)
    setSelectedBaseCampId(null)
    if (drawerTab === 'venue' || drawerTab === 'base-camp') setDrawerTab(null)
  }, [drawerTab])

  const handleMapViewChange = useCallback((nextView) => {
    setMapView(nextView)
    if (nextView === 'venues') {
      setSelectedBaseCampId(null)
      if (drawerTab === 'base-camp') setDrawerTab(null)
    } else {
      setSelectedVenueId(null)
      if (drawerTab === 'venue') setDrawerTab(null)
    }
  }, [drawerTab])

  const todayEt = getEtDateString(countdownNow)
  const todayMatches = useMemo(
    () => matches.filter(m => m.date === todayEt),
    [matches, todayEt]
  )
  const activeVenues = [...new Set(todayMatches.map(m => m.venueId))].length
  const openIncidents = incidents.filter(i => i.status === 'open').length
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const totalHostedMatches = matches.length
  const baseCampCities = useMemo(() => new Set(baseCamps.map(camp => camp.city)).size, [baseCamps])

  /* Compute per-venue countdown for popups/livemap */
  const venuesWithCountdown = useMemo(() => {
    return hostVenues.map(v => {
      const parts = getTimeRemainingParts(v.nextMatchDateTime, countdownNow)
      return {
        ...v,
        nextMatchCountdown: v.nextMatch ? formatCountdown(parts) : 'No upcoming match'
      }
    })
  }, [hostVenues, countdownNow])

  /* Memoize stats so KpiOverlay doesn't get a new array every second */
  const venueKpiStats = useMemo(() => [
    { label: 'Tournament Matches', value: totalHostedMatches, color: KPI_COLOR_INFO },
    { label: 'Next Match Countdown', value: featuredCountdown, color: KPI_COLOR_ATTENTION },
    { label: 'Matches Today', value: todayMatches.length, color: KPI_COLOR_SUCCESS },
    { label: 'Host Venues', value: hostVenues.length, color: KPI_COLOR_CAUTION },
    { label: 'Open Incidents', value: openIncidents, color: KPI_COLOR_DANGER },
    { label: 'Critical Alerts', value: criticalAlerts, color: KPI_COLOR_WARNING },
    { label: 'Active Venues Today', value: activeVenues, color: KPI_COLOR_ACTIVE },
  ], [totalHostedMatches, featuredCountdown, todayMatches.length, hostVenues.length,
      openIncidents, criticalAlerts, activeVenues])

  const baseCampKpiStats = useMemo(() => [
    { label: 'Base Camps', value: baseCamps.length, color: KPI_COLOR_INFO },
    { label: 'Base Camp Cities', value: baseCampCities, color: KPI_COLOR_ATTENTION },
    { label: 'Open Incidents', value: openIncidents, color: KPI_COLOR_DANGER },
    { label: 'Critical Alerts', value: criticalAlerts, color: KPI_COLOR_WARNING },
    { label: 'Host Venues', value: hostVenues.length, color: KPI_COLOR_CAUTION },
  ], [baseCamps.length, baseCampCities, openIncidents, criticalAlerts, hostVenues.length])

  const activeKpiStats = mapView === 'base-camps' ? baseCampKpiStats : venueKpiStats
  const mapTitle = mapView === 'base-camps' ? '⚽ World Cup 2026 Base Camp Map' : '⚽ World Cup 2026 Venue Map'
  const mapSubtitle = mapView === 'base-camps'
    ? 'Viewing workbook-sourced base camp locations for participating member associations'
    : featuredVenue?.nextMatch
      ? `Next: ${featuredVenue.name} • ${featuredVenue.nextMatch.homeTeam} vs ${featuredVenue.nextMatch.awayTeam} on ${featuredVenue.nextMatch.date} ET • ${featuredCountdown}`
      : 'Viewing tournament host venues across the United States, Mexico, and Canada'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-bg)', overflow: 'hidden' }}>
      <main aria-label="Live venue map" style={{ position: 'absolute', inset: 0 }}>
        <LiveMap
          venues={venuesWithCountdown}
          baseCamps={baseCamps}
          incidents={validIncidents}
          weatherSignals={weatherSignals}
          layers={layers}
          mapView={mapView}
          selectedVenueId={selectedVenueId}
          selectedBaseCampId={selectedBaseCampId}
          featuredVenueId={featuredVenue?.id || null}
          todayMatches={todayMatches}
          nextMatchCountdown={featuredCountdown}
          onVenueClick={handleVenueClick}
          onBaseCampClick={handleBaseCampClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </main>

      <nav aria-label="Map header" className="map-overlay">
        <div className="map-overlay-title">
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{mapTitle}</div>
          <div className="map-overlay-subtitle">
            {mapSubtitle}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--color-border)', borderRadius: 999, overflow: 'hidden', background: 'rgba(15, 23, 42, 0.75)' }}>
            <button
              type="button"
              onClick={() => handleMapViewChange('venues')}
              className={mapView === 'venues' ? 'btn btn-primary' : 'btn'}
              style={{ borderRadius: 0, minHeight: 34 }}
            >
              Venues
            </button>
            <button
              type="button"
              onClick={() => handleMapViewChange('base-camps')}
              className={mapView === 'base-camps' ? 'btn btn-primary' : 'btn'}
              style={{ borderRadius: 0, minHeight: 34 }}
            >
              Base Camps
            </button>
          </div>
          <Link to="/admin" className="map-overlay-link">
            Admin →
          </Link>
        </div>
      </nav>

      <KpiOverlay stats={activeKpiStats} />

      <aside aria-label="Map layers and refresh controls" style={{ position: 'relative' }}>
        <LayerPanel
          layers={layers}
          onChange={setLayers}
          weatherMode={weatherMode}
          weatherStatus={weatherStatus}
          refreshSeconds={refreshSeconds}
          onRefreshSecondsChange={setRefreshSeconds}
          currentTimeLabel={currentTimeLabel}
          mapView={mapView}
        />
      </aside>

      <DetailDrawer
        tab={drawerTab}
        onTabChange={setDrawerTab}
        venues={hostVenues}
        baseCamps={baseCamps}
        incidents={incidents}
        matches={matches}
        alerts={alerts}
        weatherSignals={weatherSignals}
        selectedVenueId={selectedVenueId}
        selectedBaseCampId={selectedBaseCampId}
      />
    </div>
  )
}
