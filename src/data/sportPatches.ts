import type { PatchDefinition, SportName, SportPatchRule } from './patches'

// 20 patches per sport. 15 follow the same pattern for every sport (session
// tiers, early, evening, weekend, hosting, partners, months); 5 are unique to
// the sport and use its preset details (depth, distance, discipline, spots).

type SportFlavour = {
  sport: SportName
  icon: string
  title: string // short word used in names, e.g. "Reef"
  session: string // one session, e.g. "dive"
  sessions: string
  special: SpecialPatch[]
}

type SpecialPatch = {
  key: string
  name: string
  description: string
  rule: string
  target: number
  progressLabel: string
  sportRule: Omit<SportPatchRule, 'sport'>
}

const tiers = [
  { key: 'first', target: 1, name: (f: SportFlavour) => `First ${f.session}`, description: 'Everyone starts somewhere. Good on you for showing up.' },
  { key: 'rookie', target: 5, name: (f: SportFlavour) => `${f.title} rookie`, description: 'You are finding your feet with the crew.' },
  { key: 'regular', target: 10, name: (f: SportFlavour) => `${f.title} regular`, description: 'People know they can count on you.' },
  { key: 'local', target: 25, name: (f: SportFlavour) => `${f.title} local`, description: 'You are part of the furniture now.' },
  { key: 'veteran', target: 50, name: (f: SportFlavour) => `${f.title} veteran`, description: 'Fifty shared sessions. That is real commitment.' },
  { key: 'legend', target: 100, name: (f: SportFlavour) => `${f.title} legend`, description: 'A hundred sessions. The young blokes look up to you.' },
]

function sharedPatches(f: SportFlavour): SpecialPatch[] {
  return [
    ...tiers.map((tier) => ({
      key: tier.key,
      name: tier.name(f),
      description: tier.description,
      rule: tier.target === 1
        ? `Complete your first confirmed ${f.session}.`
        : `Complete ${tier.target} confirmed ${f.sessions}.`,
      target: tier.target,
      progressLabel: f.sessions,
      sportRule: {},
    })),
    {
      key: 'first-light',
      name: `${f.title} at first light`,
      description: 'Up before the sun, out before the crowds.',
      rule: `Complete 3 ${f.sessions} starting before 7 am.`,
      target: 3,
      progressLabel: `early ${f.sessions}`,
      sportRule: { early: true },
    },
    {
      key: 'after-work',
      name: `After-work ${f.session}`,
      description: 'The best way to shake off a work day.',
      rule: `Complete 3 ${f.sessions} starting at 5 pm or later.`,
      target: 3,
      progressLabel: `evening ${f.sessions}`,
      sportRule: { late: true },
    },
    {
      key: 'weekender',
      name: `Weekend ${f.session}`,
      description: 'Saturdays and Sundays were made for this.',
      rule: `Complete 5 ${f.sessions} on a weekend.`,
      target: 5,
      progressLabel: `weekend ${f.sessions}`,
      sportRule: { weekend: true },
    },
    {
      key: 'host',
      name: `${f.title} host`,
      description: 'You put the plan out there and the boys showed up.',
      rule: `Host 3 ${f.sessions} with at least one confirmed meetup each.`,
      target: 3,
      progressLabel: `hosted ${f.sessions}`,
      sportRule: { hosted: true },
    },
    {
      key: 'captain',
      name: `${f.title} captain`,
      description: 'You are the one who gets everyone out there.',
      rule: `Host 10 ${f.sessions} with at least one confirmed meetup each.`,
      target: 10,
      progressLabel: `hosted ${f.sessions}`,
      sportRule: { hosted: true },
    },
    {
      key: 'crew',
      name: `${f.title} crew`,
      description: 'Good sessions with good people.',
      rule: `Confirm ${f.sessions} with 5 different mates.`,
      target: 5,
      progressLabel: 'mates',
      sportRule: { measure: 'partners' },
    },
    {
      key: 'tribe',
      name: `${f.title} tribe`,
      description: 'Half of Adelaide has shared a session with you.',
      rule: `Confirm ${f.sessions} with 15 different mates.`,
      target: 15,
      progressLabel: 'mates',
      sportRule: { measure: 'partners' },
    },
    {
      key: 'season',
      name: `${f.title} season`,
      description: 'Not just a phase. You keep coming back.',
      rule: `Complete ${f.sessions} in 3 different months.`,
      target: 3,
      progressLabel: 'months',
      sportRule: { measure: 'months' },
    },
    {
      key: 'year-round',
      name: `Year-round ${f.session}`,
      description: 'Rain, wind or heatwave, you are out there.',
      rule: `Complete ${f.sessions} in 6 different months.`,
      target: 6,
      progressLabel: 'months',
      sportRule: { measure: 'months' },
    },
  ]
}

const flavours = [
  {
    sport: 'Running', icon: 'footprints', title: 'Run', session: 'run', sessions: 'runs',
    special: [
      { key: 'long-haul', name: 'Long haul', description: 'Big kilometres are better shared.', rule: 'Complete 3 runs of 15 km or more.', target: 3, progressLabel: 'long runs', sportRule: { minNumber: { key: 'distance_km', value: 15 } } },
      { key: 'half-marathon', name: 'Half marathon crew', description: '21.1 km side by side.', rule: 'Complete a run of 21.1 km or more.', target: 1, progressLabel: 'half marathons', sportRule: { minNumber: { key: 'distance_km', value: 21.1 } } },
      { key: 'trail-runner', name: 'Trail runner', description: 'Dirt under your shoes and hills in your legs.', rule: 'Complete 5 trail runs.', target: 5, progressLabel: 'trail runs', sportRule: { detail: { key: 'terrain', values: ['Trail'] } } },
      { key: 'speed-demon', name: 'Speed demon', description: 'You like it quick.', rule: 'Complete 5 runs at fast pace (under 5:30 /km).', target: 5, progressLabel: 'fast runs', sportRule: { detail: { key: 'pace', values: ['Fast under 5:30'] } } },
      { key: '100-km', name: '100 km club', description: 'A hundred kilometres run with the crew.', rule: 'Run 100 km in total.', target: 100, progressLabel: 'km', sportRule: { measure: { sum: 'distance_km' } } },
    ],
  },
  {
    sport: 'Hiking', icon: 'mountain', title: 'Trail', session: 'hike', sessions: 'hikes',
    special: [
      { key: 'summit-seeker', name: 'Summit seeker', description: 'You chase the climbs, not the shortcuts.', rule: 'Complete 3 steep hikes.', target: 3, progressLabel: 'steep hikes', sportRule: { detail: { key: 'elevation', values: ['Steep'] } } },
      { key: 'mountain-goat', name: 'Mountain goat', description: 'Steep is your favourite word.', rule: 'Complete 10 steep hikes.', target: 10, progressLabel: 'steep hikes', sportRule: { detail: { key: 'elevation', values: ['Steep'] } } },
      { key: 'big-day-out', name: 'Big day out', description: 'Packed lunch, long trail.', rule: 'Complete 3 hikes of 15 km or more.', target: 3, progressLabel: 'long hikes', sportRule: { minNumber: { key: 'distance_km', value: 15 } } },
      { key: 'trail-collector', name: 'Trail collector', description: 'Always looking for a new track.', rule: 'Hike 5 different trails or destinations.', target: 5, progressLabel: 'trails', sportRule: { measure: { distinct: 'destination' } } },
      { key: '100-km', name: '100 km on foot', description: 'A hundred kilometres of trail behind you.', rule: 'Hike 100 km in total.', target: 100, progressLabel: 'km', sportRule: { measure: { sum: 'distance_km' } } },
    ],
  },
  {
    sport: 'Spearfishing', icon: 'fish', title: 'Reef', session: 'dive', sessions: 'dives',
    special: [
      { key: 'deep-breath', name: 'Deep breath', description: 'You dive deeper with someone watching from the top.', rule: 'Complete 3 dives at 10 m or deeper.', target: 3, progressLabel: 'deep dives', sportRule: { detail: { key: 'target_depth', values: ['10 to 15 m', '15 m+'] } } },
      { key: 'blue-water', name: 'Blue water', description: 'Where the big ones live.', rule: 'Complete 3 dives at 15 m or deeper.', target: 3, progressLabel: 'deep dives', sportRule: { detail: { key: 'target_depth', values: ['15 m+'] } } },
      { key: 'boat-crew', name: 'Boat crew', description: 'Out past the reef with your mates.', rule: 'Complete 3 boat dives.', target: 3, progressLabel: 'boat dives', sportRule: { detail: { key: 'entry', values: ['Boat dive'] } } },
      { key: 'spot-hunter', name: 'Spot hunter', description: 'You know more than one good reef.', rule: 'Dive 5 different spots.', target: 5, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
      { key: 'coast-explorer', name: 'Coast explorer', description: 'The whole gulf is your backyard.', rule: 'Dive 10 different spots.', target: 10, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
    ],
  },
  {
    sport: 'Freediving', icon: 'shell', title: 'Breath', session: 'dive', sessions: 'dives',
    special: [
      { key: 'ten-metres', name: 'Ten metres', description: 'One breath, ten metres, a buddy on top.', rule: 'Complete 3 dives at 10 m or deeper.', target: 3, progressLabel: 'deep dives', sportRule: { detail: { key: 'target_depth', values: ['10 to 15 m', '15 m+'] } } },
      { key: 'into-the-blue', name: 'Into the blue', description: 'Calm, slow and deep.', rule: 'Complete 3 dives at 15 m or deeper.', target: 3, progressLabel: 'deep dives', sportRule: { detail: { key: 'target_depth', values: ['15 m+'] } } },
      { key: 'boat-day', name: 'Boat day', description: 'Out past the reef with your buddies.', rule: 'Complete 3 boat dives.', target: 3, progressLabel: 'boat dives', sportRule: { detail: { key: 'entry', values: ['Boat dive'] } } },
      { key: 'reef-hopper', name: 'Reef hopper', description: 'You know more than one good reef.', rule: 'Dive 5 different spots.', target: 5, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
      { key: 'gulf-explorer', name: 'Gulf explorer', description: 'The whole coast is your pool.', rule: 'Dive 10 different spots.', target: 10, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
    ],
  },
  {
    sport: 'Kitesurfing', icon: 'wind', title: 'Kite', session: 'kite session', sessions: 'kite sessions',
    special: [
      { key: 'foil-flyer', name: 'Foil flyer', description: 'Silent, smooth and a little bit addictive.', rule: 'Complete 3 foil sessions.', target: 3, progressLabel: 'foil sessions', sportRule: { detail: { key: 'discipline', values: ['Foil'] } } },
      { key: 'wave-rider', name: 'Wave rider', description: 'Kite in one hand, waves under your feet.', rule: 'Complete 3 wave sessions.', target: 3, progressLabel: 'wave sessions', sportRule: { detail: { key: 'discipline', values: ['Wave'] } } },
      { key: 'freestyler', name: 'Freestyler', description: 'Big air, bigger grins.', rule: 'Complete 3 freestyle sessions.', target: 3, progressLabel: 'freestyle sessions', sportRule: { detail: { key: 'discipline', values: ['Freestyle'] } } },
      { key: 'spot-hopper', name: 'Spot hopper', description: 'You follow the wind wherever it blows.', rule: 'Kite at 5 different spots.', target: 5, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
      { key: 'marathon', name: 'Marathon session', description: 'You stayed out until your arms gave up.', rule: 'Complete 3 sessions of 3 hours or more.', target: 3, progressLabel: 'long sessions', sportRule: { minNumber: { key: 'duration_hours', value: 3 } } },
    ],
  },
  {
    sport: 'Surfing', icon: 'waves', title: 'Surf', session: 'surf', sessions: 'surfs',
    special: [
      { key: 'log-rider', name: 'Log rider', description: 'Cross-stepping with style.', rule: 'Complete 5 longboard surfs.', target: 5, progressLabel: 'longboard surfs', sportRule: { detail: { key: 'board', values: ['Longboard'] } } },
      { key: 'shortboard', name: 'Shortboard shredder', description: 'Quick turns and late drops.', rule: 'Complete 5 shortboard surfs.', target: 5, progressLabel: 'shortboard surfs', sportRule: { detail: { key: 'board', values: ['Shortboard'] } } },
      { key: 'break-hunter', name: 'Break hunter', description: 'Always checking another break.', rule: 'Surf 5 different spots.', target: 5, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
      { key: 'coast-tripper', name: 'Coast tripper', description: 'From Middleton to the Mid Coast.', rule: 'Surf 10 different spots.', target: 10, progressLabel: 'spots', sportRule: { measure: { distinct: 'spot' } } },
      { key: 'long-session', name: 'Long session', description: 'One more wave turned into three hours.', rule: 'Complete 3 surfs of 3 hours or more.', target: 3, progressLabel: 'long surfs', sportRule: { minNumber: { key: 'duration_hours', value: 3 } } },
    ],
  },
  {
    sport: 'Swimming', icon: 'waves', title: 'Swim', session: 'swim', sessions: 'swims',
    special: [
      { key: 'open-water', name: 'Open water', description: 'No lane ropes, just the coast.', rule: 'Complete 3 ocean swims.', target: 3, progressLabel: 'ocean swims', sportRule: { detail: { key: 'location', values: ['Ocean'] } } },
      { key: 'salt-veteran', name: 'Salt veteran', description: 'The jetty swim is your morning coffee.', rule: 'Complete 10 ocean swims.', target: 10, progressLabel: 'ocean swims', sportRule: { detail: { key: 'location', values: ['Ocean'] } } },
      { key: 'lap-mate', name: 'Lap mate', description: 'You turn a solo grind into a shared session.', rule: 'Complete 10 pool swims.', target: 10, progressLabel: 'pool swims', sportRule: { detail: { key: 'location', values: ['Pool'] } } },
      { key: 'distance', name: 'Distance swimmer', description: 'Two kilometres and still smiling.', rule: 'Complete 3 swims of 2,000 m or more.', target: 3, progressLabel: 'long swims', sportRule: { minNumber: { key: 'distance_m', value: 2000 } } },
      { key: '10-km', name: '10 km swum', description: 'Ten kilometres of water behind you.', rule: 'Swim 10 km in total.', target: 10, progressLabel: 'km', sportRule: { measure: { sum: 'distance_m', scale: 0.001 } } },
    ],
  },
  {
    sport: 'Gym', icon: 'dumbbell', title: 'Iron', session: 'gym session', sessions: 'gym sessions',
    special: [
      { key: 'strength-squad', name: 'Strength squad', description: 'Heavy days are better with a spotter.', rule: 'Complete 5 strength sessions.', target: 5, progressLabel: 'strength sessions', sportRule: { detail: { key: 'focus', values: ['Strength'] } } },
      { key: 'iron-will', name: 'Iron will', description: 'Twenty-five heavy days with the crew.', rule: 'Complete 25 strength sessions.', target: 25, progressLabel: 'strength sessions', sportRule: { detail: { key: 'focus', values: ['Strength'] } } },
      { key: 'pump-crew', name: 'Pump crew', description: 'Chasing the pump together.', rule: 'Complete 10 hypertrophy sessions.', target: 10, progressLabel: 'hypertrophy sessions', sportRule: { detail: { key: 'focus', values: ['Hypertrophy'] } } },
      { key: 'cardio-crew', name: 'Cardio crew', description: 'Heart rate up, excuses down.', rule: 'Complete 10 cardio sessions.', target: 10, progressLabel: 'cardio sessions', sportRule: { detail: { key: 'focus', values: ['Cardio'] } } },
      { key: 'long-haul', name: 'Long haul lifter', description: 'You do not rush a good session.', rule: 'Complete 5 sessions of 90 minutes or more.', target: 5, progressLabel: 'long sessions', sportRule: { minNumber: { key: 'duration_minutes', value: 90 } } },
    ],
  },
  {
    sport: 'Mountain biking', icon: 'bike', title: 'Dirt', session: 'ride', sessions: 'rides',
    special: [
      { key: 'black-line', name: 'Black line', description: 'You ride the hard lines with backup.', rule: 'Complete 3 rides on black trails.', target: 3, progressLabel: 'black trail rides', sportRule: { detail: { key: 'trail_grade', values: ['Black'] } } },
      { key: 'black-diamond', name: 'Black diamond', description: 'Black trails are your home turf.', rule: 'Complete 10 rides on black trails.', target: 10, progressLabel: 'black trail rides', sportRule: { detail: { key: 'trail_grade', values: ['Black'] } } },
      { key: 'blue-groove', name: 'Blue groove', description: 'Flow, berms and good company.', rule: 'Complete 10 rides on blue trails.', target: 10, progressLabel: 'blue trail rides', sportRule: { detail: { key: 'trail_grade', values: ['Blue'] } } },
      { key: 'park-hopper', name: 'Park hopper', description: 'Eagle, Fox Creek, Cudlee and more.', rule: 'Ride 5 different trail parks.', target: 5, progressLabel: 'trail parks', sportRule: { measure: { distinct: 'trail_park' } } },
      { key: '200-km', name: '200 km of dirt', description: 'Two hundred kilometres of singletrack.', rule: 'Ride 200 km in total.', target: 200, progressLabel: 'km', sportRule: { measure: { sum: 'distance_km' } } },
    ],
  },
  {
    sport: 'Road cycling', icon: 'bike', title: 'Road', session: 'ride', sessions: 'rides',
    special: [
      { key: 'century-crew', name: 'Century crew', description: '100 km in the legs, coffee well earned.', rule: 'Complete 3 rides of 100 km or more.', target: 3, progressLabel: 'long rides', sportRule: { minNumber: { key: 'distance_km', value: 100 } } },
      { key: 'century-veteran', name: 'Century veteran', description: 'Hundred-kilometre days are just another Sunday.', rule: 'Complete 10 rides of 100 km or more.', target: 10, progressLabel: 'long rides', sportRule: { minNumber: { key: 'distance_km', value: 100 } } },
      { key: 'fast-bunch', name: 'Fast bunch', description: 'Holding the wheel at 30+.', rule: 'Complete 5 fast rides (30+ km/h).', target: 5, progressLabel: 'fast rides', sportRule: { detail: { key: 'average_speed', values: ['Fast 30+ km/h'] } } },
      { key: 'route-finder', name: 'Route finder', description: 'Always mapping a new loop.', rule: 'Ride 5 different routes.', target: 5, progressLabel: 'routes', sportRule: { measure: { distinct: 'route' } } },
      { key: '1000-km', name: '1,000 km club', description: 'A thousand kilometres ridden with the crew.', rule: 'Ride 1,000 km in total.', target: 1000, progressLabel: 'km', sportRule: { measure: { sum: 'distance_km' } } },
    ],
  },
  {
    sport: 'SUP / kayak', icon: 'sailboat', title: 'Paddle', session: 'paddle', sessions: 'paddles',
    special: [
      { key: 'kayak-crew', name: 'Kayak crew', description: 'Two blades and a long way to go.', rule: 'Complete 3 kayak sessions.', target: 3, progressLabel: 'kayak sessions', sportRule: { detail: { key: 'craft', values: ['Kayak'] } } },
      { key: 'stand-up', name: 'Stand-up crew', description: 'Balance, core and calm water.', rule: 'Complete 5 SUP sessions.', target: 5, progressLabel: 'SUP sessions', sportRule: { detail: { key: 'craft', values: ['SUP'] } } },
      { key: 'water-explorer', name: 'Water explorer', description: 'Rivers, lakes, coves and the gulf.', rule: 'Paddle at 5 different locations.', target: 5, progressLabel: 'locations', sportRule: { measure: { distinct: 'location' } } },
      { key: 'long-paddle', name: 'Long paddle', description: 'Ten kilometres and sore shoulders.', rule: 'Complete 3 paddles of 10 km or more.', target: 3, progressLabel: 'long paddles', sportRule: { minNumber: { key: 'distance_km', value: 10 } } },
      { key: '50-km', name: '50 km paddled', description: 'Fifty kilometres on the water.', rule: 'Paddle 50 km in total.', target: 50, progressLabel: 'km', sportRule: { measure: { sum: 'distance_km' } } },
    ],
  },
  {
    sport: 'Scuba diving', icon: 'anchor', title: 'Dive', session: 'dive', sessions: 'dives',
    special: [
      { key: 'deep-diver', name: 'Deep diver', description: 'Down where the light turns blue.', rule: 'Complete 3 dives to 18 m or deeper.', target: 3, progressLabel: 'deep dives', sportRule: { minNumber: { key: 'max_depth_m', value: 18 } } },
      { key: 'wall-diver', name: 'Wall diver', description: 'Thirty metres with a buddy at your side.', rule: 'Complete 3 dives to 30 m or deeper.', target: 3, progressLabel: 'deep dives', sportRule: { minNumber: { key: 'max_depth_m', value: 30 } } },
      { key: 'site-collector', name: 'Site collector', description: 'Rapid Bay, Edithburgh and beyond.', rule: 'Dive 5 different dive sites.', target: 5, progressLabel: 'dive sites', sportRule: { measure: { distinct: 'dive_site' } } },
      { key: 'reef-explorer', name: 'Reef explorer', description: 'Your logbook reads like a map.', rule: 'Dive 10 different dive sites.', target: 10, progressLabel: 'dive sites', sportRule: { measure: { distinct: 'dive_site' } } },
      { key: 'rescue-ready', name: 'Rescue ready', description: 'Diving with the most experienced crew.', rule: 'Complete 3 dives that need Rescue or higher.', target: 3, progressLabel: 'rescue-level dives', sportRule: { detail: { key: 'certification', values: ['Rescue or higher'] } } },
    ],
  },
  {
    sport: 'Climbing / bouldering', icon: 'mountain-snow', title: 'Crag', session: 'climb', sessions: 'climbs',
    special: [
      { key: 'rock-out', name: 'Rock out', description: 'You took it off the plastic and onto real rock.', rule: 'Complete 3 outdoor climbs.', target: 3, progressLabel: 'outdoor climbs', sportRule: { detail: { key: 'setting', values: ['Outdoor'] } } },
      { key: 'crag-rat', name: 'Crag rat', description: 'Morialta knows your chalk bag.', rule: 'Complete 10 outdoor climbs.', target: 10, progressLabel: 'outdoor climbs', sportRule: { detail: { key: 'setting', values: ['Outdoor'] } } },
      { key: 'plastic', name: 'Plastic fantastic', description: 'Twenty-five indoor sessions of good beta.', rule: 'Complete 25 indoor climbs.', target: 25, progressLabel: 'indoor climbs', sportRule: { detail: { key: 'setting', values: ['Indoor'] } } },
      { key: 'venue-hopper', name: 'Venue hopper', description: 'Every wall in town has your chalk on it.', rule: 'Climb at 5 different venues.', target: 5, progressLabel: 'venues', sportRule: { measure: { distinct: 'venue' } } },
      { key: 'wall-collector', name: 'Wall collector', description: 'Ten venues, ten sets of problems.', rule: 'Climb at 10 different venues.', target: 10, progressLabel: 'venues', sportRule: { measure: { distinct: 'venue' } } },
    ],
  },
] satisfies SportFlavour[]

// Every sport in data/sports.ts needs a block above. If one is missing, this line
// fails the build and names the sport.
const everySportHasPatches: Exclude<SportName, (typeof flavours)[number]['sport']> extends never ? true : Exclude<SportName, (typeof flavours)[number]['sport']> = true
void everySportHasPatches

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function buildSportPatches(): PatchDefinition[] {
  return flavours.flatMap((flavour) =>
    [...sharedPatches(flavour), ...flavour.special].map((patch) => ({
      id: `${slug(flavour.sport)}-${patch.key}`,
      name: patch.name,
      icon: flavour.icon,
      category: flavour.sport,
      description: patch.description,
      rule: patch.rule,
      metric: 'sport' as const,
      target: patch.target,
      progressLabel: patch.progressLabel,
      sportRule: { sport: flavour.sport, ...patch.sportRule },
    })),
  )
}
