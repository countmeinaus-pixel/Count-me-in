import { useEffect, useId, useState } from 'react'
import { formatLocality, loadLocalities, onLocalitiesLoaded, searchLocalities } from '../lib/localities'

// Suburb or town anywhere in Australia, with suggestions while typing.
// Suggestions are saved as "Name, STATE" (e.g. "Richmond, VIC"), because many
// names exist in more than one state.
export function SuburbInput({
  value,
  onChange,
  placeholder = 'For example, Bondi Beach',
  autoFocus = false,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  ariaLabel?: string
}) {
  const listId = useId()
  const [, setVersion] = useState(0)

  useEffect(() => {
    void loadLocalities()
    return onLocalitiesLoaded(() => setVersion((version) => version + 1))
  }, [])

  const suggestions = searchLocalities(value)

  return (
    <>
      <input
        value={value}
        list={listId}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {suggestions.map((place) => (
          <option key={`${place.name}-${place.state}`} value={formatLocality(place)}>{place.postcode}</option>
        ))}
      </datalist>
    </>
  )
}
