import { useState } from 'react'
import type { LocationPreference } from '../lib/distance'
import { defaultActivityFilters, type ActivityFilters, type ActivitySort, type ActivityWhen } from '../lib/activityFilters'
import { LocationControls } from './LocationControls'
import { SidePanel } from './SidePanel'

const sortOptions: Array<{ value: ActivitySort; label: string }> = [
  { value: 'soonest', label: 'Soonest' },
  { value: 'closest', label: 'Closest' },
  { value: 'spots', label: 'Most spots left' },
]
const whenOptions: Array<{ value: ActivityWhen; label: string }> = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
]

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

// Same panel as the Find new crew filters, for activities.
export function ActivityFilterPanel({
  filters,
  location,
  sports,
  levels,
  countFor,
  onApply,
  onClose,
}: {
  filters: ActivityFilters
  location: LocationPreference | null
  sports: string[]
  levels: string[]
  countFor: (filters: ActivityFilters, location: LocationPreference | null) => number
  onApply: (filters: ActivityFilters, location: LocationPreference | null) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filters)
  const [draftLocation, setDraftLocation] = useState(location)
  const set = (patch: Partial<ActivityFilters>) => setDraft((current) => ({ ...current, ...patch }))
  const resultCount = countFor(draft, draftLocation)

  return (
    <SidePanel
      title="Filters"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-secondary button-md" onClick={() => {
            setDraft(defaultActivityFilters)
            setDraftLocation(null)
          }}>Reset</button>
          <button type="button" className="button button-primary button-md" onClick={() => onApply(draft, draftLocation)}>
            Show {resultCount} {resultCount === 1 ? 'activity' : 'activities'}
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
        <h3>When</h3>
        <div className="choice-chips">
          {whenOptions.map((option) => (
            <button key={option.value} type="button" className={`choice-chip ${draft.when === option.value ? 'selected' : ''}`} aria-pressed={draft.when === option.value} onClick={() => set({ when: option.value })}>
              {option.label}
            </button>
          ))}
        </div>
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
          {levels.map((level) => (
            <button key={level} type="button" className={`choice-chip ${draft.levels.includes(level) ? 'selected' : ''}`} aria-pressed={draft.levels.includes(level)} onClick={() => set({ levels: toggle(draft.levels, level) })}>
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Only show</h3>
        <div className="filter-toggles">
          <label className="filter-toggle">
            <span><strong>Spots left</strong><small>Hide activities that are full</small></span>
            <input type="checkbox" checked={draft.spotsLeftOnly} onChange={(event) => set({ spotsLeftOnly: event.target.checked })} />
          </label>
          <label className="filter-toggle">
            <span><strong>My sports</strong><small>Only sports on your profile</small></span>
            <input type="checkbox" checked={draft.mySportsOnly} onChange={(event) => set({ mySportsOnly: event.target.checked })} />
          </label>
        </div>
      </section>
    </SidePanel>
  )
}
