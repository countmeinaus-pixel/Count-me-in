import { Plus } from 'lucide-react'
import { getSportIconKey } from '../data/sports'
import { sportIconsByKey } from './sportIcons'

// The icon for a sport, from the one sports list in data/sports.ts.
export function SportIcon({ sport, className }: { sport: string; className?: string }) {
  const Icon = sportIconsByKey[getSportIconKey(sport)] ?? Plus
  return <Icon className={className} aria-hidden="true" />
}
