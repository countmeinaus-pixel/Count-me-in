import { ChevronDown, MapPin } from 'lucide-react'
import { useState } from 'react'
import { parseCoordinates } from '../lib/location'

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
  const coordinatesInvalid = coordinates.trim() !== '' && !parseCoordinates(coordinates)

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
          <input
            value={suburb}
            onChange={(event) => onSuburbChange(event.target.value)}
            maxLength={100}
            placeholder="For example, Glenelg"
          />
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
          {coordinatesInvalid
            ? 'Paste two numbers separated by a comma, like -34.9285, 138.6007.'
            : 'Puts your activity on the map. Handy for spots without an address, like a beach or trailhead.'}
        </small>
      </label>

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
