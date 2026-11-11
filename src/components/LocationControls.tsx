import { LocateFixed } from 'lucide-react'
import { useState } from 'react'
import { adelaideSuburbs } from '../data/adelaideSuburbs'
import {
  defaultRadiusKm,
  getDeviceLocation,
  nearestSuburb,
  suburbCoordinates,
  type LocationPreference,
} from '../lib/distance'
import { saveSharedLocation } from '../lib/profile'
import { supabase } from '../lib/supabase'

const radiusSteps = [5, 10, 15, 25, 40, 60, 100]

// Pick where to look: your device location or a suburb, and how far around it.
export function LocationControls({
  value,
  onChange,
}: {
  value: LocationPreference | null
  onChange: (next: LocationPreference | null) => void
}) {
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')
  const [share, setShare] = useState(false)
  const [notice, setNotice] = useState('')
  const radius = value?.radiusKm ?? null
  const stepIndex = radius === null ? radiusSteps.length : Math.max(0, radiusSteps.findIndex((step) => step >= radius))

  async function useCurrentLocation() {
    setIsLocating(true)
    setError('')
    setNotice('')
    try {
      const point = await getDeviceLocation()
      onChange({
        mode: 'current',
        label: `Near ${nearestSuburb(point)}`,
        latitude: point.latitude,
        longitude: point.longitude,
        radiusKm: value?.radiusKm ?? defaultRadiusKm,
      })
      if (share && supabase) {
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          await saveSharedLocation(data.user.id, point)
          setNotice('Your approximate location (about 1 km) is shared on your profile.')
        }
      }
    } catch (locateError) {
      setError(locateError instanceof Error ? locateError.message : 'Your location could not be found.')
    } finally {
      setIsLocating(false)
    }
  }

  return (
    <div className="location-controls">
      <button type="button" className="button button-secondary button-md location-current" onClick={() => void useCurrentLocation()} disabled={isLocating}>
        <LocateFixed aria-hidden="true" /> {isLocating ? 'Finding you…' : 'Use my current location'}
      </button>
      <label className="location-share">
        <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
        <span>Also share my approximate location (about 1 km) so mates see how far away I am</span>
      </label>

      <label className="location-field">
        <span>Or pick a suburb</span>
        <select
          value={value?.mode === 'suburb' ? value.label : ''}
          onChange={(event) => {
            const suburb = event.target.value
            const point = suburbCoordinates(suburb)
            if (!suburb || !point) {
              onChange(null)
              return
            }
            onChange({ mode: 'suburb', label: suburb, ...point, radiusKm: value?.radiusKm ?? defaultRadiusKm })
          }}
        >
          <option value="">All of Adelaide</option>
          {adelaideSuburbs.map((suburb) => <option key={suburb} value={suburb}>{suburb}</option>)}
        </select>
      </label>

      <label className="location-field">
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
