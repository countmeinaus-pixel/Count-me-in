import type { Coordinates } from './location'

// Every Australian suburb, town and locality with its centre point, from the open
// "Australian postcodes" dataset (Matthew Proctor, CC BY 4.0), in public/au-localities.json.
// Loaded once in the background; until then lookups return null (filters then show everything).
//
// Places are saved as "Name, STATE" (e.g. "Glenelg, SA") because many names exist in
// more than one state. Older entries without a state are read as South Australia,
// where the app started.

export const australianStates = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const
export type AustralianState = (typeof australianStates)[number]

export type Locality = { name: string; state: AustralianState; latitude: number; longitude: number; postcode: string }

type Row = [string, AustralianState, number, number, string]

const loadedEvent = 'count-me-in-localities-loaded'
let all: Locality[] = []
let byName = new Map<string, Locality[]>()
let loading: Promise<void> | null = null

export function localitiesLoaded() {
  return all.length > 0
}

export function loadLocalities() {
  loading ??= fetch('/au-localities.json')
    .then((response) => (response.ok ? response.json() : []))
    .then((rows: Row[]) => {
      all = rows.map(([name, state, latitude, longitude, postcode]) => ({ name, state, latitude, longitude, postcode }))
      byName = new Map()
      for (const place of all) {
        const key = place.name.toLowerCase()
        byName.set(key, [...(byName.get(key) ?? []), place])
      }
      window.dispatchEvent(new Event(loadedEvent))
    })
    .catch(() => {
      loading = null // try again next time
    })
  return loading
}

export function onLocalitiesLoaded(callback: () => void) {
  window.addEventListener(loadedEvent, callback)
  return () => window.removeEventListener(loadedEvent, callback)
}

export function formatLocality(place: Pick<Locality, 'name' | 'state'>) {
  return `${place.name}, ${place.state}`
}

// "Glenelg, SA" or "Glenelg SA" or just "Glenelg" (then South Australia first).
export function findLocality(text: string | null | undefined): Locality | null {
  if (!text || all.length === 0) return null
  const match = text.trim().match(/^(.*?)[,\s]+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)$/i)
  const name = (match ? match[1] : text).trim().toLowerCase()
  const state = match?.[2].toUpperCase()
  const candidates = byName.get(name) ?? []
  if (state) return candidates.find((place) => place.state === state) ?? null
  return candidates.find((place) => place.state === 'SA') ?? candidates[0] ?? null
}

// Suggestions while typing: names that start with the text (shortest first), then names that contain it.
export function searchLocalities(query: string, limit = 8): Locality[] {
  const text = query.trim().toLowerCase().replace(/,.*$/, '')
  if (text.length < 2 || all.length === 0) return []
  const starts: Locality[] = []
  const contains: Locality[] = []
  for (const place of all) {
    const name = place.name.toLowerCase()
    if (name.startsWith(text)) starts.push(place)
    else if (contains.length < limit && name.includes(text)) contains.push(place)
  }
  // Shortest names first, so "rich" shows Richmond before Rich Avon East.
  starts.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name) || a.state.localeCompare(b.state))
  return [...starts, ...contains].slice(0, limit)
}

// The closest named place to a point (e.g. the device location), and its state.
export function nearestLocality(point: Coordinates): Locality | null {
  let best: Locality | null = null
  let bestScore = Infinity
  const cos = Math.cos((point.latitude * Math.PI) / 180)
  for (const place of all) {
    const dLat = place.latitude - point.latitude
    const dLng = (place.longitude - point.longitude) * cos
    const score = dLat * dLat + dLng * dLng
    if (score < bestScore) {
      best = place
      bestScore = score
    }
  }
  return best
}
