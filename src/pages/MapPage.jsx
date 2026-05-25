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

  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [drawerTab, setDrawerTab] = useState(null)

  const validVenues = useMemo(() => venues.filter(hasValidLatLng), [venues])
  const validIncidents = useMemo(() => incidents.filter(hasValidLatLng), [incidents])

  const { weatherSignals, weatherMode, weatherStatus } = useVenueWeather(validVenues)

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', overflow: 'hidden' }}>
      {/* Map fills the background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <LiveMap
          venues={validVenues}
          incidents={validIncidents}
          weatherSignals={weatherSignals}
          layers={layers}
          selectedVenueId={selectedVenueId}
          onVenueClick={handleVenueClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </div>

      {/* Minimal floating header */}
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
        <div style={{ pointerEvents: 'auto', fontWeight: 700, fontSize: '1.1rem', color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          ⚽ World Cup Ops
        </div>
        <Link
          to="/admin"
          style={{ pointerEvents: 'auto', color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}
        >
          Admin →
        </Link>
      </div>

      <KpiOverlay stats={[
        { label: 'Matches Today', value: todayMatches.length, color: '#38bdf8' },
        { label: 'Active Venues', value: activeVenues, color: '#22c55e' },
        { label: 'Open Incidents', value: openIncidents, color: '#ef4444' },
        { label: 'Critical Alerts', value: criticalAlerts, color: '#f59e0b' },
        { label: 'Open Shifts', value: openShifts, color: '#a855f7' },
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
        selectedVenueId={selectedVenueId}
      />
    </div>
  )
}
