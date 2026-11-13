import type { Coordinates } from './location'
import { findLocality, formatLocality, loadLocalities, nearestLocality, type AustralianState } from './localities'

// Turns a map pin into a street address and suburb.
// Address: OpenStreetMap's free Nominatim service (no key, no cost; fair use
// is about one lookup per second, far more than a person picking pins needs).
// Suburb: our own list of Australian places, so it is always "Name, STATE".

type NominatimAddress = {
  house_number?: string
  road?: string
  pedestrian?: string
  footway?: string
  path?: string
  suburb?: string
  town?: string
  village?: string
  city?: string
  hamlet?: string
  'ISO3166-2-lvl4'?: string
}

export type PinPlace = { address: string; suburb: string }

export async function placeForPin(point: Coordinates): Promise<PinPlace> {
  await loadLocalities()
  let address = ''
  let suburb = ''

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${point.latitude}&lon=${point.longitude}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (response.ok) {
      const data = (await response.json()) as { address?: NominatimAddress }
      const parts = data.address ?? {}
      const street = parts.road ?? parts.pedestrian ?? parts.footway ?? parts.path ?? ''
      address = [parts.house_number, street].filter(Boolean).join(' ')
      const state = parts['ISO3166-2-lvl4']?.replace('AU-', '') as AustralianState | undefined
      const placeName = parts.suburb ?? parts.town ?? parts.village ?? parts.hamlet ?? parts.city
      const match = placeName && state ? findLocality(`${placeName}, ${state}`) : null
      if (match) suburb = formatLocality(match)
    }
  } catch {
    // Offline or the service is busy: fall back to the nearest place below.
  }

  if (!suburb) {
    const nearest = nearestLocality(point)
    if (nearest) suburb = formatLocality(nearest)
  }
  return { address, suburb }
}
