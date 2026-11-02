import { getDefaultActivityHero } from '../data/mockData'
import { supabase } from './supabase'

export type SavedActivityDetails = {
  id: string
  sport: string
  title: string
  startsAt: string
  durationMinutes: number
  meetingPoint: string
  suburb: string
  spotsTotal: number
  level: string
  notes: string
  autoAccept: boolean
  sportDetails: Record<string, string>
  hero: string
  host: string
  hostAge: number | null
  hostPhoto: string | null
  hostVerified: boolean
  viewerIsHost: boolean
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

  const [sportResult, hostResult] = await Promise.all([
    supabase.from('sports').select('name').eq('id', activity.sport_id).single(),
    supabase.from('profiles').select('first_name, age, photo_url, selfie_verified').eq('id', activity.host_id).single(),
  ])

  if (sportResult.error) throw sportResult.error
  if (hostResult.error) throw hostResult.error

  const details = activity.sport_details
  const sportDetails = typeof details === 'object' && details !== null && !Array.isArray(details)
    ? Object.fromEntries(
        Object.entries(details).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {}
  const { data: viewerData, error: viewerError } = await supabase.auth.getUser()
  if (viewerError && viewerError.name !== 'AuthSessionMissingError') throw viewerError

  return {
    id: activity.id,
    sport: sportResult.data.name,
    title: activity.title,
    startsAt: activity.starts_at,
    durationMinutes: activity.duration_minutes,
    meetingPoint: activity.meeting_point,
    suburb: activity.suburb,
    spotsTotal: activity.spots_total,
    level: activity.level_wanted,
    notes: activity.notes,
    autoAccept: activity.auto_accept,
    sportDetails,
    hero: activity.cover_image_url ?? getDefaultActivityHero(sportResult.data.name),
    host: hostResult.data.first_name,
    hostAge: hostResult.data.age,
    hostPhoto: hostResult.data.photo_url,
    hostVerified: hostResult.data.selfie_verified,
    viewerIsHost: viewerData.user?.id === activity.host_id,
  }
}
