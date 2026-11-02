import {
  CalendarDays,
  Medal,
  Mountain,
  ShieldCheck,
  Sunrise,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  calendar: CalendarDays,
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
