import { dateToZonedInput, differsFromDevice, placeTimeZone, timeZoneAbbreviation, zonedTimeToDate } from '../lib/timeZones'

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
  attendeePhotos?: Array<string | null>
  latitude?: number | null
  longitude?: number | null
}

// Demo activities are in Adelaide, so their times are Adelaide time on every phone.
function getDemoStart(daysFromToday: number, hour: number, minute = 0) {
  const day = new Date(Date.now() + daysFromToday * 86_400_000)
  const [date] = dateToZonedInput(day, 'Australia/Adelaide').split('T')
  return zonedTimeToDate(date, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, 'Australia/Adelaide')
}

// Shown in the time zone of the activity's place ("Name, STATE"). When that differs
// from the device's time zone and a time is shown, the zone is added: "Fri 20 Nov, 6:00 pm AWST".
export function formatActivityDate(date: Date, options: Intl.DateTimeFormatOptions = {}, place?: string | null) {
  const timeZone = placeTimeZone(place)
  const merged: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }
  const text = date.toLocaleString('en-AU', { ...merged, timeZone })
  const showsTime = merged.hour !== undefined
  return showsTime && differsFromDevice(date, timeZone) ? `${text} ${timeZoneAbbreviation(date, timeZone)}` : text
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
  { user: 'Jai', partner: 'Matt', sport: 'Freediving', activityId: -1, activityTitle: 'Port Noarlunga reef dive', activityDate: getDemoMeetupDate(5, 6, 6), startsAt: getDemoMeetupDate(5, 6, 6), confirmedAt: getDemoMeetupDate(5, 6, 11), hosted: true },
  { user: 'Jai', partner: 'Luca', sport: 'Spearfishing', activityId: -2, activityTitle: 'South reef spearfishing', activityDate: getDemoMeetupDate(4, 12, 8), startsAt: getDemoMeetupDate(4, 12, 8), confirmedAt: getDemoMeetupDate(4, 12, 12), hosted: false },
  { user: 'Jai', partner: 'Dave', sport: 'Spearfishing', activityId: -3, activityTitle: 'Coastal spearfishing session', activityDate: getDemoMeetupDate(3, 18, 7), startsAt: getDemoMeetupDate(3, 18, 7), confirmedAt: getDemoMeetupDate(3, 18, 11), hosted: false },
  { user: 'Jai', partner: 'Hamish', sport: 'Hiking', activityId: -4, activityTitle: 'Hills trail walk', activityDate: getDemoMeetupDate(2, 9, 8), startsAt: getDemoMeetupDate(2, 9, 8), confirmedAt: getDemoMeetupDate(2, 9, 13), hosted: true },
  { user: 'Jai', partner: 'Sam', sport: 'Hiking', activityId: -5, activityTitle: 'Mount Lofty hike', activityDate: getDemoMeetupDate(1, 16, 8), startsAt: getDemoMeetupDate(1, 16, 8), confirmedAt: getDemoMeetupDate(1, 16, 13), hosted: false },
  { user: 'Jai', partner: 'Luca', sport: 'Kitesurfing', activityId: -6, activityTitle: 'Brighton kitesurf session', activityDate: getDemoMeetupDate(1, 23, 9), startsAt: getDemoMeetupDate(1, 23, 9), confirmedAt: getDemoMeetupDate(1, 23, 12), hosted: false },
  { user: 'Jai', partner: 'Matt', sport: 'Kitesurfing', activityId: -7, activityTitle: 'Glenelg kitesurf session', activityDate: getDemoMeetupDate(0, 1, 8), startsAt: getDemoMeetupDate(0, 1, 8), confirmedAt: getDemoMeetupDate(0, 1, 11), hosted: false },
]

export const filters = ['My sports', ...new Set(currentUser.sports.map((sport) => sport.name))]

export type CommunityMember = {
  id?: string
  name: string
  age: number
  suburb: string
  verified: boolean
  photoUrl?: string
  sports: Array<{ name: string; level: string; meetups: number }>
  stats: { meetups: number; hosted: number; sports: number }
  // Only for real accounts; used by the filters on the Friends page.
  createdAt?: string
  availability?: string[]
  sharedLocation?: { latitude: number; longitude: number } | null
}

// Placeholder portraits from Unsplash (free to use), outdoor and sport shots, cropped small around the face.
function memberPhoto(photoId: string) {
  return `https://images.unsplash.com/photo-${photoId}?w=192&h=192&fit=crop&crop=faces&q=70`
}

export const communityMembers: CommunityMember[] = [
  {
    name: 'Matt', age: 34, suburb: 'Brighton', verified: true,
    photoUrl: memberPhoto('1603560797930-1a94e3b84fd8'),
    sports: [{ name: 'Spearfishing', level: 'Intermediate', meetups: 4 }, { name: 'Running', level: 'Beginner', meetups: 4 }, { name: 'Gym', level: 'Experienced', meetups: 4 }],
    stats: { meetups: 12, hosted: 3, sports: 3 },
  },
  {
    name: 'Luca', age: 29, suburb: 'Glenelg', verified: true,
    photoUrl: memberPhoto('1591984305541-db1d173da328'),
    sports: [{ name: 'Kitesurfing', level: 'Intermediate', meetups: 3 }, { name: 'Surfing', level: 'Experienced', meetups: 2 }, { name: 'Swimming', level: 'Beginner', meetups: 2 }],
    stats: { meetups: 7, hosted: 1, sports: 3 },
  },
  {
    name: 'Sam', age: 41, suburb: 'Aldinga', verified: true,
    photoUrl: memberPhoto('1545575439-3261931f52f1'),
    sports: [{ name: 'Running', level: 'Intermediate', meetups: 5 }, { name: 'Hiking', level: 'Intermediate', meetups: 4 }, { name: 'Road cycling', level: 'Experienced', meetups: 5 }],
    stats: { meetups: 14, hosted: 4, sports: 3 },
  },
  {
    name: 'Hamish', age: 36, suburb: 'Stirling', verified: true,
    photoUrl: memberPhoto('1558223299-4de4134f3bcd'),
    sports: [{ name: 'Hiking', level: 'Experienced', meetups: 3 }, { name: 'Running', level: 'Intermediate', meetups: 3 }, { name: 'Mountain biking', level: 'Beginner', meetups: 3 }],
    stats: { meetups: 9, hosted: 2, sports: 3 },
  },
  {
    name: 'Raj', age: 32, suburb: 'Mawson Lakes', verified: true,
    photoUrl: memberPhoto('1598966739654-5e9a252d8c32'),
    sports: [{ name: 'Road cycling', level: 'Intermediate', meetups: 2 }, { name: 'Gym', level: 'Experienced', meetups: 2 }, { name: 'Hiking', level: 'Beginner', meetups: 2 }],
    stats: { meetups: 6, hosted: 1, sports: 3 },
  },
  {
    name: 'Ben', age: 45, suburb: 'Seaford', verified: true,
    photoUrl: memberPhoto('1669151030267-7e7f82c3b2a2'),
    sports: [{ name: 'Hiking', level: 'Intermediate', meetups: 9 }, { name: 'Spearfishing', level: 'Experienced', meetups: 8 }, { name: 'Swimming', level: 'Beginner', meetups: 8 }],
    stats: { meetups: 25, hosted: 5, sports: 3 },
  },
  {
    name: 'Tom', age: 27, suburb: 'Norwood', verified: true,
    photoUrl: memberPhoto('1741731854418-602cb8d3c497'),
    sports: [{ name: 'Running', level: 'Beginner', meetups: 1 }, { name: 'Gym', level: 'Intermediate', meetups: 0 }, { name: 'Climbing / bouldering', level: 'Beginner', meetups: 0 }],
    stats: { meetups: 1, hosted: 0, sports: 3 },
  },
  {
    name: 'Dave', age: 39, suburb: 'Semaphore', verified: true,
    photoUrl: memberPhoto('1629733613868-a37c4cf8bdf3'),
    sports: [{ name: 'Spearfishing', level: 'Intermediate', meetups: 6 }, { name: 'Kitesurfing', level: 'Intermediate', meetups: 6 }, { name: 'SUP / kayak', level: 'Experienced', meetups: 6 }],
    stats: { meetups: 18, hosted: 3, sports: 3 },
  },
  // Extra placeholders so the suggestions row is full while there are few real members.
  {
    name: 'Kwame', age: 44, suburb: 'Christies Beach', verified: true,
    photoUrl: memberPhoto('1600492110240-63958f19b8b8'),
    sports: [{ name: 'Road cycling', level: 'Experienced', meetups: 6 }, { name: 'Running', level: 'Intermediate', meetups: 3 }],
    stats: { meetups: 9, hosted: 2, sports: 2 },
  },
  {
    name: 'Josh', age: 33, suburb: 'Hallett Cove', verified: true,
    photoUrl: memberPhoto('1586022045315-1cdd6493045c'),
    sports: [{ name: 'Hiking', level: 'Experienced', meetups: 5 }, { name: 'Spearfishing', level: 'Beginner', meetups: 1 }],
    stats: { meetups: 6, hosted: 1, sports: 2 },
  },
  {
    name: 'Liam', age: 30, suburb: 'Moana', verified: false,
    photoUrl: memberPhoto('1604928106847-96c6f306b722'),
    sports: [{ name: 'Hiking', level: 'Intermediate', meetups: 2 }, { name: 'Surfing', level: 'Intermediate', meetups: 2 }],
    stats: { meetups: 4, hosted: 0, sports: 2 },
  },
  {
    name: 'Nico', age: 26, suburb: 'Port Noarlunga', verified: true,
    photoUrl: memberPhoto('1607429289259-456053385f53'),
    sports: [{ name: 'Surfing', level: 'Experienced', meetups: 4 }, { name: 'Kitesurfing', level: 'Beginner', meetups: 1 }],
    stats: { meetups: 5, hosted: 1, sports: 2 },
  },
  {
    name: 'Dan', age: 35, suburb: 'Maslin Beach', verified: true,
    photoUrl: memberPhoto('1528629297340-d1d466945dc5'),
    sports: [{ name: 'Road cycling', level: 'Intermediate', meetups: 3 }, { name: 'Swimming', level: 'Intermediate', meetups: 2 }],
    stats: { meetups: 5, hosted: 0, sports: 2 },
  },
  {
    name: 'Callum', age: 41, suburb: 'Sellicks Beach', verified: true,
    photoUrl: memberPhoto('1486036413660-59d02a64e549'),
    sports: [{ name: 'Spearfishing', level: 'Experienced', meetups: 7 }, { name: 'SUP / kayak', level: 'Intermediate', meetups: 3 }],
    stats: { meetups: 10, hosted: 3, sports: 2 },
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
    sport: 'Freediving',
    title: 'Freediving at Port Noarlunga reef',
    startsAt: getDemoStart(2, 7),
    facts: '5 to 10 m · Shore dive · 2 hrs',
    place: 'Port Noarlunga jetty car park',
    latitude: -35.1462,
    longitude: 138.4706,
    suburb: 'Port Noarlunga',
    host: 'Matt',
    spotsTotal: 4,
    spotsTaken: 2,
    level: 'Intermediate',
    icon: 'waves',
    hero:
      'https://images.unsplash.com/photo-1516691195066-3f22714f08fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '12 confirmed meetups',
    notes: 'Viz is looking decent. Freediving and snorkelling only here, no spearfishing (it is an aquatic reserve). Meet by the southern end of the car park and we will walk down together.',
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
    latitude: -34.9663,
    longitude: 138.6789,
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
    latitude: -35.1812,
    longitude: 138.5003,
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
    latitude: -35.0185,
    longitude: 138.5141,
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

// Demo attendees show the same placeholder portraits as the demo members.
activities.forEach((activity) => {
  activity.attendeePhotos = activity.attendees.map(
    (name) => communityMembers.find((member) => member.name === name)?.photoUrl ?? null,
  )
})

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
