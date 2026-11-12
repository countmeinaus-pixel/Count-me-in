export type Coordinates = { latitude: number; longitude: number }

// Accepts what Google Maps copies on right-click, e.g. "-34.9285, 138.6007".
export function parseCoordinates(value: string): Coordinates | null {
  const match = value.trim().match(/^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/)
  if (!match) return null
  let latitude = Number(match[1])
  const longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  // Australia is south of the equator: a positive latitude with an Australian
  // longitude is a missing minus sign (35.16, 138.47 means -35.16, 138.47).
  if (latitude > 0 && longitude >= 112 && longitude <= 154) latitude = -latitude
  return { latitude, longitude }
}

// Pins saved before the check above may miss the minus: fix them when reading.
export function fixAustralianLatitude(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) return latitude
  return latitude > 0 && longitude >= 112 && longitude <= 154 ? -latitude : latitude
}

// Roughly South Australia. Pins outside it are almost always a typo.
export function isInSouthAustralia(point: Coordinates) {
  return point.latitude >= -38.6 && point.latitude <= -25.9 && point.longitude >= 128.9 && point.longitude <= 141.1
}

// A map pin that is usable for an activity: valid numbers, inside South Australia.
export function parseMapPin(value: string): Coordinates | null {
  const point = parseCoordinates(value)
  return point && isInSouthAustralia(point) ? point : null
}

export function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return ''
  return `${Number(latitude.toFixed(6))}, ${Number(longitude.toFixed(6))}`
}

// Plain Google Maps link: free, no API key needed.
export function getDirectionsUrl(place: {
  meetingPoint: string
  address?: string
  suburb: string
  latitude?: number | null
  longitude?: number | null
}) {
  const query = place.latitude != null && place.longitude != null
    ? `${place.latitude},${place.longitude}`
    : [place.meetingPoint, place.address, place.suburb, 'SA'].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export const locationNotSavedMessage =
  'Saved, but the address and map pin were not: the database needs an update first. Add them again with Edit activity once that is done.'

// True when the location columns are not in the database yet.
export function isMissingLocationColumns(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  return code === 'PGRST204' || code === '42703'
}

