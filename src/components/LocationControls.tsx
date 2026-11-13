import { SuburbInput } from './SuburbInput'
import { LocateFixed } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  defaultRadiusKm,
  getDeviceLocation,
  nearestSuburb,
  type LocationPreference,
} from '../lib/distance'
import { formatLocality } from '../lib/localities'
import { saveSharedLocation } from '../lib/profile'
import { refreshViewerProfile, useViewerProfile } from '../lib/viewerProfile'

const radiusSteps = [5, 10, 15, 25, 40, 60, 100]

// Pick where to look: your device location or a suburb, and how far around it.
export function LocationControls({
  value,
  onChange,
  showShareLink = true,
}: {
  value: LocationPreference | null
  onChange: (next: LocationPreference | null) => void
  showShareLink?: boolean
}) {
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')
  // Sharing your location is a setting on More > Location (ShareLocationSetting).
  // When it is on, using your current location here also updates the shared spot.
  const viewer = useViewerProfile()
  const viewerProfile = viewer.status === 'ready' ? viewer.profile : null
  const share = Boolean(viewerProfile?.sharedLocation)
  const [notice, setNotice] = useState('')
  const [suburbText, setSuburbText] = useState(value?.mode === 'suburb' ? value.label : '')
  const radius = value?.radiusKm ?? null
  const stepIndex = radius === null ? radiusSteps.length : Math.max(0, radiusSteps.findIndex((step) => step >= radius))

  async function useCurrentLocation() {
    setIsLocating(true)
    setError('')
    setNotice('')
    try {
      const point = await getDeviceLocation()
      setSuburbText('')
      onChange({
        mode: 'current',
        label: `Near ${nearestSuburb(point)}`,
        latitude: point.latitude,
        longitude: point.longitude,
        radiusKm: value?.radiusKm ?? defaultRadiusKm,
      })
      // Sharing is on: keep the shared spot up to date with where you are now.
      if (share && viewerProfile) {
        await saveSharedLocation(viewerProfile.id, point)
        void refreshViewerProfile()
      }
    } catch (locateError) {
      setError(locateError instanceof Error ? locateError.message : 'Your location could not be found.')
    } finally {
      setIsLocating(false)
    }
  }

  return (
    <div className="location-controls">
      <div className="location-explore">
        <h4>Search an area</h4>
        <p>See activities and mates around any suburb, town or city.</p>
      </div>
      <label className="location-field">
        <SuburbInput
          variant="search"
          value={suburbText}
          ariaLabel="Search an area: suburb, town or city"
          placeholder="Search a suburb, town or city"
          onChange={(text) => {
            setSuburbText(text)
            if (!text.trim()) onChange(null)
          }}
          // Only a place picked from the list is used, so "Perth" never quietly becomes Perth, TAS.
          onSelect={(place) => {
            setError('')
            onChange({
              mode: 'suburb',
              label: formatLocality(place),
              latitude: place.latitude,
              longitude: place.longitude,
              radiusKm: value?.radiusKm ?? defaultRadiusKm,
            })
          }}
        />
      </label>

      <p className="location-or" aria-hidden="true"><span>or</span></p>
      <button type="button" className="button button-secondary button-md location-current" onClick={() => void useCurrentLocation()} disabled={isLocating}>
        <LocateFixed aria-hidden="true" /> {isLocating ? 'Finding you…' : 'Use my current location'}
      </button>
      {showShareLink && viewerProfile && (
        <p className="location-share-link">
          {share ? 'You share your approximate location with mates.' : 'Want mates to see how far away you are?'}{' '}
          <Link to="/more/location">{share ? 'Change' : 'Share your location'}</Link>
        </p>
      )}

      <label className="location-field location-distance">
        <span>Distance: <strong>{radius === null ? 'No limit' : `${radius} km`}</strong></span>
        <input
          type="range"
          min={0}
          max={radiusSteps.length}
          step={1}
          value={stepIndex}
          disabled={!value}
          aria-valuetext={radius === null ? 'No limit' : `${radius} km`}
          onChange={(event) => {
            if (!value) return
            const index = Number(event.target.value)
            onChange({ ...value, radiusKm: index >= radiusSteps.length ? null : radiusSteps[index] })
          }}
        />
        <span className="location-range-labels" aria-hidden="true"><span>5 km</span><span>No limit</span></span>
      </label>
      {!value && <p className="location-hint">Choose your location or a suburb to set a distance.</p>}
      {error && <p className="activity-join-error" role="alert">{error}</p>}
      {notice && <p className="location-hint" role="status">{notice}</p>}
    </div>
  )
}
