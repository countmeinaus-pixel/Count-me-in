export type ActivityIcon = 'fish' | 'mountain' | 'run' | 'waves' | 'bike' | 'gym'

export type Activity = {
  id: number
  sport: string
  title: string
  date: string
  facts: string
  place: string
  host: string
  spots: string
  level: string
  icon: ActivityIcon
  hero: string
  hostMeta: string
  notes: string
  attendees: string[]
}

export const filters = ['My sports', 'Spearfishing', 'Hiking', 'Running', 'Kitesurfing']

export const currentUser = {
  name: 'Jai',
  age: 37,
  suburb: 'Port Noarlunga',
  verified: true,
  sports: [
    { name: 'Spearfishing', level: 'Intermediate' },
    { name: 'Hiking', level: 'Intermediate' },
    { name: 'Running', level: 'Intermediate' },
    { name: 'Kitesurfing', level: 'Beginner' },
    { name: 'Gym', level: 'Experienced' },
  ],
  stats: { meetups: 7, hosted: 2, sports: 5 },
}

export const activities: Activity[] = [
  {
    id: 1,
    sport: 'Spearfishing',
    title: 'Spearfishing at Port Noarlunga reef',
    date: 'Sat 22 Feb · 7:00 am',
    facts: '5 to 10 m · Shore dive · 2 hrs',
    place: 'Port Noarlunga jetty car park',
    host: 'Matt',
    spots: '2 of 4 spots',
    level: 'Intermediate',
    icon: 'fish',
    hero:
      'https://images.unsplash.com/photo-1516691195066-3f22714f08fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '12 confirmed meetups',
    notes: 'Viz is looking decent. Meet by the southern end of the car park and we will walk down together.',
    attendees: ['Matt', 'Luca', 'Sam'],
  },
  {
    id: 2,
    sport: 'Hiking',
    title: 'Waterfall Gully to Mount Lofty',
    date: 'Sun 23 Feb · 8:30 am',
    facts: '8 km · Steep · 3 hrs',
    place: 'Waterfall Gully car park',
    host: 'Hamish',
    spots: '3 of 6 spots',
    level: 'Beginner friendly',
    icon: 'mountain',
    hero:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '9 confirmed meetups',
    notes: 'Easy pace, plenty of stops and coffee after. Bring a light layer for the ridge.',
    attendees: ['Hamish', 'Ben', 'Tom'],
  },
  {
    id: 3,
    sport: 'Running',
    title: 'Onkaparinga River trail run',
    date: 'Tue 25 Feb · 6:15 am',
    facts: '12 km · Steady pace · Trail',
    place: 'Old Noarlunga footbridge',
    host: 'Sam',
    spots: '1 of 3 spots',
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
    date: 'Wed 26 Feb · 4:00 pm',
    facts: '2 hrs · Freeride · Windy',
    place: 'Brighton jetty',
    host: 'Luca',
    spots: '1 buddy wanted',
    level: 'Beginner friendly',
    icon: 'waves',
    hero:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080',
    hostMeta: '7 confirmed meetups',
    notes: 'Meet on the beach side and check the gusts before we launch.',
    attendees: ['Luca'],
  },
]

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
