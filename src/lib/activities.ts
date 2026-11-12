import { getDefaultActivityHero } from '../data/mockData'
import { isMissingLocationColumns } from './location'
import { supabase } from './supabase'

export type SavedActivityDetails = {
  id: string
  // New-sport activities wait for a moderator ('pending') before others can see them.
  reviewStatus: 'pending' | 'approved' | 'rejected'
  suggestedSport: string | null
  sport: string
  title: string
  startsAt: string
  durationMinutes: number
  meetingPoint: string
  suburb: string
  address: string
  latitude: number | null
  longitude: number | null
  spotsTotal: number
  level: string
  notes: string
  autoAccept: boolean
  sportDetails: Record<string, string>
  hero: string
  coverImageUrl: string | null
  host: string
  hostAge: number | null
  hostId: string
  hostPhoto: string | null
  hostVerified: boolean
  viewerIsHost: boolean
  viewerCanEdit: boolean
}

export async function getSavedActivity(id: string): Promise<SavedActivityDetails | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('id, host_id, sport_id, title, starts_at, duration_minutes, meeting_point, suburb, spots_total, level_wanted, notes, auto_accept, sport_details, cover_image_url')
    .eq('id', id)
    .maybeSingle()

  if (activityError) throw activityError
  if (!activity) return null

  const [sportResult, hostResult, locationResult, reviewResult] = await Promise.all([
    supabase.from('sports').select('name').eq('id', activity.sport_id).single(),
    supabase.from('profiles').select('first_name, age, photo_url, selfie_verified').eq('id', activity.host_id).single(),
    // Separate query so the screen still works before the location columns exist.
    supabase.from('activities').select('address, latitude, longitude').eq('id', id).maybeSingle(),
    // Separate too: works before the sport suggestions update is run.
    supabase.from('activities').select('review_status').eq('id', id).maybeSingle(),
  ])
  const reviewValue = reviewResult.error ? 'approved' : reviewResult.data?.review_status
  const reviewStatus: SavedActivityDetails['reviewStatus'] =
    reviewValue === 'pending' || reviewValue === 'rejected' ? reviewValue : 'approved'

  if (sportResult.error) throw sportResult.error
  if (hostResult.error) throw hostResult.error
  if (locationResult.error && !isMissingLocationColumns(locationResult.error)) throw locationResult.error
  const location = locationResult.error ? null : locationResult.data

  const details = activity.sport_details
  const sportDetails = typeof details === 'object' && details !== null && !Array.isArray(details)
    ? Object.fromEntries(
        Object.entries(details).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {}
  const { data: viewerData, error: viewerError } = await supabase.auth.getUser()
  if (viewerError && viewerError.name !== 'AuthSessionMissingError') throw viewerError
  const viewerId = viewerData.user?.id ?? null
  const viewerRoleResult = viewerId
    ? await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', viewerId)
        .maybeSingle()
    : { data: null, error: null }
  if (viewerRoleResult.error) throw viewerRoleResult.error
  if (
    viewerRoleResult.data &&
    viewerRoleResult.data.role !== 'user' &&
    viewerRoleResult.data.role !== 'moderator' &&
    viewerRoleResult.data.role !== 'admin'
  ) {
    throw new Error('Your account has an invalid moderation role.')
  }

  return {
    id: activity.id,
    reviewStatus,
    suggestedSport: typeof sportDetails.suggested_sport === 'string' ? sportDetails.suggested_sport : null,
    sport: sportResult.data.name,
    title: activity.title,
    startsAt: activity.starts_at,
    durationMinutes: activity.duration_minutes,
    meetingPoint: activity.meeting_point,
    suburb: activity.suburb,
    address: location?.address ?? '',
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    spotsTotal: activity.spots_total,
    level: activity.level_wanted,
    notes: activity.notes,
    autoAccept: activity.auto_accept,
    sportDetails,
    hero: activity.cover_image_url ?? getDefaultActivityHero(sportResult.data.name),
    coverImageUrl: activity.cover_image_url,
    host: hostResult.data.first_name,
    hostAge: hostResult.data.age,
    hostId: activity.host_id,
    hostPhoto: hostResult.data.photo_url,
    hostVerified: hostResult.data.selfie_verified,
    viewerIsHost: viewerId === activity.host_id,
    viewerCanEdit:
      viewerId === activity.host_id || viewerRoleResult.data?.role === 'admin',
  }
}
