import type { Coordinates } from '../lib/location'

// Approximate centre of each suburb, used for the distance filter.
// Free and offline: no maps API. Suburbs not listed here are never hidden.
const coordinates: Record<string, [number, number]> = {
  'adelaide': [-34.9285, 138.6007],
  'north adelaide': [-34.9065, 138.593],
  'south adelaide': [-34.94, 138.6],
  'glenelg': [-34.98, 138.515],
  'west beach': [-34.945, 138.509],
  'henley beach': [-34.92, 138.494],
  'grange': [-34.902, 138.49],
  'semaphore': [-34.839, 138.482],
  'largs bay': [-34.823, 138.487],
  'port adelaide': [-34.846, 138.503],
  'prospect': [-34.883, 138.595],
  'mawson lakes': [-34.815, 138.61],
  'modbury': [-34.833, 138.683],
  'norwood': [-34.921, 138.63],
  'unley': [-34.95, 138.607],
  'waterfall gully': [-34.968, 138.68],
  'stirling': [-35.004, 138.718],
  'mount barker': [-35.067, 138.859],
  'blackwood': [-35.021, 138.614],
  'marion': [-35.01, 138.556],
  'brighton': [-35.018, 138.523],
  'seacliff': [-35.034, 138.521],
  'hallett cove': [-35.079, 138.513],
  'happy valley': [-35.083, 138.56],
  'morphett vale': [-35.127, 138.522],
  'christies beach': [-35.138, 138.472],
  'noarlunga': [-35.139, 138.496],
  'port noarlunga': [-35.149, 138.47],
  'port noarlunga south': [-35.164, 138.473],
  'old noarlunga': [-35.182, 138.504],
  'seaford': [-35.189, 138.475],
  'moana': [-35.2, 138.474],
  'port willunga': [-35.262, 138.464],
  'willunga': [-35.272, 138.555],
  'aldinga': [-35.279, 138.457],
  'aldinga beach': [-35.278, 138.458],
  'normanville': [-35.446, 138.316],
  'victor harbor': [-35.552, 138.618],
  'goolwa': [-35.501, 138.782],
}

export function getSuburbCoordinates(suburb: string | undefined | null): Coordinates | null {
  const match = suburb ? coordinates[suburb.trim().toLowerCase()] : undefined
  return match ? { latitude: match[0], longitude: match[1] } : null
}
