import type { NotificationPreferences } from './localPreferences'
import { databaseUpdateNeededMessage, isMissingDatabaseFeature } from './notifications'
import { supabase } from './supabase'

// Public half of the push key pair (safe to ship). The private half lives only
// in the Supabase Edge Function secrets.
const vapidPublicKey = 'BE__JhgQ_f6J_Q0qgLe3V_OST84jv-vl1wsnpeH-nSRFQKW3aMO3N-8IG16ZnZ6FTLqlzvQV-kb8N1RttqBe0ms'

export type PushStatus = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function base64ToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js')
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iPhones only support push for apps added to the home screen.
    return isIos() && !isInstalled() ? 'needs-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

export async function enablePush(preferences: NotificationPreferences) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Sign in to turn on notifications.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them for this app in your phone settings, then try again.')
  }
  const registration = await getRegistration()
  await navigator.serviceWorker.ready
  const subscription = (await registration.pushManager.getSubscription())
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(vapidPublicKey) })
  const json = subscription.toJSON()

  // Replace any earlier row for this device, then save it for this account.
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: data.user.id,
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
    user_agent: navigator.userAgent.slice(0, 300),
    preferences,
  })
  if (error) {
    if (isMissingDatabaseFeature(error)) throw new Error(databaseUpdateNeededMessage)
    throw error
  }
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

// Keep the server in step when you change which notifications you want.
export async function syncPushPreferences(preferences: NotificationPreferences) {
  if (!supabase || !('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').update({ preferences }).eq('endpoint', subscription.endpoint)
}
