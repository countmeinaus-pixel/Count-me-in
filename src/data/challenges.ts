import type { PatchMetric } from './patches'

// Time-limited patch challenges, like Garmin badges: you opt in and reach the
// goal before the period ends. New ones appear automatically every month and
// every weekend; their id contains the period, e.g. "monthly-2026-11".

export type ChallengeKind = 'monthly' | 'salt' | 'weekend' | 'captain'

export type Challenge = {
  id: string
  kind: ChallengeKind
  name: string
  icon: string
  description: string
  rule: string
  metric: PatchMetric
  target: number
  progressLabel: string
  startsAt: Date
  endsAt: Date
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function monthChallenge(kind: Exclude<ChallengeKind, 'weekend'>, year: number, monthIndex: number): Challenge {
  const month = monthNames[monthIndex]
  const base = {
    id: `${kind}-${year}-${pad(monthIndex + 1)}`,
    kind,
    startsAt: new Date(year, monthIndex, 1),
    endsAt: new Date(year, monthIndex + 1, 1),
  }
  if (kind === 'monthly') {
    return {
      ...base,
      name: `${month} grind`,
      icon: 'calendar',
      description: `Keep showing up all through ${month}.`,
      rule: `Complete 4 confirmed meetups in ${month}.`,
      metric: 'meetups',
      target: 4,
      progressLabel: 'meetups',
    }
  }
  if (kind === 'salt') {
    return {
      ...base,
      name: `Salt water ${month}`,
      icon: 'waves',
      description: 'Get in the ocean with the crew.',
      rule: `Complete 3 ocean activities in ${month}.`,
      metric: 'saltWater',
      target: 3,
      progressLabel: 'ocean activities',
    }
  }
  return {
    ...base,
    name: `${month} captain`,
    icon: 'users',
    description: 'Put a plan out there and bring people together.',
    rule: `Host 2 activities in ${month} with at least one confirmed meetup each.`,
    metric: 'hosted',
    target: 2,
    progressLabel: 'hosted activities',
  }
}

// The weekend of the given week: Saturday 00:00 until Monday 00:00.
function weekendChallenge(saturday: Date): Challenge {
  const startsAt = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate())
  const endsAt = new Date(startsAt)
  endsAt.setDate(endsAt.getDate() + 2)
  const label = startsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return {
    id: `weekend-${startsAt.getFullYear()}-${pad(startsAt.getMonth() + 1)}-${pad(startsAt.getDate())}`,
    kind: 'weekend',
    name: 'Weekend warrior',
    icon: 'sunrise',
    description: `Make the weekend of ${label} count.`,
    rule: 'Complete 2 confirmed meetups this Saturday and Sunday.',
    metric: 'meetups',
    target: 2,
    progressLabel: 'meetups',
    startsAt,
    endsAt,
  }
}

function upcomingSaturday(now: Date) {
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = saturday.getDay() // 0 = Sunday
  if (day === 0) saturday.setDate(saturday.getDate() - 1)
  else saturday.setDate(saturday.getDate() + (6 - day))
  return saturday
}

export function getActiveChallenges(now = new Date()): Challenge[] {
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  return [
    monthChallenge('monthly', year, monthIndex),
    monthChallenge('salt', year, monthIndex),
    weekendChallenge(upcomingSaturday(now)),
    monthChallenge('captain', year, monthIndex),
  ]
}

export function getChallengeById(id: string): Challenge | null {
  const monthMatch = /^(monthly|salt|captain)-(\d{4})-(\d{2})$/.exec(id)
  if (monthMatch) {
    return monthChallenge(monthMatch[1] as 'monthly' | 'salt' | 'captain', Number(monthMatch[2]), Number(monthMatch[3]) - 1)
  }
  const weekendMatch = /^weekend-(\d{4})-(\d{2})-(\d{2})$/.exec(id)
  if (weekendMatch) {
    return weekendChallenge(new Date(Number(weekendMatch[1]), Number(weekendMatch[2]) - 1, Number(weekendMatch[3])))
  }
  return null
}
