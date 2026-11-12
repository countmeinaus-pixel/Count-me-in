import { supabase } from './supabase'

// Approve or reject an activity that waits for a moderator (Open activities,
// see migrations 20261112130000, 20261112150000 and 20261112160000).
// The list itself: getActivitiesWaitingForReview in activityParticipation.ts.

// suggestAsSport: also ask the admins to consider adding this sport to the list.
export async function reviewActivity(activityId: string, approve: boolean, message = '', suggestAsSport = false) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('review_activity', {
    target_activity_id: activityId,
    approve,
    review_message: message,
    suggest_as_sport: suggestAsSport,
  })
  // Before migration 20261112160000 the function has no suggest_as_sport input.
  if (error?.code === 'PGRST202') {
    const { error: oldError } = await supabase.rpc('review_activity', {
      target_activity_id: activityId,
      approve,
      review_message: message,
    })
    if (oldError) throw oldError
    return
  }
  if (error) throw error
}
