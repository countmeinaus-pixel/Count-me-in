import { useEffect, useState } from 'react'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'
import {
  defaultNotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../lib/localPreferences'
import { disablePush, enablePush, getPushStatus, syncPushPreferences, type PushStatus } from '../lib/push'

const pushStatusText: Record<PushStatus, string> = {
  unsupported: 'This browser can’t show notifications. On Android, open the app in Chrome and install it.',
  'needs-install': 'On iPhone, first tap Share, then Add to Home Screen. Open the app from your home screen and turn this on.',
  denied: 'Notifications are blocked for this app. Allow them in your phone settings, then come back here.',
  off: 'Get a message on this phone, even when the app is closed.',
  on: 'On for this device.',
}

const notificationOptions: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'activityInMySports', label: 'New activities in my sports' },
  { key: 'joinRequests', label: 'Join requests' },
  { key: 'chatMessages', label: 'Chat messages' },
  { key: 'activityReminderDayBefore', label: 'Activity reminder · day before' },
  { key: 'activityReminderOneHourBefore', label: 'Activity reminder · 1 hour before' },
]

export function NotificationSettingsScreen() {
  const backToMore = useBackToMore()
  const [preferences, setPreferences] = useState(defaultNotificationPreferences)
  const [error, setError] = useState('')
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    getPushStatus().then(setPushStatus).catch(() => setPushStatus('unsupported'))
  }, [])

  async function togglePush() {
    setPushBusy(true)
    setError('')
    try {
      if (pushStatus === 'on') await disablePush()
      else await enablePush(preferences)
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : 'Unable to change push notifications.')
    } finally {
      setPushStatus(await getPushStatus().catch(() => 'unsupported' as const))
      setPushBusy(false)
    }
  }

  useEffect(() => {
    try {
      setPreferences(getNotificationPreferences())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notification settings.')
    }
  }, [])

  function updatePreference(key: keyof NotificationPreferences) {
    const next = { ...preferences, [key]: !preferences[key] }
    try {
      saveNotificationPreferences(next)
      setPreferences(next)
      setError('')
      void syncPushPreferences(next)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save notification settings.')
    }
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Notification settings" onBack={backToMore} />
      <p className="more-settings-intro">Choose which updates you’d like to receive.</p>
      <div className="more-setting-list">
        <label className="more-setting-row">
          <span>
            Push notifications on this device
            {pushStatus && <small className="more-setting-hint">{pushStatusText[pushStatus]}</small>}
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={pushStatus === 'on'}
            disabled={pushBusy || !pushStatus || pushStatus === 'unsupported' || pushStatus === 'needs-install'}
            onChange={() => void togglePush()}
            aria-label="Push notifications on this device"
          />
        </label>
      </div>
      <div className="more-setting-list">
        {notificationOptions.map(({ key, label }) => (
          <label className="more-setting-row" key={key}>
            <span>{label}</span>
            <input
              type="checkbox"
              role="switch"
              checked={preferences[key]}
              onChange={() => updatePreference(key)}
              aria-label={label}
            />
          </label>
        ))}
      </div>
      <p className="more-settings-note">Friend requests, invites and cancelled activities always come through when push is on. Day-before and 1-hour reminders are not sent yet.</p>
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </main>
  )
}
