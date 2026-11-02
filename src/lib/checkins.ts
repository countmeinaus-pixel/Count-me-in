import { activities, demoConfirmedMeetups } from '../data/mockData'
import { patchDefinitions, type PatchDefinition } from '../data/patches'

export type ConfirmedMeetup = {
  user: string
  partner: string
  activityId: number
  activityTitle: string
  activityDate: string
  confirmedAt: string
  sport: string
  startsAt: string
  hosted: boolean
  oceanActivity?: boolean
  terrain?: string
}

type StoredConfirmedMeetup = Omit<ConfirmedMeetup, 'sport' | 'startsAt' | 'hosted'>
  & Partial<Pick<ConfirmedMeetup, 'sport' | 'startsAt' | 'hosted'>>

export type PatchProgress = PatchDefinition & {
  progress: number
  earned: boolean
  earnedAt: string | null
}

const STORAGE_KEY = 'count-me-in-confirmed-meetups-v1'

function readPersistedCheckIns(): StoredConfirmedMeetup[] {
  if (typeof window === 'undefined') return []

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as StoredConfirmedMeetup[]) : []
  } catch {
    return []
  }
}

function writePersistedCheckIns(entries: StoredConfirmedMeetup[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage quota failures in the prototype.
  }
}

export function getConfirmedMeetupsForUser(user: string): ConfirmedMeetup[] {
  const demoEntries = demoConfirmedMeetups.filter((entry) => entry.user === user)
  const entries = [
    ...demoEntries,
    ...readPersistedCheckIns().filter((entry) => entry.user === user),
  ]
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.activityId, entry])).values()]

  return uniqueEntries.map((entry) => {
    const activity = activities.find((item) => item.id === entry.activityId)
    return {
      ...entry,
      sport: entry.sport ?? activity?.sport ?? '',
      startsAt: entry.startsAt ?? activity?.startsAt.toISOString() ?? entry.activityDate,
      hosted: entry.hosted ?? false,
    }
  })
}

export function hasConfirmedMeetupForUser(user: string, activityId: number): boolean {
  return getConfirmedMeetupsForUser(user).some((entry) => entry.activityId === activityId)
}

export function getConfirmedMeetupCountForUser(user: string): number {
  return getConfirmedMeetupsForUser(user).length
}

export function getConfirmedMeetupsForUserAndSport(user: string, sport: string): ConfirmedMeetup[] {
  return getConfirmedMeetupsForUser(user).filter((entry) => entry.sport === sport)
}

export function recordMeetupCheckIn({
  user,
  partner,
  activityId,
  activityTitle,
  activityDate,
  sport,
  startsAt,
  hosted,
  oceanActivity,
  terrain,
}: {
  user: string
  partner: string
  activityId: number
  activityTitle: string
  activityDate: string
  sport: string
  startsAt: string
  hosted: boolean
  oceanActivity?: boolean
  terrain?: string
}) {
  const entries = readPersistedCheckIns()
  const duplicate = entries.some(
    (entry) =>
      entry.user === user &&
      entry.activityId === activityId,
  )

  if (duplicate) {
    return entries
  }

  const nextEntry: ConfirmedMeetup = {
    user,
    partner,
    activityId,
    activityTitle,
    activityDate,
    confirmedAt: new Date().toISOString(),
    sport,
    startsAt,
    hosted,
    oceanActivity,
    terrain,
  }

  const updated = [...entries, nextEntry]
  writePersistedCheckIns(updated)
  return updated
}

export function getLollipopChartForUser(user: string, months = 6) {
  const entries = getConfirmedMeetupsForUser(user)
  const now = new Date()
  const labels: { label: string; value: number; isCurrent: boolean }[] = []

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const monthLabel = date.toLocaleDateString('en-AU', { month: 'short' })
    const value = entries.filter((entry) => {
      const confirmedDate = new Date(entry.confirmedAt)
      return confirmedDate.getMonth() === date.getMonth() && confirmedDate.getFullYear() === date.getFullYear()
    }).length

    labels.push({
      label: monthLabel,
      value,
      isCurrent: index === 0,
    })
  }

  const maximum = Math.max(1, ...labels.map((month) => month.value))
  return labels.map((month) => ({ ...month, maximum }))
}

function getPatchMetricProgress(metric: PatchDefinition['metric'], entries: ConfirmedMeetup[]) {
  switch (metric) {
    case 'meetups':
      return { progress: entries.length, qualifyingEntries: entries }
    case 'earlyBird': {
      const qualifyingEntries = entries.filter((entry) => new Date(entry.startsAt).getHours() < 7)
      return { progress: qualifyingEntries.length, qualifyingEntries }
    }
    case 'saltWater': {
      const qualifyingEntries = entries.filter((entry) => (
        ['Spearfishing', 'Surfing', 'Kitesurfing', 'SUP / kayak', 'Scuba diving'].includes(entry.sport)
        || (entry.sport === 'Swimming' && entry.oceanActivity)
      ))
      return { progress: qualifyingEntries.length, qualifyingEntries }
    }
    case 'trailhead': {
      const qualifyingEntries = entries.filter((entry) => (
        entry.sport === 'Hiking'
        || (entry.sport === 'Running' && entry.terrain === 'Trail')
      ))
      return { progress: qualifyingEntries.length, qualifyingEntries }
    }
    case 'hosted': {
      const qualifyingEntries = entries.filter((entry) => entry.hosted)
      const uniqueActivities = [...new Map(qualifyingEntries.map((entry) => [entry.activityId, entry])).values()]
      return { progress: uniqueActivities.length, qualifyingEntries: uniqueActivities }
    }
    case 'sports': {
      const qualifyingEntries: ConfirmedMeetup[] = []
      const sports = new Set<string>()
      for (const entry of entries) {
        if (entry.sport && !sports.has(entry.sport)) {
          sports.add(entry.sport)
          qualifyingEntries.push(entry)
        }
      }
      return { progress: sports.size, qualifyingEntries }
    }
  }
}

export function getPatchProgressForUser(user: string): PatchProgress[] {
  const entries = getConfirmedMeetupsForUser(user)
    .sort((left, right) => left.confirmedAt.localeCompare(right.confirmedAt))

  return patchDefinitions.map((definition) => {
    const { progress, qualifyingEntries } = getPatchMetricProgress(definition.metric, entries)
    const earned = progress >= definition.target
    return {
      ...definition,
      progress: Math.min(progress, definition.target),
      earned,
      earnedAt: earned ? qualifyingEntries[definition.target - 1]?.confirmedAt ?? null : null,
    }
  })
}
