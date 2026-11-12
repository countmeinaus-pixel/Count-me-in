import {
  Anchor,
  Bike,
  Dumbbell,
  Fish,
  Footprints,
  Mountain,
  MountainSnow,
  Plus,
  Sailboat,
  Shell,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  Running: Footprints,
  Hiking: Mountain,
  Spearfishing: Fish,
  Freediving: Shell,
  Kitesurfing: Wind,
  Surfing: Waves,
  Swimming: Waves,
  Gym: Dumbbell,
  'Mountain biking': Bike,
  'Road cycling': Bike,
  'SUP / kayak': Sailboat,
  'Scuba diving': Anchor,
  'Climbing / bouldering': MountainSnow,
  'Open activity': Plus,
}

export function SportIcon({ sport, className }: { sport: string; className?: string }) {
  const Icon = icons[sport] ?? Plus
  return <Icon className={className} aria-hidden="true" />
}
