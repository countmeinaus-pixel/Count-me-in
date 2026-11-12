import { SuburbInput } from './SuburbInput'
import { ChevronDown, LocateFixed, Map as MapIcon, MapPin } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { suburbCoordinates } from '../lib/distance'
import { formatCoordinates, getPrecisePosition, parseCoordinates, parseMapPin } from '../lib/location'

// The map is only loaded when someone opens the picker.
const MapPinPicker = lazy(() => import('./MapPinPicker'))

type LocationFieldsProps = {
  meetingPoint: string
  suburb: string
  address: string
  coordinates: string
  onMeetingPointChange: (value: string) => void
  onSuburbChange: (value: string) => void
  onAddressChange: (value: string) => void
  onCoordinatesChange: (value: string) => void
}

export function LocationFields({
  meetingPoint,
  suburb,
  address,
  coordinates,
  onMeetingPointChange,
  onSuburbChange,
  onAddressChange,
  onCoordinatesChange,
}: LocationFieldsProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [pinNotice, setPinNotice] = useState('')
  const [pinError, setPinError] = useState('')

  async function useCurrentLocation() {
    setLocating(true)
    setPinError('')
    setPinNotice('')
    try {
      const position = await getPrecisePosition()
      onCoordinatesChange(formatCoordinates(position.latitude, position.longitude))
      setPinNotice(`Pin set to where you are now (accurate to about ${Math.max(1, Math.round(position.accuracy))} m).`)
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Your location could not be found.')
    } finally {
      setLocating(false)
    }
  }
  const coordinatesUnreadable = coordinates.trim() !== '' && !parseCoordinates(coordinates)
  const coordinatesInvalid = coordinates.trim() !== '' && !parseMapPin(coordinates)

  return (
    <fieldset className="location-fields">
      <legend><MapPin />Where do you meet?</legend>
      <p className="field-helper">Give the spot a name. Add an address or a map pin so the crew can find it.</p>

      <div className="wizard-field-grid">
        <label className="field">
          <span>Location name</span>
          <input
            value={meetingPoint}
            onChange={(event) => onMeetingPointChange(event.target.value)}
            maxLength={200}
            placeholder="For example, Brighton jetty car park"
          />
        </label>
        <label className="field">
          <span>Suburb</span>
          <SuburbInput value={suburb} onChange={onSuburbChange} placeholder="For example, Glenelg, SA" ariaLabel="Suburb or town" />
        </label>
      </div>

      <label className="field">
        <span>Address (optional)</span>
        <input
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          maxLength={200}
          placeholder="For example, 1 Jetty Road"
          autoComplete="street-address"
        />
      </label>

      <label className="field">
        <span>Map pin (optional)</span>
        <input
          value={coordinates}
          onChange={(event) => onCoordinatesChange(event.target.value)}
          inputMode="decimal"
          placeholder="For example, -34.9285, 138.6007"
          aria-invalid={coordinatesInvalid}
          aria-describedby="map-pin-helper"
        />
        <small id="map-pin-helper" className={coordinatesInvalid ? 'field-error' : 'field-helper'}>
          {coordinatesUnreadable
            ? 'Paste two numbers separated by a comma, like -34.9285, 138.6007.'
            : coordinatesInvalid
            ? 'This pin is not in Australia. Check the numbers, like -34.9285, 138.6007.'
            : 'Puts your activity on the map. Handy for spots without an address, like a beach or trailhead.'}
        </small>
      </label>

      <div className="map-pin-actions">
        <button type="button" className="button button-secondary button-sm" onClick={() => void useCurrentLocation()} disabled={locating}>
          <LocateFixed aria-hidden="true" /> {locating ? 'Finding you…' : 'Use my current location'}
        </button>
        <button type="button" className="button button-secondary button-sm" onClick={() => { setPinError(''); setPinNotice(''); setPickerOpen(true) }}>
          <MapIcon aria-hidden="true" /> Pick on map
        </button>
      </div>
      {pinNotice && <p className="field-helper" role="status">{pinNotice}</p>}
      {pinError && <p className="field-error" role="alert">{pinError}</p>}
      {pickerOpen && (
        <Suspense fallback={null}>
          <MapPinPicker
            initial={parseCoordinates(coordinates)}
            start={suburbCoordinates(suburb)}
            onPick={(point) => {
              onCoordinatesChange(formatCoordinates(point.latitude, point.longitude))
              setPinNotice('Pin set from the map.')
              setPickerOpen(false)
            }}
            onClose={() => setPickerOpen(false)}
          />
        </Suspense>
      )}

      <button
        type="button"
        className="location-help-toggle"
        aria-expanded={helpOpen}
        onClick={() => setHelpOpen((open) => !open)}
      >
        How do I find the map pin?
        <ChevronDown />
      </button>
      {helpOpen && (
        <ol className="location-help">
          <li>
            Open{' '}
            <a href="https://www.google.com/maps/@-34.9285,138.6007,11z" target="_blank" rel="noreferrer">Google Maps</a>
            {' '}and find your spot.
          </li>
          <li>On a computer, right-click the spot. On a phone, press and hold it.</li>
          <li>Copy the two numbers that appear (on a phone, tap them in the search bar).</li>
          <li>Paste them in the map pin field above.</li>
        </ol>
      )}
    </fieldset>
  )
}
