import { useEffect, useState } from 'react'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'
import {
  defaultNotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../lib/localPreferences'

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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save notification settings.')
    }
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Notification settings" onBack={backToMore} />
      <p className="more-settings-intro">Choose which updates you’d like to receive.</p>
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
      <p className="more-settings-note">These preferences are saved on this device. Notification delivery will be connected when the app’s chat and activity alerts are ready.</p>
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </main>
  )
}
