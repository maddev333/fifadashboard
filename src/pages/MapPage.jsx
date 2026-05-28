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
  const refreshMs = refreshSeconds * 1000
  const { data: venues } = useData('venues', refreshMs)
  const { data: incidents } = useData('incidents', refreshMs)
  const { data: matches } = useData('matches', refreshMs)
  const { data: baseCamps } = useData('basecamps', refreshMs)
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
          : 'Host venue'
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
  const [drawerTab, setDrawerTab] = useState(null)

  const { weatherSignals, weatherMode, weatherStatus } = useVenueWeather(validVenues, refreshMs)

  const handleVenueClick = useCallback((venueId) => {
    setSelectedVenueId(venueId)
    setDrawerTab('venue')
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedVenueId(null)
    if (drawerTab === 'venue') setDrawerTab(null)
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
  const kpiStats = useMemo(() => [
    { label: 'Tournament Matches', value: totalHostedMatches, color: KPI_COLOR_INFO },
    { label: 'Next Match Countdown', value: featuredCountdown, color: KPI_COLOR_ATTENTION },
    { label: 'Matches Today', value: todayMatches.length, color: KPI_COLOR_SUCCESS },
    { label: 'Host Venues', value: hostVenues.length, color: KPI_COLOR_CAUTION },
    { label: 'Base Camps', value: baseCamps.length, color: 'var(--color-purple-500)' },
    { label: 'Open Incidents', value: openIncidents, color: KPI_COLOR_DANGER },
    { label: 'Critical Alerts', value: criticalAlerts, color: KPI_COLOR_WARNING },
    { label: 'Active Venues Today', value: activeVenues, color: KPI_COLOR_ACTIVE },
  ], [totalHostedMatches, featuredCountdown, todayMatches.length, hostVenues.length, baseCamps.length,
      openIncidents, criticalAlerts, activeVenues])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-bg)', overflow: 'hidden' }}>
      <main aria-label="Live venue map" style={{ position: 'absolute', inset: 0 }}>
        <LiveMap
          venues={venuesWithCountdown}
          incidents={validIncidents}
          baseCamps={baseCamps}
          weatherSignals={weatherSignals}
          layers={layers}
          selectedVenueId={selectedVenueId}
          featuredVenueId={featuredVenue?.id || null}
          todayMatches={todayMatches}
          nextMatchCountdown={featuredCountdown}
          onVenueClick={handleVenueClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </main>

      <nav aria-label="Map header" className="map-overlay">
        <div className="map-overlay-title">
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>⚽ World Cup 2026 Venue Map</div>
          <div className="map-overlay-subtitle">
            {featuredVenue?.nextMatch
              ? `Next: ${featuredVenue.name} • ${featuredVenue.nextMatch.homeTeam} vs ${featuredVenue.nextMatch.awayTeam} on ${featuredVenue.nextMatch.date} ET • ${featuredCountdown}`
              : 'Viewing tournament host venues across the United States, Mexico, and Canada'}
          </div>
        </div>
        <Link to="/admin" className="map-overlay-link">
          Admin →
        </Link>
      </nav>

      <KpiOverlay stats={kpiStats} />

      <aside aria-label="Map layers and refresh controls" style={{ position: 'relative' }}>
        <LayerPanel
          layers={layers}
          onChange={setLayers}
          weatherMode={weatherMode}
          weatherStatus={weatherStatus}
          refreshSeconds={refreshSeconds}
          onRefreshSecondsChange={setRefreshSeconds}
          currentTimeLabel={currentTimeLabel}
        />
      </aside>

      <DetailDrawer
        tab={drawerTab}
        onTabChange={setDrawerTab}
        venues={hostVenues}
        incidents={incidents}
        matches={matches}
        alerts={alerts}
        weatherSignals={weatherSignals}
        selectedVenueId={selectedVenueId}
      />
    </div>
  )
}
