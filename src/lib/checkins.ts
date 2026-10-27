export type ConfirmedMeetup = {
  user: string
  partner: string
  activityId: number
  activityTitle: string
  activityDate: string
  confirmedAt: string
}

const STORAGE_KEY = 'count-me-in-confirmed-meetups-v1'

function readPersistedCheckIns(): ConfirmedMeetup[] {
  if (typeof window === 'undefined') return []

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as ConfirmedMeetup[]) : []
  } catch {
    return []
  }
}

function writePersistedCheckIns(entries: ConfirmedMeetup[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage quota failures in the prototype.
  }
}

export function getConfirmedMeetupsForUser(user: string): ConfirmedMeetup[] {
  return readPersistedCheckIns().filter((entry) => entry.user === user)
}

export function hasConfirmedMeetupForUser(user: string, activityId: number): boolean {
  return getConfirmedMeetupsForUser(user).some((entry) => entry.activityId === activityId)
}

export function getConfirmedMeetupCountForUser(user: string): number {
  return getConfirmedMeetupsForUser(user).length
}

export function recordMeetupCheckIn({
  user,
  partner,
  activityId,
  activityTitle,
  activityDate,
}: {
  user: string
  partner: string
  activityId: number
  activityTitle: string
  activityDate: string
}) {
  const entries = readPersistedCheckIns()
  const duplicate = entries.some(
    (entry) =>
      entry.user === user &&
      entry.partner === partner &&
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

  return labels
}

export function getEarnedPatchesForUser(user: string) {
  const count = getConfirmedMeetupCountForUser(user)
  const patches = [
    { id: 'first-meetup', label: 'First meetup', reason: 'You completed your first meetup and joined a callout.', earned: count >= 1 },
    { id: 'regular', label: 'Regular', reason: 'You attended multiple meetups with the same crew.', earned: count >= 5 },
    { id: 'crew', label: 'Crew', reason: 'You built a reliable crew over ten confirmed meetups.', earned: count >= 10 },
    { id: 'early-bird', label: 'Early bird', reason: 'You joined a meetup before 7 am.', earned: count >= 3 },
    { id: 'salt-water', label: 'Salt water', reason: 'You joined a sea or surf-based session and explored the coast.', earned: count >= 5 },
    { id: 'trailhead', label: 'Trailhead', reason: 'You hit the trails several times with the crew.', earned: count >= 5 },
    { id: 'host', label: 'Host', reason: 'You hosted a crew activity that got confirmed.', earned: count >= 3 },
    { id: 'all-rounder', label: 'All rounder', reason: 'You confirmed meetups across four different sports.', earned: count >= 4 },
  ]

  return patches
}
