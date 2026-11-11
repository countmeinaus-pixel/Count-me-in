import type { CommunityMember } from '../data/mockData'
import { distanceKm, isWithinRadius, memberCoordinates, suburbCoordinates, type LocationPreference } from './distance'

export type MateSort = 'closest' | 'common' | 'meetups' | 'newest'

export type MateFilters = {
  sort: MateSort
  sports: string[]
  levels: string[]
  ageMin: number
  ageMax: number
  availability: string[]
  verifiedOnly: boolean
  hostingSoon: boolean
  newMembers: boolean
  mySportsOnly: boolean
  withPhoto: boolean
}

export const ageLimits = { min: 18, max: 70 }

export const defaultMateFilters: MateFilters = {
  sort: 'closest',
  sports: [],
  levels: [],
  ageMin: ageLimits.min,
  ageMax: ageLimits.max,
  availability: [],
  verifiedOnly: false,
  hostingSoon: false,
  newMembers: false,
  mySportsOnly: false,
  withPhoto: false,
}

// How many filters differ from the defaults (shown on the filter button).
export function countActiveFilters(filters: MateFilters, location: LocationPreference | null) {
  let count = 0
  if (filters.sports.length) count += 1
  if (filters.levels.length) count += 1
  if (filters.ageMin !== ageLimits.min || filters.ageMax !== ageLimits.max) count += 1
  if (filters.availability.length) count += 1
  for (const key of ['verifiedOnly', 'hostingSoon', 'newMembers', 'mySportsOnly', 'withPhoto'] as const) {
    if (filters[key]) count += 1
  }
  if (location?.radiusKm != null) count += 1
  return count
}

type Context = {
  viewerSports: string[]
  viewerSuburb: string
  location: LocationPreference | null
  hostingSoonNames: Set<string>
}

export function applyMateFilters(members: CommunityMember[], filters: MateFilters, context: Context) {
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const origin = context.location ?? suburbCoordinates(context.viewerSuburb)
  const shared = (member: CommunityMember) => member.sports.filter((sport) => context.viewerSports.includes(sport.name)).length
  const distance = (member: CommunityMember) => {
    const point = memberCoordinates(member)
    return origin && point ? distanceKm(origin, point) : Infinity
  }

  const filtered = members.filter((member) => {
    if (!isWithinRadius(context.location, memberCoordinates(member))) return false
    if (filters.sports.length && !member.sports.some((sport) => filters.sports.includes(sport.name))) return false
    if (filters.levels.length) {
      const relevant = filters.sports.length ? member.sports.filter((sport) => filters.sports.includes(sport.name)) : member.sports
      if (!relevant.some((sport) => filters.levels.includes(sport.level))) return false
    }
    if (member.age < filters.ageMin || member.age > filters.ageMax) return false
    if (filters.availability.length && !(member.availability ?? []).some((slot) => filters.availability.includes(slot))) return false
    if (filters.verifiedOnly && !member.verified) return false
    if (filters.hostingSoon && !context.hostingSoonNames.has(member.name)) return false
    if (filters.newMembers && !(member.createdAt && Date.parse(member.createdAt) >= monthAgo)) return false
    if (filters.mySportsOnly && shared(member) === 0) return false
    if (filters.withPhoto && !member.photoUrl) return false
    return true
  })

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'common': return shared(b) - shared(a) || distance(a) - distance(b)
      case 'meetups': return b.stats.meetups - a.stats.meetups
      case 'newest': return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      default: return distance(a) - distance(b)
    }
  })
}
