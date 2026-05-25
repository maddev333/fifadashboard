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

function compareMatchDates(a, b) {
  return new Date(a.date) - new Date(b.date)
}

function getMatchDateTime(match) {
  if (!match?.date) return null
  const rawTime = (match.timeLocal || '00:00').trim()
  const normalizedTime = /^\d{1,2}:\d{2}$/.test(rawTime) ? `${rawTime}:00` : rawTime
  const parsed = new Date(`${match.date}T${normalizedTime}`)
  return Number.isNaN(parsed.getTime()) ? new Date(`${match.date}T00:00:00`) : parsed
}

function getTimeRemainingParts(targetDate, now = new Date()) {
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

export default function MapPage() {
  const { data: venues } = useData('venues')
  const { data: incidents } = useData('incidents')
  const { data: matches } = useData('matches')
  const { data: staffing } = useData('staffing')
  const { alerts } = useAlerts()

  const [layers, setLayers] = useState({
    venues: true,
    incidents: true,
    traffic: false,
    weatherRadar: true,
    weatherMarkers: true,
  })
  const [countdownNow, setCountdownNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const validVenues = useMemo(() => venues.filter(hasValidLatLng), [venues])
  const validIncidents = useMemo(() => incidents.filter(hasValidLatLng), [incidents])

  const matchesByVenue = useMemo(() => {
    return matches.reduce((acc, match) => {
      acc[match.venueId] = [...(acc[match.venueId] || []), match].sort(compareMatchDates)
      return acc
    }, {})
  }, [matches])

  const fifaVenues = useMemo(() => (
    validVenues.map(venue => {
      const venueMatches = matchesByVenue[venue.id] || []
      const nextMatch = venueMatches.find(match => {
        const matchDateTime = getMatchDateTime(match)
        return matchDateTime && matchDateTime >= countdownNow
      }) || venueMatches[0] || null
      const nextMatchDateTime = getMatchDateTime(nextMatch)
      const countdownParts = getTimeRemainingParts(nextMatchDateTime, countdownNow)
      const countdownLabel = nextMatch
        ? formatCountdown(countdownParts)
        : 'No upcoming match'

      return {
        ...venue,
        matches: venueMatches,
        matchCount: venueMatches.length,
        hasMatch: venueMatches.length > 0,
        nextMatch,
        nextMatchDateTime,
        nextMatchCountdown: countdownLabel,
        nextMatchCountdownParts: countdownParts,
        hostLabel: `${venue.city}, ${venue.country}`,
        venueLabel: venueMatches.length > 0
          ? `${venueMatches.length} FIFA matches`
          : 'FIFA venue'
      }
    })
  ), [validVenues, matchesByVenue, countdownNow])

  const featuredVenue = useMemo(() => {
    return fifaVenues
      .filter(venue => venue.nextMatchDateTime)
      .sort((a, b) => a.nextMatchDateTime - b.nextMatchDateTime)[0] || fifaVenues[0] || null
  }, [fifaVenues])

  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [drawerTab, setDrawerTab] = useState(null)

  const { weatherSignals, weatherMode, weatherStatus } = useVenueWeather(fifaVenues)

  const handleVenueClick = useCallback((venueId) => {
    setSelectedVenueId(venueId)
    setDrawerTab('venue')
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedVenueId(null)
    if (drawerTab === 'venue') setDrawerTab(null)
  }, [drawerTab])

  const today = new Date().toISOString().split('T')[0]
  const todayMatches = useMemo(() => matches.filter(m => m.date === today), [matches, today])
  const activeVenues = [...new Set(todayMatches.map(m => m.venueId))].length
  const openIncidents = incidents.filter(i => i.status === 'open').length
  const openShifts = staffing.filter(s => s.status === 'open').length
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const totalHostedMatches = matches.length

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <LiveMap
          venues={fifaVenues}
          incidents={validIncidents}
          weatherSignals={weatherSignals}
          layers={layers}
          selectedVenueId={selectedVenueId}
          featuredVenueId={featuredVenue?.id || null}
          todayMatches={todayMatches}
          nextMatchCountdown={featuredVenue?.nextMatchCountdown || null}
          onVenueClick={handleVenueClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </div>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(15,23,42,0.8), transparent)'
      }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '0.1rem', color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>⚽ FIFA World Cup 2026 Venue Map</div>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
            {featuredVenue?.nextMatch
              ? `Next venue in focus: ${featuredVenue.name} • ${featuredVenue.nextMatch.homeTeam} vs ${featuredVenue.nextMatch.awayTeam} on ${featuredVenue.nextMatch.date} • Starts in ${featuredVenue.nextMatchCountdown}`
              : 'Viewing tournament host venues across the United States, Mexico, and Canada'}
          </div>
        </div>
        <Link
          to="/admin"
          style={{ pointerEvents: 'auto', color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}
        >
          Admin →
        </Link>
      </div>

      <KpiOverlay stats={[
        { label: 'Tournament Matches', value: totalHostedMatches, color: '#38bdf8' },
        { label: 'Next Match Countdown', value: featuredVenue?.nextMatchCountdown || 'N/A', color: '#fb923c' },
        { label: 'Matches Today', value: todayMatches.length, color: '#22c55e' },
        { label: 'Host Venues', value: fifaVenues.length, color: '#facc15' },
        { label: 'Open Incidents', value: openIncidents, color: '#ef4444' },
        { label: 'Critical Alerts', value: criticalAlerts, color: '#f59e0b' },
        { label: 'Open Shifts', value: openShifts, color: '#a855f7' },
        { label: 'Active Venues Today', value: activeVenues, color: '#14b8a6' },
      ]} />

      <LayerPanel
        layers={layers}
        onChange={setLayers}
        weatherMode={weatherMode}
        weatherStatus={weatherStatus}
      />

      <DetailDrawer
        tab={drawerTab}
        onTabChange={setDrawerTab}
        venues={fifaVenues}
        incidents={incidents}
        matches={matches}
        staffing={staffing}
        alerts={alerts}
        weatherSignals={weatherSignals}
        selectedVenueId={selectedVenueId}
      />
    </div>
  )
}
