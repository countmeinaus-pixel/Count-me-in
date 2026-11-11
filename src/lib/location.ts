export type Coordinates = { latitude: number; longitude: number }

// Accepts what Google Maps copies on right-click, e.g. "-34.9285, 138.6007".
export function parseCoordinates(value: string): Coordinates | null {
  const match = value.trim().match(/^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/)
  if (!match) return null
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
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

// Straight-line distance in kilometres (haversine formula).
export function distanceKm(from: Coordinates, to: Coordinates) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Asks the browser for the device position. Free, no API key.
export function requestDevicePosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED
        ? 'Location is blocked. Allow it in your browser or phone settings, then try again.'
        : 'Your location could not be found. Try again in a moment.')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  })
}
