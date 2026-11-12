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

// The device's own time zone (e.g. "Australia/Adelaide").
export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Minutes the zone is ahead of UTC at that moment (Perth: 480, Adelaide in summer: 630).
function offsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'))
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000)
}

// A date and time typed for a place ("2026-11-20", "18:00", Perth) -> the real moment.
export function zonedTimeToDate(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallClock = Date.UTC(year, month - 1, day, hour, minute)
  // Guess with the offset at that wall-clock time, then correct once for daylight saving changes.
  let result = new Date(wallClock - offsetMinutes(new Date(wallClock), timeZone) * 60_000)
  result = new Date(wallClock - offsetMinutes(result, timeZone) * 60_000)
  return result
}

// A moment -> "2026-11-20T18:00" in the place's time zone (for datetime-local fields).
export function dateToZonedInput(value: Date | string, timeZone: string) {
  const date = new Date(value)
  const shifted = new Date(date.getTime() + offsetMinutes(date, timeZone) * 60_000)
  return shifted.toISOString().slice(0, 16)
}

// True when the place's clock differs from the device's at that moment.
export function differsFromDevice(date: Date, timeZone: string) {
  return offsetMinutes(date, timeZone) !== offsetMinutes(date, deviceTimeZone())
}

// Short zone name at that moment, e.g. "AWST", "ACDT", "AEST".
export function timeZoneAbbreviation(date: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat('en-AU', { timeZone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value
  return name ?? ''
}

// "Perth time" for hints.
export function timeZoneCity(timeZone: string) {
  return timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone
}
