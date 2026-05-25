import { useCallback, useMemo, useState } from 'react'
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
      const nextMatch = venueMatches.find(match => new Date(match.date) >= new Date(new Date().toISOString().split('T')[0])) || venueMatches[0] || null
      return {
        ...venue,
        matches: venueMatches,
        matchCount: venueMatches.length,
        hasMatch: venueMatches.length > 0,
        nextMatch,
        hostLabel: `${venue.city}, ${venue.country}`,
        venueLabel: venueMatches.length > 0
          ? `${venueMatches.length} FIFA matches`
          : 'FIFA venue'
      }
    })
  ), [validVenues, matchesByVenue])

  const featuredVenue = useMemo(() => {
    return fifaVenues
      .filter(venue => venue.nextMatch)
      .sort((a, b) => compareMatchDates(a.nextMatch, b.nextMatch))[0] || fifaVenues[0] || null
  }, [fifaVenues])

  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [drawerTab, setDrawerTab] = useState(null)

  const effectiveSelectedVenueId = selectedVenueId || featuredVenue?.id || null

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
  const todayMatches = matches.filter(m => m.date === today)
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
          selectedVenueId={effectiveSelectedVenueId}
          featuredVenueId={featuredVenue?.id || null}
          todayMatches={todayMatches}
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
              ? `Next venue in focus: ${featuredVenue.name} • ${featuredVenue.nextMatch.homeTeam} vs ${featuredVenue.nextMatch.awayTeam} on ${featuredVenue.nextMatch.date}`
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
        venues={venues}
        incidents={incidents}
        matches={matches}
        staffing={staffing}
        alerts={alerts}
        weatherSignals={weatherSignals}
        selectedVenueId={effectiveSelectedVenueId}
      />
    </div>
  )
}
