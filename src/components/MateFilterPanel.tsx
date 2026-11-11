import { useState } from 'react'
import type { LocationPreference } from '../lib/distance'
import { ageLimits, defaultMateFilters, type MateFilters, type MateSort } from '../lib/mateFilters'
import { LocationControls } from './LocationControls'
import { SidePanel } from './SidePanel'

const sortOptions: Array<{ value: MateSort; label: string }> = [
  { value: 'closest', label: 'Closest' },
  { value: 'common', label: 'Most in common' },
  { value: 'meetups', label: 'Most meetups' },
  { value: 'newest', label: 'Newest' },
]
const levelOptions = ['Beginner', 'Intermediate', 'Experienced']
const availabilityOptions = ['Weekday mornings', 'Weekday evenings', 'Saturdays', 'Sundays', 'Flexible']
const toggles: Array<{ key: 'verifiedOnly' | 'hostingSoon' | 'newMembers' | 'mySportsOnly' | 'withPhoto'; label: string; hint: string }> = [
  { key: 'mySportsOnly', label: 'Into my sports', hint: 'Shares at least one sport with you' },
  { key: 'hostingSoon', label: 'Hosting something soon', hint: 'Has an activity in the next 2 weeks' },
  { key: 'verifiedOnly', label: 'Verified only', hint: 'Has the verified tick' },
  { key: 'newMembers', label: 'New members', hint: 'Joined in the last 30 days' },
  { key: 'withPhoto', label: 'With a profile photo', hint: 'Has added a photo' },
]

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function MateFilterPanel({
  filters,
  location,
  sports,
  countFor,
  onApply,
  onClose,
}: {
  filters: MateFilters
  location: LocationPreference | null
  sports: string[]
  countFor: (filters: MateFilters, location: LocationPreference | null) => number
  onApply: (filters: MateFilters, location: LocationPreference | null) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filters)
  const [draftLocation, setDraftLocation] = useState(location)
  const set = (patch: Partial<MateFilters>) => setDraft((current) => ({ ...current, ...patch }))
  const resultCount = countFor(draft, draftLocation)

  return (
    <SidePanel
      title="Filters"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-secondary button-md" onClick={() => {
            setDraft(defaultMateFilters)
            setDraftLocation(null)
          }}>Reset</button>
          <button type="button" className="button button-primary button-md" onClick={() => onApply(draft, draftLocation)}>
            Show {resultCount} {resultCount === 1 ? 'mate' : 'mates'}
          </button>
        </>
      }
    >
      <section className="filter-section">
        <h3>Sort by</h3>
        <div className="choice-chips">
          {sortOptions.map((option) => (
            <button key={option.value} type="button" className={`choice-chip ${draft.sort === option.value ? 'selected' : ''}`} aria-pressed={draft.sort === option.value} onClick={() => set({ sort: option.value })}>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Location</h3>
        <LocationControls value={draftLocation} onChange={setDraftLocation} />
      </section>

      <section className="filter-section">
        <h3>Sports</h3>
        <div className="choice-chips">
          {sports.map((sport) => (
            <button key={sport} type="button" className={`choice-chip ${draft.sports.includes(sport) ? 'selected' : ''}`} aria-pressed={draft.sports.includes(sport)} onClick={() => set({ sports: toggle(draft.sports, sport) })}>
              {sport}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Level</h3>
        <div className="choice-chips">
          {levelOptions.map((level) => (
            <button key={level} type="button" className={`choice-chip ${draft.levels.includes(level) ? 'selected' : ''}`} aria-pressed={draft.levels.includes(level)} onClick={() => set({ levels: toggle(draft.levels, level) })}>
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Age: {draft.ageMin} to {draft.ageMax === ageLimits.max ? `${ageLimits.max}+` : draft.ageMax}</h3>
        <label className="location-field">
          <span>From</span>
          <input type="range" min={ageLimits.min} max={ageLimits.max} value={draft.ageMin} aria-label="Minimum age"
            onChange={(event) => set({ ageMin: Math.min(Number(event.target.value), draft.ageMax) })} />
        </label>
        <label className="location-field">
          <span>To</span>
          <input type="range" min={ageLimits.min} max={ageLimits.max} value={draft.ageMax} aria-label="Maximum age"
            onChange={(event) => set({ ageMax: Math.max(Number(event.target.value), draft.ageMin) })} />
        </label>
      </section>

      <section className="filter-section">
        <h3>Usually free</h3>
        <div className="choice-chips">
          {availabilityOptions.map((slot) => (
            <button key={slot} type="button" className={`choice-chip ${draft.availability.includes(slot) ? 'selected' : ''}`} aria-pressed={draft.availability.includes(slot)} onClick={() => set({ availability: toggle(draft.availability, slot) })}>
              {slot}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Only show</h3>
        <div className="filter-toggles">
          {toggles.map((item) => (
            <label key={item.key} className="filter-toggle">
              <span><strong>{item.label}</strong><small>{item.hint}</small></span>
              <input type="checkbox" checked={draft[item.key]} onChange={(event) => set({ [item.key]: event.target.checked } as Partial<MateFilters>)} />
            </label>
          ))}
        </div>
      </section>
    </SidePanel>
  )
}
