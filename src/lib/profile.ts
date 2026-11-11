import type { CommunityMember } from '../data/mockData'
import { supabase } from './supabase'

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Experienced'

export type SaveProfileInput = {
  id: string
  email: string
  firstName: string
  age: number
  dateOfBirth: string
  suburb: string
  bio: string
  photoUrl?: string
  sports: Array<{ sport: string; skill: SkillLevel }>
  availability: string[]
}

export type ProfileSport = {
  id: number
  name: string
  icon: string | null
  skill: SkillLevel
}

export type CurrentProfile = {
  id: string
  email: string
  firstName: string
  age: number
  dateOfBirth: string | null
  suburb: string
  bio: string
  photoUrl: string | null
  selfieVerified: boolean
  sports: ProfileSport[]
}

export function calculateAgeFromDateOfBirth(dateOfBirth: string) {
  if (!dateOfBirth) return null

  const birthDate = new Date(`${dateOfBirth}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  if (!hasBirthdayPassed) age -= 1
  return age
}

async function getAuthenticatedUserId(expectedUserId?: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Your session expired. Please sign in again.')
  }
  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new Error('Your session does not match this profile. Please sign in again.')
  }
  return data.user.id
}

export async function getCurrentProfile(userId?: string): Promise<CurrentProfile | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const authenticatedUserId = await getAuthenticatedUserId(userId)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name, age, date_of_birth, suburb, bio, photo_url, selfie_verified')
    .eq('id', authenticatedUserId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return null

  const { data: profileSports, error: profileSportsError } = await supabase
    .from('profile_sports')
    .select('sport_id, skill')
    .eq('profile_id', authenticatedUserId)

  if (profileSportsError) throw profileSportsError

  const sportsIds = (profileSports ?? []).map((item) => item.sport_id)
  const sportsResult = sportsIds.length > 0
    ? await supabase.from('sports').select('id, name, icon').in('id', sportsIds)
    : { data: [], error: null }
  if (sportsResult.error) throw sportsResult.error

  const skillBySportId = new Map((profileSports ?? []).map((item) => [item.sport_id, item.skill as SkillLevel]))
  const sportById = new Map((sportsResult.data ?? []).map((sport) => [sport.id, sport]))

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    age: profile.age,
    dateOfBirth: profile.date_of_birth,
    suburb: profile.suburb,
    bio: profile.bio ?? '',
    photoUrl: profile.photo_url,
    selfieVerified: profile.selfie_verified,
    sports: (profileSports ?? [])
      .flatMap((item) => {
        const sport = sportById.get(item.sport_id)
        return sport
          ? [{ ...sport, skill: skillBySportId.get(item.sport_id) ?? 'Intermediate' }]
          : []
      })
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export async function saveProfile(input: SaveProfileInput) {
  await getAuthenticatedUserId(input.id)
  if (!supabase) throw new Error('Supabase is not configured yet.')

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: input.id,
    email: input.email,
    first_name: input.firstName,
    age: input.age,
    date_of_birth: input.dateOfBirth,
    suburb: input.suburb,
    bio: input.bio,
    photo_url: input.photoUrl ?? null,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (profileError) throw profileError

  const sportNames = input.sports.map((item) => item.sport)
  const { data: sportCatalog, error: sportCatalogError } = sportNames.length
    ? await supabase.from('sports').select('id, name').in('name', sportNames)
    : { data: [], error: null }

  if (sportCatalogError) throw sportCatalogError

  const sportMap = new Map((sportCatalog ?? []).map((sport) => [sport.name, sport.id]))
  const sportRows = input.sports
    .map((item) => {
      const sportId = sportMap.get(item.sport)
      if (sportId == null) return null

      return {
        profile_id: input.id,
        sport_id: sportId,
        skill: item.skill,
      }
    })
    .filter(Boolean) as Array<{ profile_id: string; sport_id: number; skill: string }>

  // Sports and availability can be skipped during onboarding.
  if (sportRows.length > 0) {
    const { error: sportError } = await supabase.from('profile_sports').upsert(sportRows, {
      onConflict: 'profile_id,sport_id',
    })
    if (sportError) throw sportError
  }

  const availabilityRows = input.availability.map((slot) => ({
    profile_id: input.id,
    availability: slot,
  }))

  if (availabilityRows.length > 0) {
    const { error: availabilityError } = await supabase.from('profile_availability').upsert(availabilityRows, {
      onConflict: 'profile_id,availability',
    })
    if (availabilityError) throw availabilityError
  }

  return true
}

export async function updateProfileDetails(input: {
  id: string
  firstName: string
  dateOfBirth: string
  suburb: string
  bio: string
  photoUrl: string | null
}) {
  await getAuthenticatedUserId(input.id)
  if (!supabase) throw new Error('Supabase is not configured yet.')

  const age = calculateAgeFromDateOfBirth(input.dateOfBirth)
  if (age === null || age < 18 || age > 99) {
    throw new Error('Enter a valid date of birth. You must be 18 or older.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName,
      age,
      date_of_birth: input.dateOfBirth,
      suburb: input.suburb,
      bio: input.bio,
      photo_url: input.photoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)

  if (error) throw error
  return age
}

export async function saveProfileSports(userId: string, sports: Array<{ name: string; skill: SkillLevel }>) {
  await getAuthenticatedUserId(userId)
  if (!supabase) throw new Error('Supabase is not configured yet.')
  if (sports.length === 0) throw new Error('Choose at least one sport.')

  const { data: catalog, error: catalogError } = await supabase
    .from('sports')
    .select('id, name')
    .in('name', sports.map((sport) => sport.name))

  if (catalogError) throw catalogError
  const idsByName = new Map((catalog ?? []).map((sport) => [sport.name, sport.id]))
  const missingSports = sports.filter((sport) => !idsByName.has(sport.name))
  if (missingSports.length > 0) {
    throw new Error(`These sports are missing from the Supabase catalogue: ${missingSports.map((sport) => sport.name).join(', ')}`)
  }

  const rows = sports.map((sport) => ({
    profile_id: userId,
    sport_id: idsByName.get(sport.name)!,
    skill: sport.skill,
  }))

  const { error: saveError } = await supabase.from('profile_sports').upsert(rows, {
    onConflict: 'profile_id,sport_id',
  })
  if (saveError) throw saveError

  const selectedIds = rows.map((row) => row.sport_id)
  const { error: removeError } = await supabase
    .from('profile_sports')
    .delete()
    .eq('profile_id', userId)
    .not('sport_id', 'in', `(${selectedIds.join(',')})`)

  if (removeError) throw removeError
}

export async function compressProfilePhoto(file: File, square = false) {
  const bitmap = await createImageBitmap(file)
  const maxDimension = 800
  const sourceSize = square ? Math.min(bitmap.width, bitmap.height) : Math.max(bitmap.width, bitmap.height)
  const scale = Math.min(1, maxDimension / sourceSize)
  const width = square ? Math.min(sourceSize, maxDimension) : Math.max(1, Math.round(bitmap.width * scale))
  const height = square ? width : Math.max(1, Math.round(bitmap.height * scale))
  const sourceX = square ? (bitmap.width - sourceSize) / 2 : 0
  const sourceY = square ? (bitmap.height - sourceSize) / 2 : 0

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available in this browser.')
  }

  context.drawImage(bitmap, sourceX, sourceY, square ? sourceSize : bitmap.width, square ? sourceSize : bitmap.height, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.8),
  )

  if (!blob) {
    throw new Error('Unable to compress photo.')
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
  })
}

export async function uploadProfilePhoto(file: File, userId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteProfilePhoto(photoUrl: string, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')

  const marker = '/storage/v1/object/public/avatars/'
  const pathStart = new URL(photoUrl).pathname.indexOf(marker)
  if (pathStart === -1) return

  const objectPath = decodeURIComponent(new URL(photoUrl).pathname.slice(pathStart + marker.length))
  if (!objectPath || !objectPath.startsWith(`${userId}/`)) return

  const { error } = await supabase.storage.from('avatars').remove([objectPath])
  if (error) throw error
}

export async function updateProfilePhoto(userId: string, file: File) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const compressedFile = await compressProfilePhoto(file)
  const photoUrl = await uploadProfilePhoto(compressedFile, userId)

  const { error } = await supabase
    .from('profiles')
    .update({
      photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) throw error

  return photoUrl
}

export type CommunityProfileRow = {
  id: string
  first_name: string
  age: number
  suburb: string
  photo_url: string | null
  selfie_verified: boolean
}

export async function toCommunityMembers(rows: CommunityProfileRow[]): Promise<CommunityMember[]> {
  if (!supabase || rows.length === 0) return []

  const profileIds = rows.map((row) => row.id)
  const client = supabase
  const [profileSportsResult, hostedResult, availabilityResult, extrasResult] = await Promise.all([
    client.from('profile_sports').select('profile_id, sport_id, skill').in('profile_id', profileIds),
    client.from('activities').select('host_id').in('host_id', profileIds),
    client.from('profile_availability').select('profile_id, availability').in('profile_id', profileIds),
    // Shared location columns only exist after the database update: fall back without them.
    client.from('profiles').select('id, created_at, shared_latitude, shared_longitude').in('id', profileIds)
      .then((result) => result.error
        ? client.from('profiles').select('id, created_at').in('id', profileIds)
        : result),
  ])
  const availabilityById = new Map<string, string[]>()
  for (const row of availabilityResult.data ?? []) {
    availabilityById.set(row.profile_id, [...(availabilityById.get(row.profile_id) ?? []), row.availability])
  }
  type ExtrasRow = { id: string; created_at: string; shared_latitude?: number | null; shared_longitude?: number | null }
  const extrasById = new Map(((extrasResult.data ?? []) as ExtrasRow[]).map((row) => [row.id, row]))
  if (profileSportsResult.error) throw profileSportsResult.error
  if (hostedResult.error) throw hostedResult.error

  const profileSports = profileSportsResult.data ?? []
  const sportIds = [...new Set(profileSports.map((item) => item.sport_id))]
  const sportsResult = sportIds.length > 0
    ? await supabase.from('sports').select('id, name').in('id', sportIds)
    : { data: [], error: null }
  if (sportsResult.error) throw sportsResult.error
  const sportNameById = new Map((sportsResult.data ?? []).map((sport) => [sport.id, sport.name]))

  return rows.map((row) => {
    const sports = profileSports
      .filter((item) => item.profile_id === row.id)
      .flatMap((item) => {
        const name = sportNameById.get(item.sport_id)
        return name ? [{ name, level: item.skill, meetups: 0 }] : []
      })
      .sort((left, right) => left.name.localeCompare(right.name))
    return {
      id: row.id,
      name: row.first_name,
      age: row.age,
      suburb: row.suburb,
      verified: row.selfie_verified,
      photoUrl: row.photo_url ?? undefined,
      sports,
      stats: {
        meetups: 0,
        hosted: (hostedResult.data ?? []).filter((activity) => activity.host_id === row.id).length,
        sports: sports.length,
      },
      createdAt: extrasById.get(row.id)?.created_at,
      availability: availabilityById.get(row.id) ?? [],
      sharedLocation: extrasById.get(row.id)?.shared_latitude != null && extrasById.get(row.id)?.shared_longitude != null
        ? { latitude: extrasById.get(row.id)!.shared_latitude!, longitude: extrasById.get(row.id)!.shared_longitude! }
        : null,
    }
  })
}

export const communityProfileColumns = 'id, first_name, age, suburb, photo_url, selfie_verified'

export async function getCommunityProfiles(limit = 50): Promise<CommunityMember[]> {
  if (!supabase) return []
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select(communityProfileColumns)
    .neq('id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return toCommunityMembers(data ?? [])
}

const profileIdPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Real members open as /profile/name-<account id>, e.g. /profile/jai-8f3c…, so
// two people with the same first name never mix up. Demo members (no id) open by name.
export function getProfilePath(member: { id?: string | null; name: string }) {
  if (!member.id) return `/profile/${encodeURIComponent(member.name)}`
  const slug = member.name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `/profile/${slug ? `${slug}-` : ''}${member.id}`
}

// The account id at the end of a profile link, or null for a demo member's name.
export function getProfileIdFromKey(key: string) {
  return key.match(profileIdPattern)?.[0].toLowerCase() ?? null
}

export async function getCommunityProfileById(id: string): Promise<CommunityMember | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select(communityProfileColumns)
    .eq('id', id)
    .limit(1)
  if (error) throw error
  const [member] = await toCommunityMembers(data ?? [])
  return member ?? null
}

export async function getCommunityProfileByName(name: string): Promise<CommunityMember | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select(communityProfileColumns)
    .eq('first_name', name)
    .limit(1)
  if (error) throw error
  const [member] = await toCommunityMembers(data ?? [])
  return member ?? null
}

// Share (rounded to about 1 km) or stop sharing your approximate location.
export async function saveSharedLocation(userId: string, point: { latitude: number; longitude: number } | null) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase
    .from('profiles')
    .update({
      shared_latitude: point ? Math.round(point.latitude * 100) / 100 : null,
      shared_longitude: point ? Math.round(point.longitude * 100) / 100 : null,
      location_shared_at: point ? new Date().toISOString() : null,
    })
    .eq('id', userId)
  if (error) {
    const code = 'code' in error ? String(error.code) : ''
    if (code === 'PGRST204' || code === '42703') throw new Error('Sharing your location needs a database update first.')
    throw error
  }
}
