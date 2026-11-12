import { findLocality, nearestLocality, type AustralianState } from './localities'
import { fixAustralianLatitude } from './location'

// The state or territory an activity took place in, for the Places patches.
// Its map pin if it has one (nearest place), else its suburb ("Glenelg, SA").
export function activityState(activity: { suburb?: string | null; latitude?: number | null; longitude?: number | null }): AustralianState | null {
  const latitude = fixAustralianLatitude(activity.latitude ?? null, activity.longitude ?? null)
  if (latitude != null && activity.longitude != null) {
    const near = nearestLocality({ latitude, longitude: activity.longitude })
    if (near) return near.state
  }
  return findLocality(activity.suburb ?? null)?.state ?? null
}
