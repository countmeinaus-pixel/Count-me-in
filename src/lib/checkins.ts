import { activities, demoConfirmedMeetups } from '../data/mockData'
import { announceNewPatches } from './patchCelebration'
import { getFriendDatesFor } from './friendships'
import { activityState } from './regions'
import { loadLocalities } from './localities'
import { waterSportNames } from '../data/sports'
import { patchDefinitions, type PatchDefinition, type SportPatchRule } from '../data/patches'
import { getConfirmedPrDates } from './personalRecords'
import { supabase } from './supabase'

export type ConfirmedMeetup = {
  user: string
  partner: string
  activityId: number | string
  activityTitle: string
  activityDate: string
  confirmedAt: string
  sport: string
  startsAt: string
  hosted: boolean
  oceanActivity?: boolean
  terrain?: string
  details?: Record<string, string>
  // Where it happened (for the Places patches): suburb, and state or territory.
  suburb?: string
  region?: string | null
}

type StoredConfirmedMeetup = Omit<ConfirmedMeetup, 'sport' | 'startsAt' | 'hosted'>
  & Partial<Pick<ConfirmedMeetup, 'sport' | 'startsAt' | 'hosted'>>

const savedMeetupsByUser = new Map<string, ConfirmedMeetup[]>()

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
  const isSavedAccount = savedMeetupsByUser.has(user)
  const demoEntries = isSavedAccount
    ? []
    : demoConfirmedMeetups.filter((entry) => entry.user === user)
  const entries = [
    ...demoEntries,
    ...(isSavedAccount
      ? []
      : readPersistedCheckIns().filter((entry) => entry.user === user)),
    ...(savedMeetupsByUser.get(user) ?? []),
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

// Loads your confirmed meetups, then celebrates any patch you just earned.
export async function loadSavedMeetupsForUser(userName?: string): Promise<string | undefined> {
  const currentUserName = await loadSavedMeetups(userName)
  if (currentUserName) announceNewPatches(currentUserName, getPatchProgressForUser(currentUserName))
  return currentUserName
}

async function loadSavedMeetups(userName?: string): Promise<string | undefined> {
  if (!supabase) return undefined
  if (userName) savedMeetupsByUser.set(userName, [])

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) return undefined
  let currentUserName = userName
  if (!currentUserName) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', userData.user.id)
      .single()
    if (profileError) throw profileError
    currentUserName = profile.first_name
  }
  if (!currentUserName) {
    throw new Error('Your profile could not be found. Please complete onboarding first.')
  }

  const { data: confirmations, error: confirmationError } = await supabase
    .from('activity_meetup_confirmations')
    .select('activity_id, partner_id, confirmed_at')
    .eq('user_id', userData.user.id)
  if (confirmationError) throw confirmationError

  if (!confirmations?.length) {
    savedMeetupsByUser.set(currentUserName, [])
    return currentUserName
  }

  const activityIds = [...new Set(confirmations.map((entry) => entry.activity_id))]
  const partnerIds = [...new Set(confirmations.map((entry) => entry.partner_id))]
  const [activitiesResult, profilesResult] = await Promise.all([
    supabase
      .from('activities')
      .select('id, host_id, title, starts_at, sport_id, sport_details, suburb')
      .in('id', activityIds),
    supabase.from('profiles').select('id, first_name').in('id', partnerIds),
  ])
  if (activitiesResult.error) throw activitiesResult.error
  if (profilesResult.error) throw profilesResult.error

  const activityRows = activitiesResult.data ?? []
  const sportIds = [...new Set(activityRows.map((entry) => entry.sport_id))]
  const sportsResult = sportIds.length
    ? await supabase.from('sports').select('id, name').in('id', sportIds)
    : { data: [], error: null }
  if (sportsResult.error) throw sportsResult.error

  // States for the Places patches need the list of Australian places.
  await loadLocalities()
  // Map pins in a separate query, so this still works before the pin columns exist.
  const pinsResult = await supabase.from('activities').select('id, latitude, longitude').in('id', activityIds)
  const pinsById = new Map((pinsResult.error ? [] : pinsResult.data ?? []).map((pin) => [pin.id, pin]))
  const activitiesById = new Map(activityRows.map((entry) => [entry.id, entry]))
  const partnersById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.first_name]),
  )
  const sportsById = new Map(
    (sportsResult.data ?? []).map((sport) => [sport.id, sport.name]),
  )

  savedMeetupsByUser.set(
    currentUserName,
    confirmations.flatMap((confirmation) => {
      const activity = activitiesById.get(confirmation.activity_id)
      if (!activity) return []
      const sportDetails =
        typeof activity.sport_details === 'object' &&
        activity.sport_details !== null &&
        !Array.isArray(activity.sport_details)
          ? Object.fromEntries(
              Object.entries(activity.sport_details).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            )
          : {}
      const detailEntries = Object.entries(sportDetails)
      const terrain = detailEntries.find(([key]) => key.toLowerCase().includes('terrain'))?.[1]
      const location = detailEntries.find(([key]) => key.toLowerCase().includes('location'))?.[1]
      return [{
        user: currentUserName,
        partner: partnersById.get(confirmation.partner_id) ?? 'Activity partner',
        activityId: activity.id,
        activityTitle: activity.title,
        activityDate: activity.starts_at,
        confirmedAt: confirmation.confirmed_at,
        sport: sportsById.get(activity.sport_id) ?? '',
        startsAt: activity.starts_at,
        hosted: activity.host_id === userData.user.id,
        oceanActivity: typeof location === 'string' && location.toLowerCase() === 'ocean',
        terrain: typeof terrain === 'string' ? terrain : undefined,
        details: sportDetails,
        suburb: activity.suburb ?? undefined,
        region: activityState({ suburb: activity.suburb, latitude: pinsById.get(activity.id)?.latitude, longitude: pinsById.get(activity.id)?.longitude }),
      }]
    }),
  )
  return currentUserName
}

export async function getSavedActivityCheckinCode(activityId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.rpc('get_activity_checkin_code', {
    target_activity_id: activityId,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('Your check-in code could not be loaded.')
  return data
}

export async function confirmSavedActivityMeetup(
  activityId: string,
  scannedCode: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('confirm_activity_meetup', {
    target_activity_id: activityId,
    scanned_code: scannedCode,
  })
  if (error) throw error
}

export async function hasSavedActivityCheckin(activityId: string): Promise<boolean> {
  if (!supabase) return false
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) return false

  const { data, error } = await supabase
    .from('activity_meetup_confirmations')
    .select('activity_id')
    .eq('activity_id', activityId)
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
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

function matchesSportRule(entry: ConfirmedMeetup, rule: SportPatchRule) {
  if (entry.sport !== rule.sport) return false
  const start = new Date(entry.startsAt)
  if (rule.early && start.getHours() >= 7) return false
  if (rule.late && start.getHours() < 17) return false
  if (rule.weekend && start.getDay() !== 0 && start.getDay() !== 6) return false
  if (rule.hosted && !entry.hosted) return false
  if (rule.detail) {
    const value = entry.details?.[rule.detail.key]
      ?? (rule.detail.key === 'location' && entry.oceanActivity ? 'Ocean' : undefined)
      ?? (rule.detail.key === 'terrain' ? entry.terrain : undefined)
    if (!value || !rule.detail.values.includes(value)) return false
  }
  if (rule.minNumber) {
    const value = Number.parseFloat(entry.details?.[rule.minNumber.key] ?? '')
    if (!Number.isFinite(value) || value < rule.minNumber.value) return false
  }
  return true
}

export function getPatchMetricProgress(
  metric: PatchDefinition['metric'],
  entries: ConfirmedMeetup[],
  sportRule?: SportPatchRule,
) {
  switch (metric) {
    case 'prConfirms':
      // Counted from votes in getPatchProgressForUser, not from meetups.
      return { progress: 0, qualifyingEntries: [] }
    case 'sport': {
      if (!sportRule) return { progress: 0, qualifyingEntries: [] }
      const matching = entries.filter((entry) => matchesSportRule(entry, sportRule))
      const measure = sportRule.measure ?? 'sessions'

      // Mates and months: the first entry for each new mate or month qualifies.
      if (measure === 'partners' || measure === 'months' || typeof measure === 'object' && 'distinct' in measure) {
        const seen = new Set<string>()
        const qualifyingEntries: ConfirmedMeetup[] = []
        for (const entry of matching) {
          const value = measure === 'partners'
            ? entry.partner
            : measure === 'months'
              ? entry.startsAt.slice(0, 7)
              : entry.details?.[measure.distinct]?.trim().toLowerCase()
          if (!value || seen.has(value)) continue
          seen.add(value)
          qualifyingEntries.push(entry)
        }
        return { progress: qualifyingEntries.length, qualifyingEntries }
      }

      // One session per activity, however many partners confirmed it.
      const sessions = [...new Map(matching.map((entry) => [entry.activityId, entry])).values()]
      if (typeof measure === 'object' && 'sum' in measure) {
        // Running total after each session, to find when the target was reached.
        let total = 0
        const qualifyingEntries: ConfirmedMeetup[] = []
        const runningTotals: number[] = []
        for (const entry of sessions) {
          const value = Number.parseFloat(entry.details?.[measure.sum] ?? '')
          if (!Number.isFinite(value) || value <= 0) continue
          total += value * (measure.scale ?? 1)
          qualifyingEntries.push(entry)
          runningTotals.push(total)
        }
        return { progress: Math.floor(total), qualifyingEntries, runningTotals }
      }
      return { progress: sessions.length, qualifyingEntries: sessions }
    }
    case 'meetups':
      return { progress: entries.length, qualifyingEntries: entries }
    case 'earlyBird': {
      const qualifyingEntries = entries.filter((entry) => new Date(entry.startsAt).getHours() < 7)
      return { progress: qualifyingEntries.length, qualifyingEntries }
    }
    case 'saltWater': {
      const qualifyingEntries = entries.filter((entry) => (
        waterSportNames.includes(entry.sport)
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
    case 'suburbs':
    case 'regions': {
      // Different places: one per suburb, or one per state or territory.
      const qualifyingEntries: ConfirmedMeetup[] = []
      const seen = new Set<string>()
      for (const entry of entries) {
        const place = metric === 'suburbs' ? entry.suburb?.trim().toLowerCase() : entry.region
        if (!place || seen.has(place)) continue
        seen.add(place)
        qualifyingEntries.push(entry)
      }
      return { progress: seen.size, qualifyingEntries }
    }
    case 'friends':
      return { progress: 0, qualifyingEntries: [] }
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
    if (definition.metric === 'prConfirms' || definition.metric === 'friends') {
      const dates = definition.metric === 'friends' ? getFriendDatesFor(user) : getConfirmedPrDates()
      const earned = dates.length >= definition.target
      return {
        ...definition,
        progress: Math.min(dates.length, definition.target),
        earned,
        earnedAt: earned ? dates[definition.target - 1] ?? null : null,
      }
    }
    const result = getPatchMetricProgress(definition.metric, entries, definition.sportRule)
    const { progress, qualifyingEntries } = result
    const earned = progress >= definition.target
    const earnedEntry = 'runningTotals' in result && result.runningTotals
      ? qualifyingEntries[result.runningTotals.findIndex((total) => total >= definition.target)]
      : qualifyingEntries[definition.target - 1]
    return {
      ...definition,
      progress: Math.min(progress, definition.target),
      earned,
      earnedAt: earned ? earnedEntry?.confirmedAt ?? null : null,
    }
  })
}
