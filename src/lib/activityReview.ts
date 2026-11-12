import { supabase } from './supabase'

// Activities with a new sport that wait for a moderator (see migration
// 20261112130000_sport_suggestions.sql). Staff only: RLS shows pending
// activities to the host and to moderators and admins.

export type ActivityToReview = {
  id: string
  title: string
  suggestedSport: string
  startsAt: string
  meetingPoint: string
  suburb: string
  notes: string
  hostId: string
  hostName: string
  createdAt: string
}

export async function getActivitiesToReview(): Promise<ActivityToReview[]> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase
    .from('activities')
    .select('id, title, starts_at, meeting_point, suburb, notes, sport_details, host_id, created_at')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = data ?? []
  const hostIds = [...new Set(rows.map((row) => row.host_id as string))]
  const { data: hosts, error: hostError } = hostIds.length
    ? await supabase.from('profiles').select('id, first_name').in('id', hostIds)
    : { data: [], error: null }
  if (hostError) throw hostError
  const hostNames = new Map((hosts ?? []).map((host) => [host.id as string, host.first_name as string]))

  return rows.map((row) => {
    const details = (row.sport_details ?? {}) as Record<string, unknown>
    return {
      id: row.id,
      title: row.title,
      suggestedSport: typeof details.suggested_sport === 'string' ? details.suggested_sport : 'Unknown sport',
      startsAt: row.starts_at,
      meetingPoint: row.meeting_point,
      suburb: row.suburb,
      notes: row.notes ?? '',
      hostId: row.host_id,
      hostName: hostNames.get(row.host_id) ?? 'A member',
      createdAt: row.created_at,
    }
  })
}

export async function reviewActivity(activityId: string, approve: boolean, message = '') {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('review_activity', {
    target_activity_id: activityId,
    approve,
    review_message: message,
  })
  if (error) throw error
}
