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

// Full precision: activity pins are never rounded.
export function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return ''
  return `${latitude}, ${longitude}`
}

// The device's exact position for a map pin (GPS when available), at full precision.
// Free: the browser or phone does this itself, after the member allows it.
export function getPrecisePosition(): Promise<Coordinates & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This device cannot share its location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? 'Location is turned off for this app. Allow it in your browser or phone settings, or pick the spot on the map.'
          : 'Your location could not be found. Try again or pick the spot on the map.',
      )),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    )
  })
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

