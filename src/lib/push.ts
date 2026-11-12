import type { NotificationPreferences } from './localPreferences'
import { supabase } from './supabase'

// Free web push: the browser's own push service, sent by the Supabase Edge
// Function "send-push". This public key pairs with VAPID_PRIVATE_KEY, which only
// lives in Supabase secrets (and .env.local), never in the app.
const vapidPublicKey = 'BNdNk_u3zx9JwgrB05QEc9CR89rXEW56M0MlmZpuAZzg0POrWpYBlq-5MkxrLjhRDLUzFSVU7Lo9sxv_RanX_Dw'

export type PushState =
  | 'unsupported' // this browser cannot do push
  | 'needs-install' // iPhone/iPad: only works from the home screen app
  | 'blocked' // the member said no; only the browser or phone settings can undo it
  | 'off'
  | 'on'

function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export async function getPushState(): Promise<PushState> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) return isIos() && !isInstalled() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription && Notification.permission === 'granted' ? 'on' : 'off'
}

function base64UrlToBytes(value: string) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function encodeKey(key: ArrayBuffer | null) {
  if (!key) return ''
  return btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function enablePush() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Log in to turn on notifications.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are not allowed. You can allow them in your browser or phone settings.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription = (await registration.pushManager.getSubscription())
    ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(vapidPublicKey) }))

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    user_id: data.user.id,
    p256dh: encodeKey(subscription.getKey('p256dh')),
    auth: encodeKey(subscription.getKey('auth')),
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

// The switches on Notification settings, also saved in Supabase so pushes respect them.
const columns: Record<keyof NotificationPreferences, string> = {
  chatMessages: 'chat_messages',
  joinRequests: 'join_requests',
  activityUpdates: 'activity_updates',
  friendRequests: 'friend_requests',
  activityInMySports: 'activity_in_my_sports',
  activityReminderDayBefore: 'reminder_day_before',
  activityReminderOneHourBefore: 'reminder_hour_before',
}

export async function loadRemotePreferences(): Promise<Partial<NotificationPreferences> | null> {
  if (!supabase) return null
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return null
  const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', user.user.id).maybeSingle()
  if (error || !data) return null
  return Object.fromEntries(
    Object.entries(columns).map(([key, column]) => [key, (data as Record<string, unknown>)[column] !== false]),
  ) as Partial<NotificationPreferences>
}

export async function saveRemotePreferences(preferences: NotificationPreferences) {
  if (!supabase) return
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return
  const row: Record<string, unknown> = { user_id: user.user.id, updated_at: new Date().toISOString() }
  for (const [key, column] of Object.entries(columns)) row[column] = preferences[key as keyof NotificationPreferences]
  const { error } = await supabase.from('notification_preferences').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}
