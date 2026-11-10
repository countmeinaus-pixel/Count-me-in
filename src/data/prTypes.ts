// Fixed personal record (PR) types per sport, so records are comparable.
// Time records are stored in seconds; lower is better for those.

export type PrFormat = 'number' | 'time'

export type PrType = {
  key: string
  sport: string
  label: string
  format: PrFormat
  unit: string // shown after numbers, e.g. "m" or "kg"
  better: 'higher' | 'lower'
}

const types: Array<Omit<PrType, 'better'> & { better?: PrType['better'] }> = [
  { sport: 'Spearfishing', key: 'spear-depth', label: 'Deepest dive', format: 'number', unit: 'm' },
  { sport: 'Spearfishing', key: 'spear-breath-hold', label: 'Longest breath-hold', format: 'time', unit: '' },
  { sport: 'Spearfishing', key: 'spear-fish', label: 'Biggest fish', format: 'number', unit: 'kg' },
  { sport: 'Running', key: 'run-5k', label: '5 km time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Running', key: 'run-10k', label: '10 km time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Running', key: 'run-half', label: 'Half marathon time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Running', key: 'run-marathon', label: 'Marathon time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Running', key: 'run-longest', label: 'Longest run', format: 'number', unit: 'km' },
  { sport: 'Hiking', key: 'hike-longest', label: 'Longest hike', format: 'number', unit: 'km' },
  { sport: 'Hiking', key: 'hike-elevation', label: 'Most elevation in a day', format: 'number', unit: 'm' },
  { sport: 'Kitesurfing', key: 'kite-jump', label: 'Highest jump', format: 'number', unit: 'm' },
  { sport: 'Kitesurfing', key: 'kite-speed', label: 'Top speed', format: 'number', unit: 'km/h' },
  { sport: 'Surfing', key: 'surf-wave', label: 'Biggest wave', format: 'number', unit: 'ft' },
  { sport: 'Surfing', key: 'surf-session', label: 'Longest session', format: 'time', unit: '' },
  { sport: 'Swimming', key: 'swim-1k', label: '1 km time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Swimming', key: 'swim-longest', label: 'Longest ocean swim', format: 'number', unit: 'km' },
  { sport: 'Gym', key: 'gym-bench', label: 'Bench press', format: 'number', unit: 'kg' },
  { sport: 'Gym', key: 'gym-squat', label: 'Squat', format: 'number', unit: 'kg' },
  { sport: 'Gym', key: 'gym-deadlift', label: 'Deadlift', format: 'number', unit: 'kg' },
  { sport: 'Mountain biking', key: 'mtb-longest', label: 'Longest ride', format: 'number', unit: 'km' },
  { sport: 'Mountain biking', key: 'mtb-speed', label: 'Top speed', format: 'number', unit: 'km/h' },
  { sport: 'Road cycling', key: 'road-longest', label: 'Longest ride', format: 'number', unit: 'km' },
  { sport: 'Road cycling', key: 'road-40k', label: '40 km time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Road cycling', key: 'road-speed', label: 'Top speed', format: 'number', unit: 'km/h' },
  { sport: 'SUP / kayak', key: 'paddle-longest', label: 'Longest paddle', format: 'number', unit: 'km' },
  { sport: 'SUP / kayak', key: 'paddle-5k', label: '5 km time', format: 'time', unit: '', better: 'lower' },
  { sport: 'Scuba diving', key: 'scuba-depth', label: 'Deepest dive', format: 'number', unit: 'm' },
  { sport: 'Scuba diving', key: 'scuba-longest', label: 'Longest dive', format: 'time', unit: '' },
  { sport: 'Climbing / bouldering', key: 'climb-boulder', label: 'Hardest boulder', format: 'number', unit: 'V-grade' },
  { sport: 'Climbing / bouldering', key: 'climb-route', label: 'Hardest route', format: 'number', unit: 'Ewbank grade' },
]

export const prTypes: PrType[] = types.map((type) => ({ better: 'higher', ...type }))

export const prSports = [...new Set(prTypes.map((type) => type.sport))]

export function getPrType(key: string) {
  return prTypes.find((type) => type.key === key) ?? null
}

export function formatPrValue(type: PrType | null, value: number) {
  if (!type) return String(value)
  if (type.format === 'time') {
    const total = Math.round(value)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    const pad = (part: number) => String(part).padStart(2, '0')
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
  }
  const rounded = Math.round(value * 10) / 10
  return type.unit === 'V-grade' ? `V${rounded}` : `${rounded} ${type.unit}`.trim()
}

// "1:23:45", "23:45" or "45" (seconds) to seconds. Returns null when invalid.
export function parsePrTime(input: string) {
  const parts = input.trim().split(':')
  if (parts.length === 0 || parts.length > 3 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null
  const numbers = parts.map(Number)
  if (numbers.slice(1).some((part) => part >= 60)) return null
  const seconds = numbers.reduce((total, part) => total * 60 + part, 0)
  return seconds > 0 ? seconds : null
}
