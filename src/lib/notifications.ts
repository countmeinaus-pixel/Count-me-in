import { supabase } from './supabase'

export type AppNotificationType = 'participant_left' | 'invite' | 'invite_accepted' | 'invite_declined' | 'activity_cancelled' | 'pr_confirmed' | 'pr_flagged' | 'pr_verified' | 'friend_request' | 'friend_accepted' | 'activity_approved' | 'activity_rejected' | 'sport_suggested' | 'role_changed' | 'profile_updated' | 'staff_message' | 'staff_message_reply'

export type AppNotification = {
  id: string
  type: AppNotificationType
  body: string
  message: string
  activityId: string | null
  actorId: string | null
  actorName: string | null
  actorPhotoUrl: string | null
  createdAt: string
  unread: boolean
}

// The notifications migration may not be applied yet: treat a missing table or function as "not available".
export function isMissingDatabaseFeature(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  return code === 'PGRST202' || code === 'PGRST205' || code === '42P01' || code === '42883'
}

export const databaseUpdateNeededMessage = 'This needs a database update before it works. Try again later.'

export async function getNotifications(): Promise<AppNotification[] | null> {
  if (!supabase) return null
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, body, message, activity_id, actor_id, read_at, created_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    if (isMissingDatabaseFeature(error)) return null
    throw error
  }

  const rows = data ?? []
  const actorIds = [...new Set(rows.flatMap((row) => (row.actor_id ? [row.actor_id] : [])))]
  const { data: actors, error: actorsError } = actorIds.length
    ? await supabase.from('profiles').select('id, first_name, photo_url').in('id', actorIds)
    : { data: [], error: null }
  if (actorsError) throw actorsError
  const actorById = new Map((actors ?? []).map((actor) => [actor.id, actor]))

  return rows.map((row) => ({
    id: row.id,
    type: row.type as AppNotificationType,
    body: row.body,
    message: row.message,
    activityId: row.activity_id,
    actorId: row.actor_id,
    actorName: row.actor_id ? actorById.get(row.actor_id)?.first_name ?? null : null,
    actorPhotoUrl: row.actor_id ? actorById.get(row.actor_id)?.photo_url ?? null : null,
    createdAt: row.created_at,
    unread: !row.read_at,
  }))
}

export async function markNotificationsRead(notificationId?: string) {
  if (!supabase) return
  const { error } = await supabase.rpc('mark_notifications_read', notificationId ? { target_notification_id: notificationId } : {})
  if (error && !isMissingDatabaseFeature(error)) throw error
}

export async function getUnreadNotificationCount() {
  const notifications = await getNotifications()
  return notifications?.filter((notification) => notification.unread).length ?? 0
}
