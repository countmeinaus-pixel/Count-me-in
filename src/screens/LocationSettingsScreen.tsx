import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'
import { useViewerProfile } from '../lib/viewerProfile'
import { currentUser } from '../data/mockData'
import { getSuburbCoordinates } from '../data/suburbCoordinates'
import { requestDevicePosition } from '../lib/location'
import {
  getLocationPreferences,
  radiusOptions,
  saveLocationPreferences,
  type LocationPreferences,
} from '../lib/localPreferences'

export function LocationSettingsScreen() {
  const backToMore = useBackToMore()
  const viewer = useViewerProfile()
  const homeSuburb = (viewer.status === 'ready' ? viewer.profile?.suburb : null) ?? currentUser.suburb
  const [preferences, setPreferences] = useState<LocationPreferences>(() => {
    try { return getLocationPreferences() } catch { return { radiusKm: null, useDeviceLocation: false, lastPosition: null } }
  })
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)

  function save(next: LocationPreferences) {
    try {
      saveLocationPreferences(next)
      setPreferences(next)
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your location settings.')
    }
  }

  async function toggleDeviceLocation() {
    if (preferences.useDeviceLocation) {
      save({ ...preferences, useDeviceLocation: false, lastPosition: null })
      return
    }
    setLocating(true)
    try {
      const position = await requestDevicePosition()
      save({ ...preferences, useDeviceLocation: true, lastPosition: position })
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : 'Your location could not be found.')
    } finally {
      setLocating(false)
    }
  }

  const homeKnown = getSuburbCoordinates(homeSuburb) !== null

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Location" onBack={backToMore} />
      <p className="more-settings-intro">Choose how far you’re happy to travel for an activity.</p>

      <h3 className="more-settings-subtitle">Show activities within</h3>
      <div className="more-choice-list" role="radiogroup" aria-label="Show activities within">
        {[...radiusOptions, null].map((option) => (
          <button
            type="button"
            className="more-choice-row"
            role="radio"
            aria-checked={preferences.radiusKm === option}
            key={option ?? 'anywhere'}
            onClick={() => save({ ...preferences, radiusKm: option })}
          >
            <span className="more-radio" aria-hidden="true" />
            <span>{option === null ? 'Anywhere in Adelaide' : `${option} km`}</span>
          </button>
        ))}
      </div>

      <h3 className="more-settings-subtitle">Measure distance from</h3>
      <div className="more-setting-list">
        <label className="more-setting-row">
          <span>
            Use my current location
            <small className="more-setting-hint">{locating ? 'Finding you…' : 'Your position stays on this device.'}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={preferences.useDeviceLocation}
            disabled={locating}
            onChange={() => void toggleDeviceLocation()}
            aria-label="Use my current location"
          />
        </label>
        <div className="more-setting-row">
          <span>
            Home suburb: {homeSuburb}
            <small className="more-setting-hint">
              {preferences.useDeviceLocation ? 'Used when your location is off.' : 'Distances are measured from here.'}
            </small>
          </span>
          <Link className="more-setting-link" to="/profile/edit">Change</Link>
        </div>
      </div>

      {!homeKnown && !preferences.useDeviceLocation && preferences.radiusKm !== null && (
        <p className="more-status-message" role="status">
          We don’t know where {homeSuburb} is yet, so all activities are shown. Turn on your current location to filter by distance.
        </p>
      )}
      <p className="more-settings-note">
        To stop sharing your location completely, also block it for this site in your browser or phone settings.
      </p>
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </main>
  )
}
