import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Bike, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Fish, Footprints, ListFilter, MapPin, Mountain, Waves } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ActivityCard, type ActivityCardData } from '../components/ActivityCard'
import { Button } from '../components/Button'
import { activities, currentUser } from '../data/mockData'
import { CrewSection } from '../components/CrewSection'
import { LocationControls } from '../components/LocationControls'
import { SidePanel } from '../components/SidePanel'
import { isWithinRadius, memberCoordinates, setLocationPreference, suburbCoordinates, useLocationPreference, type LocationPreference } from '../lib/distance'
import {
  getSavedActivityFeed,
  type FeedActivity,
} from '../lib/activityParticipation'
import { hasDemoJoinRequest } from '../lib/demoParticipation'
import { getProfilePath } from '../lib/profile'
import { useViewerProfile } from '../lib/viewerProfile'
import { defaultLocationPreferences, getLocationPreferences } from '../lib/localPreferences'
import { distanceKm } from '../lib/location'
import { getSuburbCoordinates } from '../data/suburbCoordinates'
import { useCommunityMembers } from '../lib/useCommunityMembers'
import { friendNames, getCrewSuggestions } from '../lib/friends'
import { useMyFriendships } from '../lib/friendships'
import { getBlockedUsers } from '../lib/localPreferences'
import { getBlockedProfiles } from '../lib/moderation'
import { Avatar } from '../components/Avatar'
import { ActivityCardSkeleton, Skeleton } from '../components/Skeleton'
import { startAppTour } from '../lib/appTour'
import { hasFinishedTour } from '../lib/onboardingFlags'
import { PersonalRecordCard } from '../components/PersonalRecordCard'
import { getRecordsToConfirm, type PersonalRecord } from '../lib/personalRecords'
import { getUnreadNotificationCount } from '../lib/notifications'

// Loaded only when the Map tab opens, so Home stays fast.
const ActivityMap = lazy(() => import('../components/ActivityMap'))

type ViewMode = 'list' | 'map' | 'calendar'
type CalendarMode = 'week' | 'month'

const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function getWeekStart(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  return start
}

const activityIcons = {
  fish: Fish,
  mountain: Mountain,
  run: Footprints,
  waves: Waves,
  bike: Bike,
  gym: Dumbbell,
} as const

let cachedFeed: FeedActivity[] | null = null

export function HomeScreen() {
  const navigate = useNavigate()
  const locationPreference = useLocationPreference()
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationDraft, setLocationDraft] = useState<LocationPreference | null>(null)
  const filterRowRef = useRef<HTMLDivElement | null>(null)
  const { members: communityMembers } = useCommunityMembers()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  useEffect(() => {
    let active = true
    getUnreadNotificationCount()
      .then((count) => {
        if (active) setUnreadNotifications(count)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
  const [filter, setFilter] = useState('My sports')
  const [view, setView] = useState<ViewMode>('list')
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week')
  const [calendarOffset, setCalendarOffset] = useState(0)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  // Your own profile, shared between screens; the demo user only when signed out.
  const viewer = useViewerProfile()
  const viewerProfile = viewer.status === 'ready' ? viewer.profile : null
  const isViewerLoading = viewer.status === 'loading'
  const firstName = viewerProfile?.firstName ?? currentUser.name
  const userSportNames = useMemo(
    () => (viewerProfile ?? currentUser).sports.map((sport) => sport.name),
    [viewerProfile],
  )
  const userSuburb = viewerProfile?.suburb ?? currentUser.suburb
  const [blockedNames, setBlockedNames] = useState<string[]>(() => {
    try {
      return getBlockedUsers()
    } catch {
      return []
    }
  })
  const [recordsToConfirm, setRecordsToConfirm] = useState<PersonalRecord[]>([])
  const [recordsVersion, setRecordsVersion] = useState(0)
  useEffect(() => {
    let active = true
    getRecordsToConfirm(3)
      .then((records) => {
        if (active) setRecordsToConfirm(records)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [recordsVersion])
  const sportLoadError = viewer.status === 'ready' ? viewer.error : ''
  // The last feed is kept while you move around the app, and refreshed in the background.
  const [savedActivities, setSavedActivities] = useState<FeedActivity[]>(() => cachedFeed ?? [])
  const [isFeedLoading, setIsFeedLoading] = useState(cachedFeed === null)
  const [activityLoadError, setActivityLoadError] = useState('')
  const [filterScroll, setFilterScroll] = useState({ isScrollable: false, canScrollLeft: false, canScrollRight: false, activeDot: 0, dotCount: 0 })
  const filterOptions = useMemo(() => ['My sports', ...new Set(userSportNames)], [userSportNames])

  // The tour runs once per device for signed-in members.
  useEffect(() => {
    if (viewerProfile && !hasFinishedTour()) startAppTour()
  }, [viewerProfile])

  useEffect(() => {
    let active = true
    getBlockedProfiles()
      .then((profiles) => {
        if (active) setBlockedNames((current) => [...new Set([...current, ...profiles.map((profile) => profile.name)])])
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  // Signed in: your real friends. Signed out: the demo friends.
  const { data: friendships } = useMyFriendships()
  const crewFriends = useMemo(() => {
    if (friendships) return friendships.friends.filter((member) => !blockedNames.includes(member.name))
    const seen = new Set<string>()
    return communityMembers.filter((member) => {
      if (!friendNames.includes(member.name) || blockedNames.includes(member.name) || seen.has(member.name)) return false
      seen.add(member.name)
      return true
    })
  }, [communityMembers, blockedNames, friendships])
  const crewSuggestions = useMemo(
    () => getCrewSuggestions(
      communityMembers.filter((member) => isWithinRadius(locationPreference, memberCoordinates(member))),
      { name: firstName, sports: userSportNames, suburb: userSuburb },
      [...(friendships ? friendships.friends.map((member) => member.name) : friendNames), ...blockedNames],
      10,
    ),
    [communityMembers, firstName, userSportNames, userSuburb, blockedNames, friendships, locationPreference],
  )

  useEffect(() => {
    let active = true
    void getSavedActivityFeed()
      .then((result) => {
        cachedFeed = result
        if (active) setSavedActivities(result)
      })
      .catch((error: unknown) => {
        if (active)
          setActivityLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load saved activities.',
          )
      })
      .finally(() => {
        if (active) setIsFeedLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!filterOptions.includes(filter)) setFilter('My sports')
  }, [filter, filterOptions])

  const allActivities = useMemo(() => {
    const savedCards: ActivityCardData[] = savedActivities.map(
      ({ viewerJoinStatus, ...activity }) => ({
        ...activity,
        joinStatus: viewerJoinStatus ?? undefined,
      }),
    )
    const demoCards: ActivityCardData[] = activities.map((activity) => ({
      ...activity,
      joinStatus: hasDemoJoinRequest(activity.id) ? 'pending' : undefined,
    }))
    return [...savedCards, ...demoCards]
  }, [savedActivities])
  const visible = useMemo(
    () => (filter === 'My sports' ? allActivities : allActivities.filter((item) => item.sport === filter)),
    [allActivities, filter],
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const row = filterRowRef.current
    if (!row) return

    const updateScrollState = () => {
      const maxScroll = row.scrollWidth - row.clientWidth
      const isScrollable = maxScroll > 1
      const dotCount = isScrollable ? Math.ceil(row.scrollWidth / row.clientWidth) : 0
      const progress = maxScroll > 0 ? row.scrollLeft / maxScroll : 0
      setFilterScroll({
        isScrollable,
        canScrollLeft: row.scrollLeft > 1,
        canScrollRight: maxScroll - row.scrollLeft > 1,
        activeDot: isScrollable ? Math.round(progress * (dotCount - 1)) : 0,
        dotCount,
      })
    }

    updateScrollState()
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(row)
    row.addEventListener('scroll', updateScrollState, { passive: true })
    return () => {
      resizeObserver.disconnect()
      row.removeEventListener('scroll', updateScrollState)
    }
  }, [filterOptions])

  const calendarLabel = useMemo(() => {
    const base = getWeekStart(now)
    const start = new Date(base)
    start.setDate(base.getDate() + calendarOffset * 7)

    if (calendarMode === 'week') {
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`
    }

    return start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  }, [calendarMode, calendarOffset, now])

  const calendarDays = useMemo(() => {
    const base = getWeekStart(now)
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
  }, [calendarMode, calendarOffset, now])

  const calendarActivityMap = useMemo(() => {
    const map = new Map<string, ActivityCardData[]>()
    visible.forEach((activity) => {
      const key = toDateKey(activity.startsAt)
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
        <button
          type="button"
          className="location location-button"
          onClick={() => {
            setLocationDraft(locationPreference)
            setLocationOpen(true)
          }}
          aria-label={`Location: ${locationPreference ? `${locationPreference.label}, ${locationPreference.radiusKm === null ? 'no distance limit' : `within ${locationPreference.radiusKm} km`}` : 'all of Adelaide'}. Change location`}
        >
          <MapPin />
          {locationPreference?.label ?? 'Adelaide'}
          {locationPreference?.radiusKm != null && <small>· {locationPreference.radiusKm} km</small>}
          <ChevronDown className="location-chevron" aria-hidden="true" />
        </button>
        <button data-tour="home-notifications" className="icon-button notification-bell" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} new` : 'Notifications'} onClick={() => navigate('/notifications')} type="button"><Bell />{unreadNotifications > 0 && <span className="notification-bell-dot" aria-hidden="true" />}</button>
      </header>

      <section className="intro">
        <p className="eyebrow">
          {now.getHours() < 5
            ? 'Good evening'
            : now.getHours() < 12
              ? 'Good morning'
              : now.getHours() < 17
                ? 'Good afternoon'
                : 'Good evening'}
        </p>
        {isViewerLoading
          ? <h1><Skeleton width="min(420px, 80%)" height={32} radius={8} /></h1>
          : <h1>Ready to get out there, {firstName}?</h1>}
      </section>

      <div className={`filter-scroll-shell ${filterScroll.isScrollable ? 'is-scrollable' : ''} ${filterScroll.canScrollLeft ? 'can-scroll-left' : ''} ${filterScroll.canScrollRight ? 'can-scroll-right' : ''}`}>
        <div className="filter-row" ref={filterRowRef} data-tour="home-filters">
          {isViewerLoading
            ? [96, 88, 72, 84].map((width) => <Skeleton key={width} width={width} height={36} radius={8} />)
            : filterOptions.map((item) => (
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
      </div>
      {sportLoadError && <p className="inline-error" role="alert">{sportLoadError}</p>}
      {filterScroll.isScrollable && (
        <div className="filter-scroll-dots" aria-label={`${filterScroll.activeDot + 1} of ${filterScroll.dotCount} filter sections`}>
          {Array.from({ length: filterScroll.dotCount }, (_, index) => (
            <span key={index} className={index === filterScroll.activeDot ? 'active' : ''} />
          ))}
        </div>
      )}

      <div className="view-toggle" aria-label="Select view mode" data-tour="home-views">
        <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} type="button" aria-pressed={view === 'list'}>
          <ListFilter />
          List
        </button>
        <button className={view === 'map' ? 'selected' : ''} onClick={() => setView('map')} type="button" aria-pressed={view === 'map'}>
          <MapPin />
          Map
        </button>
        <button className={view === 'calendar' ? 'selected' : ''} onClick={() => setView('calendar')} type="button" aria-pressed={view === 'calendar'}>
          <CalendarDays />
          Calendar
        </button>
      </div>

      {view === 'list' && (
        <>
          <div className="section-heading">
            <h2>This week</h2>
            {isFeedLoading ? <Skeleton width={70} height={12} /> : <span>{visible.length} callouts</span>}
          </div>

          {isFeedLoading ? (
            <div className="card-list" role="status" aria-label="Loading activities">
              {[0, 1, 2].map((item) => <ActivityCardSkeleton key={item} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">⌁</div>
              <h3>{radiusKm !== null && origin ? `Nothing on within ${radiusKm} km yet` : 'Nothing on for this sport yet'}</h3>
              <p>{radiusKm !== null && origin ? 'Be the first, or search further away in Settings > Location.' : 'Be the first. Post a callout.'}</p>
              <Button onClick={() => navigate('/create')}>Create activity</Button>
            </div>
          ) : (
            <>
              {activityLoadError && (
                <p className="activity-feed-notice" role="status">
                  Saved activities could not be loaded. Showing demo activities.
                  {" "}{activityLoadError}
                </p>
              )}
              <div className="card-list">
                {visible.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => navigate(`/activity/${activity.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === 'map' && (
        <div className="map-panel">
          <Suspense fallback={<div className="activity-map activity-map-loading" role="status">Loading map…</div>}>
            <ActivityMap activities={visible} onOpenActivity={(id) => navigate(`/activity/${id}`)} />
          </Suspense>

          <div className="map-callouts">
            {visible.map((activity) => (
              <button key={activity.id} type="button" className="map-callout" onClick={() => navigate(`/activity/${activity.id}`)}>
                <div className="map-callout-header">
                  <span>{activity.sport}</span>
                  <time>{activity.startsAt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</time>
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
              <strong>{calendarMode === 'week'
                ? calendarOffset === 0 ? 'This week' : calendarOffset === 1 ? 'Next week' : calendarLabel
                : 'This month'}</strong>
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
                        {visibleIcons.map((activity) => {
                          const Icon = activityIcons[activity.icon]
                          return (
                            <span key={activity.id} className="day-icon" title={activity.sport}>
                              <Icon aria-hidden="true" />
                            </span>
                          )
                        })}
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
                    {dayActivities.length > 0 && (
                      <div className="day-icons month-day-icons" aria-label={`${dayActivities.length} activities on ${day}`}>
                        {dayActivities.slice(0, 2).map((activity) => {
                          const Icon = activityIcons[activity.icon]
                          return (
                            <span key={activity.id} className="day-icon" title={activity.sport}>
                              <Icon aria-hidden="true" />
                            </span>
                          )
                        })}
                        {extra > 0 && <span className="day-overflow">+{extra}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {selectedDateKey && (
            <div className="selected-day-panel">
              <div className="selected-day-header">
                <h3>{selectedDateLabel}</h3>
                <span>{selectedDayActivities.length} callouts</span>
              </div>

              {selectedDayActivities.length > 0 ? (
                <div className="selected-day-list">
                  {selectedDayActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={{
                        ...activity,
                        joinStatus:
                          typeof activity.id === 'number' &&
                          hasDemoJoinRequest(activity.id)
                            ? 'pending'
                            : activity.joinStatus,
                      }}
                      onClick={() => navigate(`/activity/${activity.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="selected-day-empty">No activities scheduled for this day.</p>
              )}
            </div>
          )}
        </div>
      )}

      {recordsToConfirm.length > 0 && (
        <section className="pr-section" aria-labelledby="home-pr-heading">
          <div>
            <p className="eyebrow">Keep each other honest</p>
            <h2 id="home-pr-heading">New PRs to confirm</h2>
          </div>
          <div className="pr-list">
            {recordsToConfirm.map((record) => (
              <PersonalRecordCard
                key={record.id}
                record={record}
                showOwner
                onOpenOwner={() => navigate(getProfilePath({ id: record.userId, name: record.ownerName }))}
                onChanged={() => window.setTimeout(() => setRecordsVersion((version) => version + 1), 1200)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="crew-preview">
        <div className="crew-preview-heading">
          <div>
            <p className="eyebrow">Good people, good plans</p>
            <h2>Find your crew</h2>
          </div>
          <button type="button" className="text-action" onClick={() => navigate('/more/crew')}>View all</button>
        </div>

        <CrewSection
          friends={crewFriends}
          suggestions={crewSuggestions}
          activities={allActivities}
          onOpenProfile={(member) => navigate(getProfilePath(member))}
          onOpenActivity={(activity) => navigate(`/activity/${activity.id}`)}
        />
      </section>

      {locationOpen && (
        <SidePanel
          title="Your location"
          onClose={() => setLocationOpen(false)}
          footer={
            <>
              <button type="button" className="button button-secondary button-md" onClick={() => {
                setLocationPreference(null)
                setLocationOpen(false)
              }}>All of Adelaide</button>
              <button type="button" className="button button-primary button-md" onClick={() => {
                setLocationPreference(locationDraft)
                setLocationOpen(false)
              }}>Show results</button>
            </>
          }
        >
          <p className="location-hint">Activities and suggested mates on Home are filtered to this area.</p>
          <LocationControls value={locationDraft} onChange={setLocationDraft} />
        </SidePanel>
      )}
    </div>
  )
}
