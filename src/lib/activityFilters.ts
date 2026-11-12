import type { ActivityCardData } from '../components/ActivityCard'
import { distanceKm, isWithinRadius, suburbCoordinates, type LocationPreference } from './distance'
import type { Coordinates } from './location'

// Filters for the Activities page (all upcoming activities, any distance).

// The levels from Create activity ("Who is this for?"), shared with Edit activity and the filters.
export const activityLevels = ['Beginner friendly', 'Intermediate', 'Experienced']

// Older activities say "Beginner"; treat that as Beginner friendly.
export function normalizeActivityLevel(level: string) {
  return level === 'Beginner' ? 'Beginner friendly' : level
}

export type ActivitySort = 'soonest' | 'closest' | 'spots'
export type ActivityWhen = 'any' | 'today' | 'week' | 'weekend' | 'month'

export type ActivityFilters = {
  sort: ActivitySort
  when: ActivityWhen
  sports: string[]
  levels: string[]
  spotsLeftOnly: boolean
  mySportsOnly: boolean
}

export const defaultActivityFilters: ActivityFilters = {
  sort: 'soonest',
  when: 'any',
  sports: [],
  levels: [],
  spotsLeftOnly: false,
  mySportsOnly: false,
}

export function activityCoordinates(activity: ActivityCardData): Coordinates | null {
  return activity.latitude != null && activity.longitude != null
    ? { latitude: activity.latitude, longitude: activity.longitude }
    : suburbCoordinates(activity.suburb)
}

function startOfDay(date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

function matchesWhen(startsAt: Date, when: ActivityWhen, now: Date) {
  if (when === 'any') return true
  const today = startOfDay(now)
  const dayMs = 24 * 60 * 60 * 1000
  const days = (startOfDay(startsAt).getTime() - today.getTime()) / dayMs
  if (when === 'today') return days === 0
  if (when === 'week') return days < 7
  if (when === 'month') return days < 30
  // This weekend: the coming Saturday and Sunday (or today, if it is the weekend).
  const weekday = startsAt.getDay()
  return (weekday === 0 || weekday === 6) && days < 7
}

export function applyActivityFilters(
  list: ActivityCardData[],
  filters: ActivityFilters,
  context: { location: LocationPreference | null; viewerSports: string[]; query: string; now: Date },
) {
  const query = context.query.trim().toLowerCase()
  const result = list.filter((activity) => {
    if (activity.startsAt.getTime() < context.now.getTime()) return false
    if (query && ![activity.title, activity.place, activity.suburb, activity.sport, activity.host].some((text) => text?.toLowerCase().includes(query))) return false
    if (!matchesWhen(activity.startsAt, filters.when, context.now)) return false
    if (filters.sports.length && !filters.sports.includes(activity.sport)) return false
    if (filters.mySportsOnly && !context.viewerSports.includes(activity.sport)) return false
    if (filters.levels.length && !filters.levels.includes(normalizeActivityLevel(activity.level))) return false
    if (filters.spotsLeftOnly && activity.spotsTaken >= activity.spotsTotal) return false
    return isWithinRadius(context.location, activityCoordinates(activity))
  })

  const distance = (activity: ActivityCardData) => {
    const point = activityCoordinates(activity)
    return context.location && point ? distanceKm(context.location, point) : Infinity
  }
  return result.sort((a, b) => {
    if (filters.sort === 'closest') return distance(a) - distance(b) || a.startsAt.getTime() - b.startsAt.getTime()
    if (filters.sort === 'spots') return (b.spotsTotal - b.spotsTaken) - (a.spotsTotal - a.spotsTaken) || a.startsAt.getTime() - b.startsAt.getTime()
    return a.startsAt.getTime() - b.startsAt.getTime()
  })
}

// How many filters are on, for the badge on the filter button.
export function countActiveActivityFilters(filters: ActivityFilters, location: LocationPreference | null) {
  return (filters.when !== 'any' ? 1 : 0)
    + filters.sports.length
    + filters.levels.length
    + (filters.spotsLeftOnly ? 1 : 0)
    + (filters.mySportsOnly ? 1 : 0)
    + (location ? 1 : 0)
}
