import { useEffect, useMemo, useRef, useState } from 'react'

const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY
const WEATHER_REFRESH_MS = 10 * 60 * 1000

function isFiniteCoordinate(value) {
  return value != null && value !== '' && Number.isFinite(Number(value))
}

export function hasValidLatLng(item) {
  return item && isFiniteCoordinate(item.lat) && isFiniteCoordinate(item.lng)
}

export function normalizeCondition(iconCode = '') {
  const code = iconCode.toString().toLowerCase()
  if (code.includes('thunder') || code.includes('storm')) return 'Storm'
  if (code.includes('rain') || code.includes('shower') || code.includes('drizzle')) return 'Rain'
  if (code.includes('snow') || code.includes('ice') || code.includes('flurr')) return 'Snow'
  if (code.includes('cloud') || code.includes('overcast') || code.includes('fog')) return 'Clouds'
  return 'Clear'
}

export function buildFallbackWeatherSignals(venues) {
  return venues
    .filter(hasValidLatLng)
    .map((venue, index) => {
      const conditions = ['Clear', 'Clouds', 'Rain', 'Storm']
      return {
        id: `weather-${venue.id}`,
        venueId: venue.id,
        name: venue.name,
        lat: Number(venue.lat),
        lng: Number(venue.lng),
        condition: conditions[index % conditions.length],
        temperatureF: 68 + (index % 7) * 3,
        windMph: 6 + (index % 6) * 2,
        source: 'Weather fallback simulation',
        isLive: false,
        phrase: conditions[index % conditions.length],
        timestamp: new Date().toISOString(),
        severity: conditions[index % conditions.length] === 'Storm' ? 'high' : conditions[index % conditions.length] === 'Rain' ? 'medium' : 'low',
        title: `${venue.name} weather update`,
        message: `${conditions[index % conditions.length]} conditions at ${venue.name}. ${68 + (index % 7) * 3}°F with winds ${6 + (index % 6) * 2} mph.`
      }
    })
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
  const fetchedAt = new Date().toISOString()
  const severity = condition === 'Storm' ? 'critical' : condition === 'Rain' ? 'medium' : condition === 'Clouds' ? 'low' : 'low'

  return {
    id: `weather-${venue.id}`,
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
    fetchedAt,
    timestamp: fetchedAt,
    severity,
    title: `${venue.name} weather update`,
    message: `${phrase} at ${venue.name}. ${temperatureF}°F with winds ${windMph} mph.`
  }
}

export function useVenueWeather(venues) {
  const validVenues = useMemo(() => venues.filter(hasValidLatLng), [venues])
  const fallbackWeatherSignals = useMemo(() => buildFallbackWeatherSignals(validVenues), [validVenues])
  const [weatherSignals, setWeatherSignals] = useState([])
  const [weatherMode, setWeatherMode] = useState('loading')
  const [weatherStatus, setWeatherStatus] = useState('Loading live venue weather…')
  const weatherAbortRef = useRef(null)
  const weatherRefreshRef = useRef(null)

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
        const merged = validVenues.map(venue => (
          live.find(item => item.venueId === venue.id)
          || fallbackWeatherSignals.find(item => item.venueId === venue.id)
        ))

        setWeatherSignals(merged.filter(Boolean))
        setWeatherMode(failedCount ? 'mixed' : 'live')
        setWeatherStatus(
          failedCount
            ? `Live weather loaded for ${live.length}/${validVenues.length} venues.`
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
  }, [validVenues, fallbackWeatherSignals])

  return {
    weatherSignals,
    weatherMode,
    weatherStatus,
    fallbackWeatherSignals,
    hasAzureMapsKey: Boolean(AZURE_MAPS_KEY)
  }
}
