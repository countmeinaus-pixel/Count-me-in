import { buildSportPatches } from './sportPatches'
import { sportNames, type SportName } from './sports'

export type PatchCategory = 'Getting started' | 'Consistency' | 'Sports' | 'Social' | SportName
export type PatchMetric = 'meetups' | 'earlyBird' | 'saltWater' | 'trailhead' | 'hosted' | 'sports' | 'sport' | 'prConfirms'

// Sports come from the one list in data/sports.ts.
export type { SportName }

// Counts confirmed sessions in one sport, optionally only those with a
// matching preset detail, a minimum number (distance, depth) or an early start.
export type SportPatchRule = {
  sport: SportName
  detail?: { key: string; values: string[] }
  minNumber?: { key: string; value: number }
  early?: boolean // starts before 7 am
  late?: boolean // starts at 5 pm or later
  weekend?: boolean
  hosted?: boolean
  // What to count: sessions (default), total of a number, different values of
  // a detail (spots, venues), different mates, or different months.
  measure?: 'sessions' | 'partners' | 'months' | { sum: string; scale?: number } | { distinct: string }
}

export type PatchDefinition = {
  id: string
  name: string
  icon: string
  category: PatchCategory
  description: string
  rule: string
  metric: PatchMetric
  target: number
  progressLabel: string
  sportRule?: SportPatchRule
}

const basePatches: PatchDefinition[] = [
  {
    id: 'witness',
    name: 'Witness',
    icon: 'eye',
    category: 'Social',
    description: 'You help keep personal records honest.',
    rule: "Confirm 5 PRs of other members.",
    metric: 'prConfirms',
    target: 5,
    progressLabel: 'PRs confirmed',
  },
  {
    id: 'trusted-witness',
    name: 'Trusted witness',
    icon: 'eye',
    category: 'Social',
    description: 'When you say it happened, people believe it.',
    rule: "Confirm 25 PRs of other members.",
    metric: 'prConfirms',
    target: 25,
    progressLabel: 'PRs confirmed',
  },
  {
    id: 'judge',
    name: 'Judge',
    icon: 'gavel',
    category: 'Social',
    description: 'The crew trusts your call.',
    rule: "Confirm 100 PRs of other members.",
    metric: 'prConfirms',
    target: 100,
    progressLabel: 'PRs confirmed',
  },
  {
    id: 'first-meetup',
    name: 'First meetup',
    icon: 'shield',
    category: 'Getting started',
    description: 'Your first confirmed meetup is in the books.',
    rule: 'Complete 1 confirmed meetup.',
    metric: 'meetups',
    target: 1,
    progressLabel: 'meetups',
  },
  {
    id: 'host',
    name: 'Host',
    icon: 'users',
    category: 'Getting started',
    description: 'You made a plan and helped the crew get together.',
    rule: 'Host 3 activities with at least one confirmed meetup each.',
    metric: 'hosted',
    target: 3,
    progressLabel: 'hosted activities',
  },
  {
    id: 'regular',
    name: 'Regular',
    icon: 'calendar',
    category: 'Consistency',
    description: 'You keep showing up for good plans.',
    rule: 'Complete 5 confirmed meetups.',
    metric: 'meetups',
    target: 5,
    progressLabel: 'meetups',
  },
  {
    id: 'early-bird',
    name: 'Early bird',
    icon: 'sunrise',
    category: 'Consistency',
    description: 'Some of the best sessions start before the day gets busy.',
    rule: 'Complete 3 meetups starting before 7 am.',
    metric: 'earlyBird',
    target: 3,
    progressLabel: 'early starts',
  },
  {
    id: 'salt-water',
    name: 'Salt water',
    icon: 'waves',
    category: 'Sports',
    description: 'You have made time for the coast and the water.',
    rule: 'Complete 5 ocean activities.',
    metric: 'saltWater',
    target: 5,
    progressLabel: 'ocean meetups',
  },
  {
    id: 'trailhead',
    name: 'Trailhead',
    icon: 'mountain',
    category: 'Sports',
    description: 'You have spent time out on the trails.',
    rule: 'Complete 5 hikes or trail runs.',
    metric: 'trailhead',
    target: 5,
    progressLabel: 'trail meetups',
  },
  {
    id: 'all-rounder',
    name: 'All rounder',
    icon: 'medal',
    category: 'Sports',
    description: 'You have shared good sessions across different sports.',
    rule: 'Confirm meetups in 4 different sports.',
    metric: 'sports',
    target: 4,
    progressLabel: 'sports',
  },
  {
    id: 'crew',
    name: 'Crew',
    icon: 'users',
    category: 'Social',
    description: 'A regular crew takes time and plenty of shared plans.',
    rule: 'Complete 10 confirmed meetups.',
    metric: 'meetups',
    target: 10,
    progressLabel: 'meetups',
  },
]

export const patchDefinitions: PatchDefinition[] = [...basePatches, ...buildSportPatches()]

export const patchCategories: PatchCategory[] = [
  'Getting started', 'Consistency', 'Sports', 'Social',
  ...sportNames,
]
