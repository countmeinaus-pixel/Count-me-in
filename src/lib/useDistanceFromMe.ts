import { useCallback } from 'react'
import { distanceKm, memberCoordinates, suburbCoordinates, useLocationPreference } from './distance'
import { useViewerProfile } from './viewerProfile'

// Distance from you to another member, for "3 km away" on cards and profiles.
// "You" is: your current location (when you chose Use my current location), else
// your shared approximate location, else the centre of your own suburb.
// A searched area (e.g. Perth) is not used: that is where you look, not where you are.
export function useDistanceFromMe() {
  const preference = useLocationPreference()
  const viewer = useViewerProfile()
  const profile = viewer.status === 'ready' ? viewer.profile : null

  return useCallback(
    (member: { id?: string | null; suburb: string; sharedLocation?: { latitude: number; longitude: number } | null }) => {
      if (!profile || member.id === profile.id) return null
      const origin = preference?.mode === 'current'
        ? preference
        : profile.sharedLocation ?? suburbCoordinates(profile.suburb)
      const point = memberCoordinates(member)
      if (!origin || !point) return null
      return distanceKm(origin, point)
    },
    [preference, profile],
  )
}

export function formatDistance(km: number | null) {
  if (km === null) return ''
  if (km < 1) return 'under 1 km away'
  if (km < 10) return `${km.toFixed(1).replace(/\.0$/, '')} km away`
  return `${Math.round(km)} km away`
}
