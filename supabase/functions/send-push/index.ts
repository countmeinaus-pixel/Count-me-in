// Sends free web push notifications.
//
// Called by three Supabase Database Webhooks (Database > Webhooks), on INSERT into:
//   - notifications            -> the member it is for
//   - activity_join_requests   -> the host of the activity
//   - activity_chat_messages   -> everyone in the chat except the sender
// and a fourth on INSERT into:
//   - direct_messages          -> the friend in the private chat
// It respects each member's switches on Notification settings, and removes
// devices that no longer accept pushes.
//
// Secrets (Edge Functions > Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// SUPABASE_URL and the service keys are provided by Supabase itself.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

type Preferences = {
  chat_messages: boolean
  join_requests: boolean
  activity_updates: boolean
  friend_requests: boolean
}
type PreferenceKey = keyof Preferences
type Push = { title: string; body: string; url: string }

// Supabase has two kinds of server keys: the older service_role key (a JWT)
// and the newer secret keys (sb_secret_...). Accept both.
// The new keys come first: on projects that switched to them, the old key may no
// longer be accepted, and the database then quietly returns nothing.
function secretKeys(): string[] {
  const keys: string[] = []
  try {
    const modern = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    keys.push(...Object.values(modern).filter((key) => typeof key === 'string' && key.length > 0))
  } catch {
    // No new-style keys on this project.
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) keys.push(legacy)
  return keys
}

const serverKey = secretKeys()[0]
console.log(`Database key: ${serverKey?.startsWith('sb_secret_') ? 'new secret key' : serverKey ? 'service_role key' : 'MISSING'}`)
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serverKey!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
webpush.setVapidDetails(
  'https://count-me-in-nine.vercel.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const notificationTitles: Record<string, string> = {
  participant_left: 'Someone can’t make it',
  invite: 'You’re invited',
  invite_accepted: 'Invitation accepted',
  invite_declined: 'Invitation declined',
  activity_cancelled: 'Activity cancelled',
  pr_confirmed: 'PR confirmed',
  pr_flagged: 'PR flagged',
  pr_verified: 'PR verified',
  friend_request: 'Friend request',
  friend_accepted: 'New friend',
  activity_approved: 'Activity approved',
  activity_rejected: 'Activity not approved',
  sport_suggested: 'New sport suggested',
  role_changed: 'Your role changed',
  profile_updated: 'Profile updated',
  staff_message: 'Count Me In team',
  staff_message_reply: 'Reply to your team message',
  staff_message_revoked: 'Count Me In team',
}

// Where tapping the push opens the app, for types that are not about an activity.
function urlFor(record: { type: string; activity_id?: string | null; actor_id?: string | null }) {
  if (record.activity_id) return `/activity/${record.activity_id}`
  if (record.type === 'staff_message' || record.type === 'staff_message_revoked') return '/chats'
  if (record.type === 'staff_message_reply' && record.actor_id) return `/more/moderation/members/${record.actor_id}/message`
  return '/notifications'
}

// Which switch on Notification settings controls this notification type.
// Types not listed here (moderation, roles) are always sent.
function preferenceFor(type: string): PreferenceKey | null {
  if (type === 'friend_request' || type === 'friend_accepted') return 'friend_requests'
  if (['participant_left', 'invite', 'invite_accepted', 'invite_declined', 'activity_cancelled',
    'pr_confirmed', 'pr_flagged', 'pr_verified', 'activity_approved', 'activity_rejected'].includes(type)) {
    return 'activity_updates'
  }
  return null
}

function shorten(text: string, length = 140) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

// Only Supabase itself (the webhooks, with a server key) may call this,
// never a member's browser.
function isServiceRole(request: Request) {
  const header = request.headers.get('Authorization') ?? request.headers.get('apikey') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  if (secretKeys().includes(token)) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

async function firstName(userId: string) {
  const { data } = await supabase.from('profiles').select('first_name').eq('id', userId).maybeSingle()
  return (data?.first_name as string | undefined) ?? 'Someone'
}

async function sendTo(userIds: string[], preference: PreferenceKey | null, push: Push) {
  if (userIds.length === 0) return 0
  let recipients = userIds
  if (preference) {
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select(`user_id, ${preference}`)
      .in('user_id', userIds)
    if (prefsError) console.error('Could not read notification_preferences', prefsError.message)
    const optedOut = new Set((prefs ?? []).filter((row) => row[preference] === false).map((row) => row.user_id))
    recipients = userIds.filter((id) => !optedOut.has(id))
  }
  if (recipients.length === 0) {
    console.log(`No recipients left: ${userIds.length} found, all switched "${preference}" off`)
    return 0
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipients)
  if (subscriptionError) console.error('Could not read push_subscriptions', subscriptionError.message)
  console.log(`Recipients: ${recipients.length}, devices with push on: ${subscriptions?.length ?? 0}`)

  let sent = 0
  await Promise.all((subscriptions ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(push),
        { TTL: 60 * 60 * 24 },
      )
      sent += 1
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      // 404/410: this device turned push off or the app was removed.
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      } else {
        console.error('Push failed', status, (error as Error).message)
      }
    }
  }))
  return sent
}

Deno.serve(async (request) => {
  if (!isServiceRole(request)) return new Response('Forbidden', { status: 403 })

  const { type, table, record } = await request.json()
  console.log(`Webhook: ${type} on ${table}`)
  if (type !== 'INSERT' || !record) return new Response('Ignored')

  let sent = 0
  if (table === 'notifications') {
    sent = await sendTo([record.user_id], preferenceFor(record.type), {
      title: notificationTitles[record.type] ?? 'Count Me In',
      body: shorten(record.message ? `${record.body} “${record.message}”` : record.body),
      url: urlFor(record),
    })
  } else if (table === 'activity_join_requests' && record.status === 'pending') {
    const { data: activity } = await supabase.from('activities').select('host_id, title').eq('id', record.activity_id).maybeSingle()
    if (activity) {
      const name = await firstName(record.user_id)
      sent = await sendTo([activity.host_id], 'join_requests', {
        title: 'New join request',
        body: shorten(`${name} wants to join ${activity.title}`),
        url: `/activity/${record.activity_id}`,
      })
    }
  } else if (table === 'activity_chat_messages' && record.message_type === 'message') {
    const [{ data: thread, error: threadError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from('activity_chat_threads').select('title').eq('id', record.thread_id).maybeSingle(),
      supabase.from('activity_chat_members').select('user_id').eq('thread_id', record.thread_id).eq('status', 'accepted'),
    ])
    if (threadError) console.error('Could not read the chat', threadError.message)
    if (membersError) console.error('Could not read chat members', membersError.message)
    const name = await firstName(record.sender_id)
    const others = (members ?? []).map((member) => member.user_id as string).filter((id) => id !== record.sender_id)
    console.log(`Chat members: ${members?.length ?? 0}, others than the sender: ${others.length}`)
    sent = await sendTo(others, 'chat_messages', {
      title: thread?.title ?? 'New message',
      body: shorten(`${name}: ${record.body}`),
      url: `/chats/${record.thread_id}`,
    })
  } else if (table === 'direct_messages') {
    const { data: chat, error: chatError } = await supabase
      .from('direct_chats').select('user_low, user_high').eq('id', record.chat_id).maybeSingle()
    if (chatError) console.error('Could not read the private chat', chatError.message)
    if (chat) {
      const friendId = chat.user_low === record.sender_id ? chat.user_high : chat.user_low
      const name = await firstName(record.sender_id)
      sent = await sendTo([friendId as string], 'chat_messages', {
        title: name,
        body: shorten(record.body),
        url: `/chats/dm/${record.chat_id}`,
      })
    }
  }

  console.log(`Pushes sent: ${sent}`)
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
