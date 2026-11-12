import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ActivityCard, type ActivityCardData } from '../components/ActivityCard'
import { ActivityFilterPanel } from '../components/ActivityFilterPanel'
import { ActivityCardSkeleton, Skeleton } from '../components/Skeleton'
import { activities as demoActivities } from '../data/mockData'
import { getSavedActivityFeed, type FeedActivity } from '../lib/activityParticipation'
import {
  applyActivityFilters,
  countActiveActivityFilters,
  defaultActivityFilters,
  type ActivityFilters,
} from '../lib/activityFilters'
import { hasDemoJoinRequest } from '../lib/demoParticipation'
import { getLocationPreference, type LocationPreference } from '../lib/distance'
import { useBackToMore } from '../lib/moreNavigation'
import { useViewerProfile } from '../lib/viewerProfile'
import { useSportCatalog } from '../lib/useSportCatalog'

// Kept while the app is open, so coming back is instant (then refreshed).
let cachedFeed: FeedActivity[] | null = null

// All upcoming activities, any distance, with search and filters.
// Location here only applies to this page: it does not change Home.
export function AllActivitiesScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backToMore = useBackToMore()
  const viewer = useViewerProfile()
  const viewerSports = viewer.status === 'ready' && viewer.profile ? viewer.profile.sports.map((sport) => sport.name) : []
  const [feed, setFeed] = useState<FeedActivity[]>(() => cachedFeed ?? [])
  const [isLoading, setIsLoading] = useState(cachedFeed === null)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ActivityFilters>(defaultActivityFilters)
  const [searchLocation, setSearchLocation] = useState<LocationPreference | null>(() => getLocationPreference())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [now] = useState(() => new Date())

  useEffect(() => {
    let active = true
    getSavedActivityFeed()
      .then((result) => {
        cachedFeed = result
        if (active) setFeed(result)
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load activities.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const allActivities = useMemo<ActivityCardData[]>(() => [
    ...feed.map(({ viewerJoinStatus, ...activity }) => ({ ...activity, joinStatus: viewerJoinStatus ?? undefined })),
    ...demoActivities.map((activity) => ({ ...activity, joinStatus: hasDemoJoinRequest(activity.id) ? 'pending' as const : undefined })),
  ], [feed])
  // Every sport from Edit my sports, plus any sport only used on an activity.
  const sportCatalog = useSportCatalog()
  const sports = useMemo(() => [...new Set([...sportCatalog, ...allActivities.map((activity) => activity.sport)])].sort(), [sportCatalog, allActivities])
  const levels = useMemo(() => [...new Set(allActivities.map((activity) => activity.level).filter(Boolean))].sort(), [allActivities])

  const context = { viewerSports, query, now }
  const results = applyActivityFilters(allActivities, filters, { ...context, location: searchLocation })
  const activeFilterCount = countActiveActivityFilters(filters, searchLocation)

  function goBack() {
    if (location.state?.from === '/more' || !(window.history.state?.idx > 0)) backToMore()
    else navigate(-1)
  }

  function clearAll() {
    setQuery('')
    setFilters(defaultActivityFilters)
    setSearchLocation(null)
  }

  const areaLabel = searchLocation
    ? `${searchLocation.label.replace(/^Near /, '')}${searchLocation.radiusKm === null ? '' : ` · within ${searchLocation.radiusKm} km`}`
    : 'All of Adelaide'

  return (
    <div className="screen mates-screen">
      <header className="mates-header">
        <button type="button" className="icon-button" aria-label="Back" onClick={goBack}>
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Find something to join</p>
          <h1>Activities</h1>
        </div>
      </header>

      <div className="mate-search-row">
        <label className="mate-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by sport, place or host"
            aria-label="Search activities"
          />
        </label>
        <button
          type="button"
          className={`mate-filter-button ${activeFilterCount ? 'active' : ''}`}
          onClick={() => setFiltersOpen(true)}
          aria-label={activeFilterCount ? `Filters, ${activeFilterCount} on` : 'Filters'}
        >
          <SlidersHorizontal aria-hidden="true" />
          {activeFilterCount > 0 && <span className="mate-filter-count" aria-hidden="true">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="mates-results-heading">
        <h3>{areaLabel}</h3>
        {isLoading ? <Skeleton width={70} height={12} /> : <span>{results.length} {results.length === 1 ? 'activity' : 'activities'}</span>}
      </div>

      {loadError && (
        <p className="activity-feed-notice" role="status">
          Saved activities could not be loaded. Showing demo activities. {loadError}
        </p>
      )}

      {isLoading ? (
        <div className="card-list" role="status" aria-label="Loading activities">
          {[0, 1, 2].map((item) => <ActivityCardSkeleton key={item} />)}
        </div>
      ) : results.length > 0 ? (
        <div className="card-list">
          {results.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onClick={() => navigate(`/activity/${activity.id}`)} />
          ))}
        </div>
      ) : (
        <div className="mate-empty-state">
          <h2>No activities found</h2>
          <p>Try another search, fewer filters or a bigger distance. Or post your own callout.</p>
          <button type="button" onClick={clearAll}>Clear filters</button>
        </div>
      )}

      {filtersOpen && (
        <ActivityFilterPanel
          filters={filters}
          location={searchLocation}
          sports={sports}
          levels={levels}
          countFor={(draft, draftLocation) => applyActivityFilters(allActivities, draft, { ...context, location: draftLocation }).length}
          onApply={(next, nextLocation) => {
            setFilters(next)
            setSearchLocation(nextLocation)
            setFiltersOpen(false)
          }}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  )
}
