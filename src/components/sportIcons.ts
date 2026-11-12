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

// Icon keys used in data/sports.ts (and the "icon" column in Supabase).
// Adding a sport with a new icon? Import it above and add it here.
export const sportIconsByKey: Record<string, LucideIcon> = {
  anchor: Anchor,
  bike: Bike,
  dumbbell: Dumbbell,
  fish: Fish,
  footprints: Footprints,
  mountain: Mountain,
  'mountain-snow': MountainSnow,
  plus: Plus,
  sailboat: Sailboat,
  shell: Shell,
  waves: Waves,
  wind: Wind,
}
