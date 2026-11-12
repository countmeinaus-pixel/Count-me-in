import { suburbCoordinates } from './distance'
import { fixAustralianLatitude, type Coordinates } from './location'

// Six broad regions of greater Adelaide, used for the Places patches.
// Rough boundaries by latitude and longitude, so it also works for suburbs
// without their own entry: a pin or the suburb centre is enough.
export const adelaideRegions = ['City', 'North', 'West beaches', 'East & Hills', 'South coast', 'Fleurieu'] as const
export type AdelaideRegion = (typeof adelaideRegions)[number]

export function regionFor(point: Coordinates | null): AdelaideRegion | null {
  if (!point) return null
  const { latitude: lat, longitude: lng } = point
  // Order matters: each check only sees what the ones above did not claim.
  if (lat < -35.21) return 'Fleurieu' // Aldinga, Sellicks, McLaren Vale, Willunga, Victor Harbor
  if (lng < 138.535 && lat > -35.0) return 'West beaches' // Glenelg, Henley, Grange, Semaphore, Port Adelaide
  if (lat > -34.865) return 'North' // Mawson Lakes, Salisbury, Elizabeth, Gawler, Modbury
  if (lng > 138.66 || (lng > 138.6 && lat < -34.98)) return 'East & Hills' // Magill, Belair, Stirling, Hahndorf, Mount Barker
  if (lat < -34.98) return 'South coast' // Brighton, Hallett Cove, Christies, Port Noarlunga, Seaford
  return 'City' // Adelaide, Unley, Norwood, Prospect, Mitcham
}

// The place of an activity: its map pin if it has one, else the suburb centre.
export function activityRegion(activity: { suburb?: string | null; latitude?: number | null; longitude?: number | null }) {
  const latitude = fixAustralianLatitude(activity.latitude ?? null, activity.longitude ?? null)
  const point = latitude != null && activity.longitude != null
    ? { latitude, longitude: activity.longitude }
    : suburbCoordinates(activity.suburb ?? null)
  return regionFor(point)
}
