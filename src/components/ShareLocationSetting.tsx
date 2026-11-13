import { useEffect, useState } from 'react'
import { getDeviceLocation } from '../lib/distance'
import { saveSharedLocation } from '../lib/profile'
import { refreshViewerProfile, useViewerProfile } from '../lib/viewerProfile'

// Switch: share your approximate location (rounded to about 1 km) with other
// members, so they see how far away you are. Saved on your profile.
export function ShareLocationSetting() {
  const viewer = useViewerProfile()
  const profile = viewer.status === 'ready' ? viewer.profile : null
  const [isOn, setIsOn] = useState(Boolean(profile?.sharedLocation))
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setIsOn(Boolean(profile?.sharedLocation))
  }, [profile?.sharedLocation])

  if (!profile) {
    return <p className="more-settings-note">Sign in to share your location with mates.</p>
  }

  async function toggle() {
    if (!profile) return
    const next = !isOn
    setIsBusy(true)
    setError('')
    setNotice('')
    setIsOn(next)
    try {
      if (next) {
        await saveSharedLocation(profile.id, await getDeviceLocation())
        setNotice('Shared. Mates now see roughly how far away you are.')
      } else {
        await saveSharedLocation(profile.id, null)
        setNotice('You stopped sharing. Mates see the distance to the centre of your suburb.')
      }
      await refreshViewerProfile()
    } catch (toggleError) {
      setIsOn(!next)
      setError(toggleError instanceof Error ? toggleError.message : 'Your location could not be shared.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <>
      <div className="more-setting-list">
        <label className="more-setting-row">
          <span>
            Share my location with mates
            <small className="more-setting-hint">
              {isBusy
                ? 'Saving…'
                : isOn
                  ? 'On. Mates see how far away you are, rounded to about 1 km. Never your exact spot.'
                  : 'Off. Mates see the distance to the centre of your suburb.'}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={isOn}
            disabled={isBusy}
            onChange={() => void toggle()}
            aria-label="Share my location with mates"
          />
        </label>
      </div>
      {notice && <p className="more-status-message" role="status">{notice}</p>}
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </>
  )
}
