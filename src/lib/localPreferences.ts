export type NotificationPreferences = {
  activityInMySports: boolean
  joinRequests: boolean
  chatMessages: boolean
  friendRequests: boolean
  activityUpdates: boolean
  activityReminderDayBefore: boolean
  activityReminderOneHourBefore: boolean
}

export type ProfileVisibility = 'members' | 'activityConnections' | 'hidden'

export const defaultNotificationPreferences: NotificationPreferences = {
  activityInMySports: true,
  joinRequests: true,
  chatMessages: true,
  friendRequests: true,
  activityUpdates: true,
  activityReminderDayBefore: true,
  activityReminderOneHourBefore: true,
}

const notificationPreferencesKey = 'count-me-in-notification-preferences'
const blockedUsersKey = 'count-me-in-blocked-users'
const profileVisibilityKey = 'count-me-in-profile-visibility'
const visibilityOptions: ProfileVisibility[] = ['members', 'activityConnections', 'hidden']

function isProfileVisibility(value: unknown): value is ProfileVisibility {
  return typeof value === 'string' && visibilityOptions.some((option) => option === value)
}

function readStoredJson(key: string): unknown {
  const stored = window.localStorage.getItem(key)
  if (stored === null) return null

  try {
    return JSON.parse(stored)
  } catch {
    throw new Error('Saved settings could not be read. Clear this app’s stored data and try again.')
  }
}

export function getNotificationPreferences(): NotificationPreferences {
  const stored = readStoredJson(notificationPreferencesKey)
  if (stored === null) return defaultNotificationPreferences
  if (typeof stored !== 'object' || stored === null) {
    throw new Error('Saved notification settings are invalid.')
  }

  // Unknown or missing switches fall back to on, so new switches never break old settings.
  const preferences = stored as Record<string, unknown>
  const read = (key: keyof NotificationPreferences) =>
    typeof preferences[key] === 'boolean' ? (preferences[key] as boolean) : defaultNotificationPreferences[key]
  return {
    activityInMySports: read('activityInMySports'),
    joinRequests: read('joinRequests'),
    chatMessages: read('chatMessages'),
    friendRequests: read('friendRequests'),
    activityUpdates: read('activityUpdates'),
    activityReminderDayBefore: read('activityReminderDayBefore'),
    activityReminderOneHourBefore: read('activityReminderOneHourBefore'),
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  window.localStorage.setItem(notificationPreferencesKey, JSON.stringify(preferences))
}

export function getBlockedUsers(): string[] {
  const stored = readStoredJson(blockedUsersKey)
  if (stored === null) return []
  if (!Array.isArray(stored) || stored.some((name) => typeof name !== 'string')) {
    throw new Error('Saved blocked users are invalid.')
  }
  return [...new Set(stored)]
}

export function addBlockedUser(name: string) {
  const blockedUsers = getBlockedUsers()
  if (!blockedUsers.includes(name)) {
    window.localStorage.setItem(blockedUsersKey, JSON.stringify([...blockedUsers, name]))
  }
}

export function removeBlockedUser(name: string) {
  const blockedUsers = getBlockedUsers().filter((blockedName) => blockedName !== name)
  window.localStorage.setItem(blockedUsersKey, JSON.stringify(blockedUsers))
}

export function getProfileVisibility(): ProfileVisibility {
  const stored = readStoredJson(profileVisibilityKey)
  if (stored === null) return 'members'
  if (!isProfileVisibility(stored)) {
    throw new Error('Saved profile visibility is invalid.')
  }
  return stored
}

export function saveProfileVisibility(visibility: ProfileVisibility) {
  window.localStorage.setItem(profileVisibilityKey, JSON.stringify(visibility))
}

