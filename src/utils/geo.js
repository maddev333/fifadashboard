export function isFiniteCoordinate(value) {
  return value != null && value !== '' && Number.isFinite(Number(value))
}

export function hasValidLatLng(item) {
  return item && isFiniteCoordinate(item.lat) && isFiniteCoordinate(item.lng)
}

export function toCoordinatePair(item) {
  return [Number(item.lng), Number(item.lat)]
}

export function getDistanceInMeters(a, b) {
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
