import {
  Anchor,
  Bike,
  CalendarDays,
  Dumbbell,
  Eye,
  Fish,
  Footprints,
  Gavel,
  MountainSnow,
  Sailboat,
  Wind,
  Medal,
  Mountain,
  ShieldCheck,
  Sunrise,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  anchor: Anchor,
  bike: Bike,
  calendar: CalendarDays,
  dumbbell: Dumbbell,
  eye: Eye,
  fish: Fish,
  footprints: Footprints,
  gavel: Gavel,
  'mountain-snow': MountainSnow,
  sailboat: Sailboat,
  wind: Wind,
  medal: Medal,
  mountain: Mountain,
  shield: ShieldCheck,
  sunrise: Sunrise,
  users: Users,
  waves: Waves,
}

export function PatchIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Medal
  return <Icon className={className} aria-hidden="true" />
}
