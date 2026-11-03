export type ActivityIcon = 'fish' | 'mountain' | 'run' | 'waves' | 'bike' | 'gym'

export type Activity = {
  id: number
  sport: string
  title: string
  startsAt: Date
  facts: string
  details: Record<string, string>
  place: string
  suburb: string
  host: string
  spotsTotal: number
  spotsTaken: number
  level: string
  icon: ActivityIcon
  hero: string
  hostMeta: string
  notes: string
  attendees: string[]
}

function getDemoStart(daysFromToday: number, hour: number, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  date.setHours(hour, minute, 0, 0)
  return date
}

export function formatActivityDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return date.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  })
}

export function getActivitySpotsLabel(activity: Pick<Activity, 'spotsTotal' | 'spotsTaken'>) {
  if (activity.spotsTotal === 1) {
    return activity.spotsTaken > 0 ? 'Full' : '1 buddy wanted'
  }
  return `${activity.spotsTaken} of ${activity.spotsTotal} spots`
}

export function getActivitySpotsLeft(activity: Pick<Activity, 'spotsTotal' | 'spotsTaken'>) {
  return Math.max(0, activity.spotsTotal - activity.spotsTaken)
}

export const currentUser = {
  name: 'Jai',
  age: 37,
  suburb: 'Port Noarlunga',
  verified: true,
  photoUrl: null,
  sports: [
    { name: 'Spearfishing', level: 'Intermediate', meetups: 3 },
    { name: 'Hiking', level: 'Intermediate', meetups: 2 },
    { name: 'Running', level: 'Intermediate', meetups: 0 },
    { name: 'Kitesurfing', level: 'Beginner', meetups: 2 },
    { name: 'Gym', level: 'Experienced', meetups: 0 },
  ],
  stats: { meetups: 7, hosted: 2, sports: 5 },
}

function getDemoMeetupDate(monthsAgo: number, day: number, hour: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - monthsAgo, day)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export const demoConfirmedMeetups = [
  { user: 'Jai', partner: 'Matt', sport: 'Spearfishing', activityId: -1, activityTitle: 'Port Noarlunga reef dive', activityDate: getDemoMeetupDate(5, 6, 6), startsAt: getDemoMeetupDate(5, 6, 6), confirmedAt: getDemoMeetupDate(5, 6, 11), hosted: true },
  { user: 'Jai', partner: 'Luca', sport: 'Spearfishing', activityId: -2, activityTitle: 'South reef spearfishing', activityDate: getDemoMeetupDate(4, 12, 8), startsAt: getDemoMeetupDate(4, 12, 8), confirmedAt: getDemoMeetupDate(4, 12, 12), hosted: false },
  { user: 'Jai', partner: 'Dave', sport: 'Spearfishing', activityId: -3, activityTitle: 'Coastal spearfishing session', activityDate: getDemoMeetupDate(3, 18, 7), startsAt: getDemoMeetupDate(3, 18, 7), confirmedAt: getDemoMeetupDate(3, 18, 11), hosted: false },
  { user: 'Jai', partner: 'Hamish', sport: 'Hiking', activityId: -4, activityTitle: 'Hills trail walk', activityDate: getDemoMeetupDate(2, 9, 8), startsAt: getDemoMeetupDate(2, 9, 8), confirmedAt: getDemoMeetupDate(2, 9, 13), hosted: true },
  { user: 'Jai', partner: 'Sam', sport: 'Hiking', activityId: -5, activityTitle: 'Mount Lofty hike', activityDate: getDemoMeetupDate(1, 16, 8), startsAt: getDemoMeetupDate(1, 16, 8), confirmedAt: getDemoMeetupDate(1, 16, 13), hosted: false },
  { user: 'Jai', partner: 'Luca', sport: 'Kitesurfing', activityId: -6, activityTitle: 'Brighton kitesurf session', activityDate: getDemoMeetupDate(1, 23, 9), startsAt: getDemoMeetupDate(1, 23, 9), confirmedAt: getDemoMeetupDate(1, 23, 12), hosted: false },
  { user: 'Jai', partner: 'Matt', sport: 'Kitesurfing', activityId: -7, activityTitle: 'Glenelg kitesurf session', activityDate: getDemoMeetupDate(0, 1, 8), startsAt: getDemoMeetupDate(0, 1, 8), confirmedAt: getDemoMeetupDate(0, 1, 11), hosted: false },
]

export const filters = ['My sports', ...new Set(currentUser.sports.map((sport) => sport.name))]

export type CommunityMember = {
  name: string
  age: number
  suburb: string
  verified: boolean
  photoUrl?: string
  sports: Array<{ name: string; level: string; meetups: number }>
  stats: { meetups: number; hosted: number; sports: number }
}

export const communityMembers: CommunityMember[] = [
  {
    name: 'Matt', age: 34, suburb: 'Brighton', verified: true,
    sports: [{ name: 'Spearfishing', level: 'Intermediate', meetups: 4 }, { name: 'Running', level: 'Beginner', meetups: 4 }, { name: 'Gym', level: 'Experienced', meetups: 4 }],
    stats: { meetups: 12, hosted: 3, sports: 3 },
  },
  {
    name: 'Luca', age: 29, suburb: 'Glenelg', verified: true,
    sports: [{ name: 'Kitesurfing', level: 'Intermediate', meetups: 3 }, { name: 'Surfing', level: 'Experienced', meetups: 2 }, { name: 'Swimming', level: 'Beginner', meetups: 2 }],
    stats: { meetups: 7, hosted: 1, sports: 3 },
  },
  {
    name: 'Sam', age: 41, suburb: 'Aldinga', verified: true,
    sports: [{ name: 'Running', level: 'Intermediate', meetups: 5 }, { name: 'Hiking', level: 'Intermediate', meetups: 4 }, { name: 'Road cycling', level: 'Experienced', meetups: 5 }],
    stats: { meetups: 14, hosted: 4, sports: 3 },
  },
  {
    name: 'Hamish', age: 36, suburb: 'Stirling', verified: true,
    sports: [{ name: 'Hiking', level: 'Experienced', meetups: 3 }, { name: 'Running', level: 'Intermediate', meetups: 3 }, { name: 'Mountain biking', level: 'Beginner', meetups: 3 }],
    stats: { meetups: 9, hosted: 2, sports: 3 },
  },
  {
    name: 'Raj', age: 32, suburb: 'Mawson Lakes', verified: true,
    sports: [{ name: 'Road cycling', level: 'Intermediate', meetups: 2 }, { name: 'Gym', level: 'Experienced', meetups: 2 }, { name: 'Hiking', level: 'Beginner', meetups: 2 }],
    stats: { meetups: 6, hosted: 1, sports: 3 },
  },
  {
    name: 'Ben', age: 45, suburb: 'Seaford', verified: true,
    sports: [{ name: 'Hiking', level: 'Intermediate', meetups: 9 }, { name: 'Spearfishing', level: 'Experienced', meetups: 8 }, { name: 'Swimming', level: 'Beginner', meetups: 8 }],
    stats: { meetups: 25, hosted: 5, sports: 3 },
  },
  {
    name: 'Tom', age: 27, suburb: 'Norwood', verified: true,
    sports: [{ name: 'Running', level: 'Beginner', meetups: 1 }, { name: 'Gym', level: 'Intermediate', meetups: 0 }, { name: 'Climbing / bouldering', level: 'Beginner', meetups: 0 }],
    stats: { meetups: 1, hosted: 0, sports: 3 },
  },
  {
    name: 'Dave', age: 39, suburb: 'Semaphore', verified: true,
    sports: [{ name: 'Spearfishing', level: 'Intermediate', meetups: 6 }, { name: 'Kitesurfing', level: 'Intermediate', meetups: 6 }, { name: 'SUP / kayak', level: 'Experienced', meetups: 6 }],
    stats: { meetups: 18, hosted: 3, sports: 3 },
  },
]

let nextDemoMeetupActivityId = -8
const demoPartners = ['Matt', 'Luca', 'Sam', 'Hamish', 'Raj', 'Ben', 'Tom', 'Dave', 'Jai']

function createDemoMeetups(
  user: string,
  sports: Array<{ name: string; meetups: number }>,
  hostedCount: number,
) {
  const meetups = sports.flatMap((sport) => (
    Array.from({ length: sport.meetups }, () => ({
      sport: sport.name,
      activityId: nextDemoMeetupActivityId--,
    }))
  ))
  let hostedRemaining = hostedCount

  return meetups.map(({ sport, activityId }, index) => {
    const monthsAgo = 5 - Math.floor(index * 6 / Math.max(meetups.length, 1))
    const day = monthsAgo === 0 ? 1 : 3 + (index % 23)
    const hour = index % 4 === 0 ? 6 : 8 + (index % 3)
    const date = getDemoMeetupDate(monthsAgo, day, hour)
    const partner = demoPartners[(index + sports.length) % demoPartners.length]

    return {
      user,
      partner: partner === user ? 'Jai' : partner,
      sport,
      activityId,
      activityTitle: `${sport} meetup`,
      activityDate: date,
      startsAt: date,
      confirmedAt: getDemoMeetupDate(monthsAgo, day, Math.min(hour + 3, 23)),
      hosted: hostedRemaining-- > 0,
    }
  })
}

demoConfirmedMeetups.push(
  ...communityMembers.flatMap((member) => createDemoMeetups(
    member.name,
    member.sports,
    member.stats.hosted,
  )),
)

export const activities: Activity[] = [
  {
    id: 1,
    sport: 'Spearfishing',
    title: 'Spearfishing at Port Noarlunga reef',
    startsAt: getDemoStart(2, 7),
    facts: '5 to 10 m · Shore dive · 2 hrs',
    place: 'Port Noarlunga jetty car park',
    suburb: 'Port Noarlunga',
    host: 'Matt',
    spotsTotal: 4,
    spotsTaken: 2,
    level: 'Intermediate',
    icon: 'fish',
    hero:
      'https://images.unsplash.com/photo-1516691195066-3f22714f08fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '12 confirmed meetups',
    notes: 'Viz is looking decent. Meet by the southern end of the car park and we will walk down together.',
    attendees: ['Matt', 'Jai', 'Luca'],
    details: { Depth: '5 to 10 m', Entry: 'Shore dive', Duration: '2 hours' },
  },
  {
    id: 2,
    sport: 'Hiking',
    title: 'Waterfall Gully to Mount Lofty',
    startsAt: getDemoStart(3, 8, 30),
    facts: '8 km · Steep · 3 hrs',
    details: { Distance: '8 km', Difficulty: 'Steep', Duration: '3 hours' },
    place: 'Waterfall Gully car park',
    suburb: 'Waterfall Gully',
    host: 'Jai',
    spotsTotal: 6,
    spotsTaken: 3,
    level: 'Beginner friendly',
    icon: 'mountain',
    hero:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '7 confirmed meetups',
    notes: 'Easy pace, plenty of stops and coffee after. Bring a light layer for the ridge.',
    attendees: ['Jai', 'Ben', 'Tom', 'Raj'],
  },
  {
    id: 3,
    sport: 'Running',
    title: 'Onkaparinga River trail run',
    startsAt: getDemoStart(5, 6, 15),
    facts: '12 km · Steady pace · Trail',
    details: { Distance: '12 km', Pace: 'Steady', Terrain: 'Trail' },
    place: 'Old Noarlunga footbridge',
    suburb: 'Old Noarlunga',
    host: 'Sam',
    spotsTotal: 3,
    spotsTaken: 1,
    level: 'Intermediate',
    icon: 'run',
    hero:
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '14 confirmed meetups',
    notes: 'Nice flat start with a few undulations. Back at the coffee van after.',
    attendees: ['Sam', 'Raj'],
  },
  {
    id: 4,
    sport: 'Kitesurfing',
    title: 'Brighton jetty freeride session',
    startsAt: getDemoStart(6, 16),
    facts: '2 hrs · Freeride · Windy',
    details: { Duration: '2 hours', Style: 'Freeride' },
    place: 'Brighton jetty',
    suburb: 'Brighton',
    host: 'Luca',
    spotsTotal: 1,
    spotsTaken: 0,
    level: 'Beginner friendly',
    icon: 'waves',
    hero:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '7 confirmed meetups',
    notes: 'Meet on the beach side and check the gusts before we launch.',
    attendees: ['Luca'],
  },
]

export function getDefaultActivityHero(sportName: string) {
  const exactMatch = activities.find((activity) => activity.sport === sportName)
  if (exactMatch) return exactMatch.hero

  if (['Kitesurfing', 'Surfing', 'Swimming', 'SUP / kayak', 'Scuba diving'].includes(sportName)) {
    return activities.find((activity) => activity.sport === 'Kitesurfing')?.hero ?? activities[0].hero
  }
  if (['Running', 'Gym', 'Mountain biking', 'Road cycling'].includes(sportName)) {
    return activities.find((activity) => activity.sport === 'Running')?.hero ?? activities[0].hero
  }

  return activities.find((activity) => activity.sport === 'Hiking')?.hero ?? activities[0].hero
}

export const chats = [
  {
    id: 1,
    title: 'Port Noarlunga spearfishing',
    preview: 'Matt: Viz looked decent yesterday',
    time: '9:42',
    unread: true,
    sport: 'fish',
  },
  {
    id: 2,
    title: 'Mount Lofty hike',
    preview: 'Hamish: See you by the kiosk',
    time: 'Tue',
    unread: false,
    sport: 'mountain',
  },
]
