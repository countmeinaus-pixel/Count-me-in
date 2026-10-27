import { useMemo, useState } from 'react'
import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, ListFilter, MapPin, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { Button } from '../components/Button'
import { activities, filters } from '../data/mockData'

type ViewMode = 'list' | 'map' | 'calendar'
type CalendarMode = 'week' | 'month'

const monthLookup: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const activityDateKey = (dateText: string) => {
  const monthMatch = Object.keys(monthLookup).find((month) => dateText.includes(month))
  const dayMatch = dateText.match(/(\d{1,2})/)

  if (!monthMatch || !dayMatch) return null

  const month = monthLookup[monthMatch]
  const day = Number(dayMatch[1])
  const date = new Date(2026, month, day)
  return toDateKey(date)
}

const mapPins = {
  1: { x: '28%', y: '52%' },
  2: { x: '52%', y: '28%' },
  3: { x: '66%', y: '62%' },
  4: { x: '40%', y: '74%' },
} as const

export function HomeScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('My sports')
  const [view, setView] = useState<ViewMode>('list')
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week')
  const [calendarOffset, setCalendarOffset] = useState(0)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const visible = useMemo(() => {
    if (filter === 'My sports') return activities
    return activities.filter((item) => item.sport === filter)
  }, [filter])

  const calendarLabel = useMemo(() => {
    const base = new Date(2026, 1, 22)
    const start = new Date(base)
    start.setDate(base.getDate() + calendarOffset * 7)

    if (calendarMode === 'week') {
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`
    }

    return start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  }, [calendarMode, calendarOffset])

  const calendarDays = useMemo(() => {
    const base = new Date(2026, 1, 22)
    const start = new Date(base)
    start.setDate(base.getDate() + calendarOffset * 7)

    if (calendarMode === 'week') {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        return {
          date,
          label: date.toLocaleDateString('en-AU', { weekday: 'short' }),
          day: date.toLocaleDateString('en-AU', { day: 'numeric' }),
        }
      })
    }

    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
    const padding = (monthStart.getDay() + 6) % 7
    const cells: Array<{ date: Date | null; label: string; day: string }> = []

    for (let index = 0; index < padding; index += 1) {
      cells.push({ date: null, label: '', day: '' })
    }

    const monthLength = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    for (let day = 1; day <= monthLength; day += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), day)
      cells.push({
        date,
        label: date.toLocaleDateString('en-AU', { weekday: 'short' }),
        day: String(day),
      })
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, label: '', day: '' })
    }

    return cells
  }, [calendarMode, calendarOffset])

  const calendarActivityMap = useMemo(() => {
    const map = new Map<string, typeof activities>()
    visible.forEach((activity) => {
      const key = activityDateKey(activity.date)
      if (!key) return
      const existing = map.get(key) ?? []
      existing.push(activity)
      map.set(key, existing)
    })
    return map
  }, [visible])

  const selectedDayActivities = useMemo(() => {
    if (!selectedDateKey) return []
    return calendarActivityMap.get(selectedDateKey) ?? []
  }, [calendarActivityMap, selectedDateKey])

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return ''
    const [year, month, day] = selectedDateKey.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }, [selectedDateKey])

  return (
    <div className="screen">
      <header className="topbar">
        <div className="location"><MapPin />Adelaide</div>
        <button className="icon-button" aria-label="Notifications"><Bell /></button>
      </header>

      <section className="intro">
        <p className="eyebrow">Good morning</p>
        <h1>Ready to get out there, Jai?</h1>
      </section>

      <div className="filter-row">
        {filters.map((item) => (
          <button
            key={item}
            className={`chip ${filter === item ? 'selected' : ''}`}
            onClick={() => setFilter(item)}
            type="button"
          >
            {filter === item && <Check />}
            {item}
          </button>
        ))}
      </div>

      <div className="view-toggle" aria-label="Select view mode">
        <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} type="button">
          <ListFilter />
          List
        </button>
        <button className={view === 'map' ? 'selected' : ''} onClick={() => setView('map')} type="button">
          <MapPin />
          Map
        </button>
        <button className={view === 'calendar' ? 'selected' : ''} onClick={() => setView('calendar')} type="button">
          <CalendarDays />
          Calendar
        </button>
      </div>

      {view === 'list' && (
        <>
          <div className="section-heading">
            <h2>This week</h2>
            <span>{visible.length} callouts</span>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">⌁</div>
              <h3>Nothing on for this sport yet</h3>
              <p>Be the first. Post a callout.</p>
              <Button onClick={() => navigate('/create')}>Create activity</Button>
            </div>
          ) : (
            <div className="card-list">
              {visible.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => navigate(`/activity/${activity.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'map' && (
        <div className="map-panel">
          <div className="map-surface" aria-label="Map of Adelaide callouts">
            <div className="map-water" />
            {visible.map((activity) => {
              const pin = mapPins[activity.id as keyof typeof mapPins] ?? { x: '50%', y: '50%' }
              return (
                <button
                  key={activity.id}
                  type="button"
                  className="map-pin"
                  style={{ left: pin.x, top: pin.y }}
                  onClick={() => navigate(`/activity/${activity.id}`)}
                  aria-label={`Open ${activity.title}`}
                >
                  <span>{activity.sport.slice(0, 1)}</span>
                </button>
              )
            })}
          </div>

          <div className="map-callouts">
            {visible.map((activity) => (
              <button key={activity.id} type="button" className="map-callout" onClick={() => navigate(`/activity/${activity.id}`)}>
                <div className="map-callout-header">
                  <span>{activity.sport}</span>
                  <time>{activity.date.split('·')[0]?.trim()}</time>
                </div>
                <strong>{activity.title}</strong>
                <p>{activity.place}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <div className="calendar-panel">
          <div className="calendar-toolbar">
            <button type="button" onClick={() => setCalendarOffset((value) => value - 1)} aria-label="Previous period">
              <ChevronLeft />
            </button>
            <div>
              <strong>{calendarMode === 'week' ? 'Next week' : 'This month'}</strong>
              <span>{calendarLabel}</span>
            </div>
            <button type="button" onClick={() => setCalendarOffset((value) => value + 1)} aria-label="Next period">
              <ChevronRight />
            </button>
          </div>

          <div className="calendar-mode-switch">
            <button type="button" className={calendarMode === 'week' ? 'selected' : ''} onClick={() => setCalendarMode('week')}>Week</button>
            <button type="button" className={calendarMode === 'month' ? 'selected' : ''} onClick={() => setCalendarMode('month')}>Month</button>
          </div>

          {calendarMode === 'week' ? (
            <div className="calendar-grid week-grid">
              {calendarDays.map(({ date, label, day }) => {
                if (!date) return null

                const dateKey = toDateKey(date)
                const dayActivities = calendarActivityMap.get(dateKey) ?? []
                const extra = Math.max(dayActivities.length - 3, 0)
                const visibleIcons = dayActivities.slice(0, 3)
                const isSelected = selectedDateKey === dateKey

                return (
                  <button
                    key={`${label}-${day}`}
                    type="button"
                    className={`day-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDateKey(dateKey)}
                  >
                    <span>{label}</span>
                    <strong>{day}</strong>

                    {dayActivities.length > 0 ? (
                      <div className="day-icons" aria-label={`${dayActivities.length} activities on ${label} ${day}`}>
                        {visibleIcons.map((activity) => (
                          <span key={activity.id} className="day-icon" title={activity.sport}>
                            {activity.sport.slice(0, 1)}
                          </span>
                        ))}
                        {extra > 0 && <span className="day-overflow">+{extra}</span>}
                      </div>
                    ) : (
                      <div className="day-empty">No plans</div>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="calendar-grid month-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                <div key={label} className="month-label">{label}</div>
              ))}
              {calendarDays.map(({ date, day }, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="month-cell empty" />
                }

                const dateKey = toDateKey(date)
                const dayActivities = calendarActivityMap.get(dateKey) ?? []
                const extra = Math.max(dayActivities.length - 2, 0)
                const isSelected = selectedDateKey === dateKey

                return (
                  <button
                    key={`month-${dateKey}`}
                    type="button"
                    className={`month-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDateKey(dateKey)}
                  >
                    <span>{day}</span>
                    {(dayActivities.slice(0, 2)).map((activity) => (
                      <small key={activity.id}>{activity.sport}</small>
                    ))}
                    {extra > 0 && <small className="month-overflow">+{extra}</small>}
                  </button>
                )
              })}
            </div>
          )}

          {selectedDateKey && selectedDayActivities.length > 0 && (
            <div className="selected-day-panel">
              <div className="selected-day-header">
                <h3>{selectedDateLabel}</h3>
                <span>{selectedDayActivities.length} callouts</span>
              </div>

              <div className="selected-day-list">
                {selectedDayActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => navigate(`/activity/${activity.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {visible.length === 0 && (
        <div className="empty-state">
          <Search />
          <h2>Nothing on for this sport yet</h2>
          <p>Be the first. Post a callout.</p>
          <Button onClick={() => navigate('/create')}>Create activity</Button>
        </div>
      )}
    </div>
  )
}
