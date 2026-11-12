import { useEffect, useState } from 'react'
import { suburbCentres } from '../data/adelaideSuburbs'
import { findLocality, formatLocality, loadLocalities, nearestLocality, onLocalitiesLoaded } from './localities'
import type { Coordinates } from './location'

// Straight-line distance in km between two points (haversine).
export function distanceKm(from: Coordinates, to: Coordinates) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(to.latitude - from.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// The centre of any Australian place ("Glenelg, SA", "Alice Springs, NT", ...).
// Until the full list has loaded, the built-in list of Adelaide suburbs is used.
export function suburbCoordinates(suburb: string | null | undefined): Coordinates | null {
  if (!suburb) return null
  const place = findLocality(suburb)
  if (place) return { latitude: place.latitude, longitude: place.longitude }
  const plain = suburb.trim().replace(/,?\s*SA$/i, '').toLowerCase()
  const key = Object.keys(suburbCentres).find((name) => name.toLowerCase() === plain)
  return key ? suburbCentres[key] : null
}

// The name of the closest place, e.g. for "Near Bondi Beach, NSW".
export function nearestSuburb(point: Coordinates) {
  const place = nearestLocality(point)
  if (place) return formatLocality(place)
  let best = 'Australia'
  let bestKm = Infinity
  for (const [name, centre] of Object.entries(suburbCentres)) {
    const km = distanceKm(point, centre)
    if (km < bestKm) {
      best = name
      bestKm = km
    }
  }
  return best
}

export function formatKm(km: number) {
  return km < 1 ? '<1 km' : `${Math.round(km)} km`
}

// Rounded to 2 decimals (about 1 km) before it is ever stored or shared.
export function roundCoordinates(point: Coordinates): Coordinates {
  return { latitude: Math.round(point.latitude * 100) / 100, longitude: Math.round(point.longitude * 100) / 100 }
}

export function getDeviceLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This device cannot share its location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? 'Location is turned off for this app. Allow it in your browser or phone settings, or pick a suburb.'
          : 'Your location could not be found. Try again or pick a suburb.',
      )),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

// Where you want to look: your device location or a suburb, plus a radius.
// Stored per device; nothing exact leaves the phone.
export type LocationPreference = {
  mode: 'current' | 'suburb'
  label: string
  latitude: number
  longitude: number
  radiusKm: number | null // null = no limit
}

const storageKey = 'count-me-in-location-v1'
const changedEvent = 'count-me-in-location-changed'
export const defaultRadiusKm = 25
const anywhereValue = 'anywhere'

// True once a location (or "Anywhere") was chosen on this device.
function hasChosenLocation() {
  try {
    return window.localStorage.getItem(storageKey) !== null
  } catch {
    return memoryPreference !== undefined
  }
}

// First visit on this device: start around your own suburb (25 km) instead of all of
// Australia, so someone in Sydney does not first see Perth. Any later choice wins.
export async function applyHomeSuburbDefault(suburb: string | null | undefined) {
  if (!suburb?.trim() || hasChosenLocation()) return
  await loadLocalities()
  if (hasChosenLocation()) return
  const place = findLocality(suburb)
  if (!place) return
  setLocationPreference({
    mode: 'suburb',
    label: formatLocality(place),
    latitude: place.latitude,
    longitude: place.longitude,
    radiusKm: defaultRadiusKm,
  })
}

export function getLocationPreference(): LocationPreference | null {
  try {
    const value = window.localStorage.getItem(storageKey)
    if (!value || value === anywhereValue) return null
    const parsed = JSON.parse(value) as LocationPreference
    return typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' ? parsed : null
  } catch {
    return null
  }
}

export function setLocationPreference(preference: LocationPreference | null) {
  try {
    // "Anywhere" is remembered too, so it is not replaced by your home suburb later.
    window.localStorage.setItem(storageKey, preference ? JSON.stringify(preference) : anywhereValue)
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  memoryPreference = preference
  window.dispatchEvent(new Event(changedEvent))
}

let memoryPreference: LocationPreference | null | undefined

export function useLocationPreference() {
  const [preference, setPreference] = useState<LocationPreference | null>(() => memoryPreference ?? getLocationPreference())
  useEffect(() => {
    const update = () => setPreference(memoryPreference !== undefined ? memoryPreference : getLocationPreference())
    window.addEventListener(changedEvent, update)
    // When the list of Australian places arrives, hand out a fresh object so
    // distance filters that depend on it recalculate.
    const stopLocalities = onLocalitiesLoaded(() => setPreference((current) => (current ? { ...current } : current)))
    return () => {
      window.removeEventListener(changedEvent, update)
      stopLocalities()
    }
  }, [])
  return preference
}

// A member's position: his shared approximate location, else his suburb centre.
export function memberCoordinates(member: { suburb: string; sharedLocation?: Coordinates | null }) {
  return member.sharedLocation ?? suburbCoordinates(member.suburb)
}

// True when the point is within the chosen radius (or when it cannot be placed).
export function isWithinRadius(preference: LocationPreference | null, point: Coordinates | null) {
  if (!preference || preference.radiusKm === null || !point) return true
  return distanceKm(preference, point) <= preference.radiusKm
}
