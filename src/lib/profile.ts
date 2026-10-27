import { supabase } from './supabase'

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Experienced'

export type SaveProfileInput = {
  id: string
  email: string
  firstName: string
  age: number
  suburb: string
  bio: string
  photoUrl?: string
  sports: Array<{ sport: string; skill: SkillLevel }>
  availability: string[]
}

export async function saveProfile(input: SaveProfileInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
  if (sessionError || !sessionData.user) {
    throw new Error('Your session expired. Please sign in again.')
  }

  if (sessionData.user.id !== input.id) {
    throw new Error('Your session does not match this profile. Please sign in again.')
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: input.id,
    email: input.email,
    first_name: input.firstName,
    age: input.age,
    suburb: input.suburb,
    bio: input.bio,
    photo_url: input.photoUrl ?? null,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (profileError) throw profileError

  const sportNames = input.sports.map((item) => item.sport)
  const { data: sportCatalog, error: sportCatalogError } = await supabase
    .from('sports')
    .select('id, name')
    .in('name', sportNames)

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

  const { error: sportError } = await supabase.from('profile_sports').upsert(sportRows, {
    onConflict: 'profile_id,sport_id',
  })

  if (sportError) throw sportError

  const availabilityRows = input.availability.map((slot) => ({
    profile_id: input.id,
    availability: slot,
  }))

  const { error: availabilityError } = await supabase.from('profile_availability').upsert(availabilityRows, {
    onConflict: 'profile_id,availability',
  })

  if (availabilityError) throw availabilityError

  return true
}

export async function compressProfilePhoto(file: File) {
  const bitmap = await createImageBitmap(file)
  const maxDimension = 800
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available in this browser.')
  }

  context.drawImage(bitmap, 0, 0, width, height)

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

  const path = `avatars/${userId}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
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
