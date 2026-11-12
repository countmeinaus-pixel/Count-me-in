// The time zone of a place saved as "Name, STATE" (e.g. "Cottesloe, WA").
// Older entries without a state are South Australia, where the app started.
// Named zones (not fixed offsets) so daylight saving is right: NSW, VIC, TAS,
// ACT and SA have it; QLD, WA and NT do not.
// Keep in step with public.place_time_zone() in supabase/migrations/20261113090000_place_time_zones.sql.

const stateTimeZones: Record<string, string> = {
  SA: 'Australia/Adelaide',
  NSW: 'Australia/Sydney',
  ACT: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  QLD: 'Australia/Brisbane',
  WA: 'Australia/Perth',
  TAS: 'Australia/Hobart',
  NT: 'Australia/Darwin',
}

export function placeTimeZone(place: string | null | undefined): string {
  const text = (place ?? '').trim()
  // Broken Hill is in NSW but runs on South Australian time.
  if (/^broken hill\b/i.test(text)) return 'Australia/Adelaide'
  const state = text.match(/[,\s](NSW|VIC|QLD|SA|WA|TAS|NT|ACT)$/i)?.[1].toUpperCase()
  return stateTimeZones[state ?? 'SA']
}

// The calendar day ("2026-11-13") of a moment in the given time zone.
export function dateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}
