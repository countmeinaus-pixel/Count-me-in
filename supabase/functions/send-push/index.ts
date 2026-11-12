// Sends Web Push notifications. Supabase Database Webhooks call this function
// when a row is inserted into notifications, activity_chat_messages or
// activity_join_requests. Free on the Supabase free plan.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com)
//   WEBHOOK_SECRET (any long random text, also set as a header on the webhooks)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type Row = Record<string, unknown>
type WebhookPayload = { type: string; table: string; record: Row | null }
type Message = { title: string; body: string; url: string; tag: string }
type PreferenceKey = 'joinRequests' | 'chatMessages' | 'activityInMySports'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const notificationTitles: Record<string, string> = {
  participant_left: 'Someone can’t make it',
  invite: 'You’re invited',
  invite_accepted: 'Invite accepted',
  invite_declined: 'Invite declined',
  activity_cancelled: 'Activity cancelled',
  activity_approved: 'Activity approved',
  activity_rejected: 'Activity not approved',
  friend_request: 'New friend request',
  friend_accepted: 'Friend request accepted',
  pr_confirmed: 'Your PR was confirmed',
  pr_flagged: 'Your PR was flagged',
  pr_verified: 'Your PR is verified',
  role_changed: 'Your role changed',
  sport_suggested: 'New sport suggested',
}

function shorten(text: string, length = 140) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

async function firstName(userId: unknown) {
  if (typeof userId !== 'string') return 'Someone'
  const { data } = await supabase.from('profiles').select('first_name').eq('id', userId).maybeSingle()
  return (data?.first_name as string | undefined) ?? 'Someone'
}

async function activityTitle(activityId: unknown) {
  if (typeof activityId !== 'string') return null
  const { data } = await supabase.from('activities').select('title, host_id').eq('id', activityId).maybeSingle()
  return data as { title: string; host_id: string } | null
}

function notificationUrl(row: Row) {
  const type = String(row.type)
  if (type.startsWith('friend_')) return '/notifications'
  if (type.startsWith('pr_')) return '/profile/records'
  if (row.activity_id) return `/activity/${row.activity_id}`
  return '/notifications'
}

async function sendTo(userIds: string[], message: Message, preference?: PreferenceKey) {
  if (userIds.length === 0) return 0
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, preferences')
    .in('user_id', userIds)
  if (error) throw error

  let sent = 0
  await Promise.all((subscriptions ?? []).map(async (subscription) => {
    const preferences = (subscription.preferences ?? {}) as Partial<Record<PreferenceKey, boolean>>
    if (preference && preferences[preference] === false) return
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(message),
        { TTL: 60 * 60 * 24 },
      )
      sent += 1
    } catch (pushError) {
      const status = (pushError as { statusCode?: number }).statusCode
      // The phone unsubscribed or the app was removed: forget this device.
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
      } else {
        console.error('Push failed', status, pushError)
      }
    }
  }))
  return sent
}

async function handleNotification(row: Row) {
  const actor = row.actor_id ? await firstName(row.actor_id) : null
  const title = notificationTitles[String(row.type)] ?? 'Count Me In'
  const body = shorten(String(row.body ?? (actor ? `${actor} sent you an update` : 'You have a new update')))
  return sendTo([String(row.user_id)], { title, body, url: notificationUrl(row), tag: `notification-${row.id}` })
}

async function handleChatMessage(row: Row) {
  if (row.message_type !== 'message') return 0
  const { data: thread } = await supabase.from('activity_chat_threads').select('title').eq('id', row.thread_id).maybeSingle()
  const { data: members } = await supabase
    .from('activity_chat_members')
    .select('user_id')
    .eq('thread_id', row.thread_id)
    .eq('status', 'accepted')
  const recipients = (members ?? []).map((member) => member.user_id as string).filter((id) => id !== row.sender_id)
  const sender = await firstName(row.sender_id)
  return sendTo(recipients, {
    title: thread?.title ? String(thread.title) : 'New message',
    body: shorten(`${sender}: ${String(row.body ?? '')}`),
    url: `/chats/${row.thread_id}`,
    tag: `chat-${row.thread_id}`,
  }, 'chatMessages')
}

async function handleJoinRequest(row: Row) {
  if (row.status !== 'pending') return 0
  const activity = await activityTitle(row.activity_id)
  if (!activity || activity.host_id === row.user_id) return 0
  const requester = await firstName(row.user_id)
  return sendTo([activity.host_id], {
    title: 'New join request',
    body: shorten(`${requester} wants to join ${activity.title}`),
    url: `/activity/${row.activity_id}`,
    tag: `join-${row.activity_id}-${row.user_id}`,
  }, 'joinRequests')
}

Deno.serve(async (request) => {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (!secret || request.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    const payload = (await request.json()) as WebhookPayload
    const row = payload.record
    if (payload.type !== 'INSERT' || !row) return Response.json({ sent: 0 })

    let sent = 0
    if (payload.table === 'notifications') sent = await handleNotification(row)
    else if (payload.table === 'activity_chat_messages') sent = await handleChatMessage(row)
    else if (payload.table === 'activity_join_requests') sent = await handleJoinRequest(row)
    return Response.json({ sent })
  } catch (error) {
    console.error(error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
})
