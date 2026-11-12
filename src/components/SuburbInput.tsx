import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatLocality, loadLocalities, onLocalitiesLoaded, searchLocalities, type Locality } from '../lib/localities'

// Suburb or town anywhere in Australia, with a list of suggestions while typing.
// Places are saved as "Name, STATE" (e.g. "Richmond, VIC"), because many
// names exist in more than one state.
// variant "search" adds a search icon and a clear button (used for the location filter).
export function SuburbInput({
  value,
  onChange,
  onSelect,
  placeholder = 'For example, Bondi Beach',
  autoFocus = false,
  ariaLabel,
  variant = 'field',
}: {
  value: string
  onChange: (value: string) => void
  onSelect?: (place: Locality) => void
  placeholder?: string
  autoFocus?: boolean
  ariaLabel?: string
  variant?: 'field' | 'search'
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [, setVersion] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    void loadLocalities()
    return onLocalitiesLoaded(() => setVersion((version) => version + 1))
  }, [])

  const query = value.trim()
  const suggestions = query.length > 0 ? searchLocalities(query) : []
  // Hide the list once the text is exactly a chosen place.
  const isChosen = suggestions.length > 0 && suggestions.some((place) => formatLocality(place) === query)
  const showList = isOpen && suggestions.length > 0 && !isChosen

  function choose(place: Locality) {
    onChange(formatLocality(place))
    onSelect?.(place)
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }

  return (
    <div className={`suburb-combobox${variant === 'search' ? ' is-search' : ''}`}>
      {variant === 'search' && <Search className="suburb-combobox-icon" aria-hidden="true" />}
      <input
        ref={inputRef}
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => {
          onChange(event.target.value)
          setIsOpen(true)
          setActiveIndex(-1)
        }}
        onKeyDown={(event) => {
          if (!showList) return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => (index + 1) % suggestions.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
          } else if (event.key === 'Enter') {
            event.preventDefault()
            choose(suggestions[Math.max(0, activeIndex)])
          } else if (event.key === 'Escape') {
            setIsOpen(false)
          }
        }}
      />
      {variant === 'search' && value && (
        <button
          type="button"
          className="suburb-combobox-clear"
          aria-label="Clear"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
        >
          <X aria-hidden="true" />
        </button>
      )}
      {showList && (
        <ul id={listId} role="listbox" className="suburb-combobox-list" aria-label="Suggestions">
          {suggestions.map((place, index) => (
            <li
              key={`${place.name}-${place.state}-${place.postcode}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'is-active' : undefined}
              // Keep focus in the input so the tap is not lost when the list closes.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(place)}
            >
              <span className="suburb-combobox-name">{place.name}</span>
              <span className="suburb-combobox-meta">{place.state} {place.postcode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
