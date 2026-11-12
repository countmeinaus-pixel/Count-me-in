import { useEffect, useState } from 'react'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'
import {
  defaultNotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../lib/localPreferences'
import {
  disablePush,
  enablePush,
  getPushState,
  loadRemotePreferences,
  saveRemotePreferences,
  type PushState,
} from '../lib/push'

// "soon": saved already, but not sent yet (needs a schedule on the server).
const notificationOptions: Array<{ key: keyof NotificationPreferences; label: string; soon?: boolean }> = [
  { key: 'chatMessages', label: 'Chat messages' },
  { key: 'joinRequests', label: 'Join requests for my activities' },
  { key: 'activityUpdates', label: 'Activity updates (invites, approvals, cancellations)' },
  { key: 'friendRequests', label: 'Friend requests' },
  { key: 'activityInMySports', label: 'New activities in my sports', soon: true },
  { key: 'activityReminderDayBefore', label: 'Activity reminder · day before', soon: true },
  { key: 'activityReminderOneHourBefore', label: 'Activity reminder · 1 hour before', soon: true },
]

const pushStateText: Record<PushState, string> = {
  on: 'On for this device. You get alerts even when the app is closed.',
  off: 'Off for this device.',
  blocked: 'Blocked. Allow notifications for this site in your browser or phone settings, then come back here.',
  'needs-install': 'On iPhone and iPad, add Count Me In to your home screen first (Share > Add to Home Screen), then open it from there.',
  unsupported: 'This browser cannot show push notifications. Try Chrome, Edge, Firefox or Safari on a Mac.',
}

export function NotificationSettingsScreen() {
  const backToMore = useBackToMore()
  const [preferences, setPreferences] = useState(defaultNotificationPreferences)
  const [pushState, setPushState] = useState<PushState | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    try {
      setPreferences(getNotificationPreferences())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notification settings.')
    }
    // The saved settings in Supabase win, so they are the same on every device.
    loadRemotePreferences()
      .then((remote) => {
        if (active && remote) setPreferences((current) => ({ ...current, ...remote }))
      })
      .catch(() => undefined)
    getPushState().then((state) => {
      if (active) setPushState(state)
    }).catch(() => {
      if (active) setPushState('unsupported')
    })
    return () => {
      active = false
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
    saveRemotePreferences(next).catch((saveError: unknown) => {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save notification settings.')
    })
  }

  async function togglePush() {
    setPushBusy(true)
    setError('')
    try {
      if (pushState === 'on') await disablePush()
      else {
        await enablePush()
        await saveRemotePreferences(preferences).catch(() => undefined)
      }
      setPushState(await getPushState())
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : 'Unable to change push notifications.')
      setPushState(await getPushState().catch(() => 'unsupported' as const))
    } finally {
      setPushBusy(false)
    }
  }

  const canToggle = pushState === 'on' || pushState === 'off'

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Notification settings" onBack={backToMore} />

      <h3 className="more-settings-subtitle">Push notifications</h3>
      <div className="more-setting-list">
        <label className="more-setting-row">
          <span>
            Alerts on this device
            <small className="more-setting-hint">{pushState ? pushStateText[pushState] : 'Checking…'}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={pushState === 'on'}
            disabled={!canToggle || pushBusy}
            onChange={() => void togglePush()}
            aria-label="Push notifications on this device"
          />
        </label>
      </div>

      <h3 className="more-settings-subtitle">What you get notified about</h3>
      <div className="more-setting-list">
        {notificationOptions.map(({ key, label, soon }) => (
          <label className="more-setting-row" key={key}>
            <span>
              {label}
              {soon && <small className="more-setting-hint">Coming soon</small>}
            </span>
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
      <p className="more-settings-note">
        These switches apply to push alerts and are saved to your account. You always see everything under the bell in the app.
      </p>
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </main>
  )
}
