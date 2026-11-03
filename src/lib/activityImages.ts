import { supabase } from './supabase'

const activityCoverBucket = 'activity-covers'

export async function compressActivityCover(file: File) {
  const bitmap = await createImageBitmap(file)
  const maxDimension = 1200
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas is not available in this browser.')
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.8),
  )

  if (!blob) {
    throw new Error('Unable to compress the activity banner.')
  }

  return new File([blob], 'activity-cover.jpg', { type: 'image/jpeg' })
}

export async function uploadActivityCover(file: File, userId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(activityCoverBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(activityCoverBucket).getPublicUrl(path)
  return { path, url: data.publicUrl }
}

export async function deleteActivityCover(path: string, userId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('You can only remove your own activity banner.')
  }

  const { error } = await supabase.storage.from(activityCoverBucket).remove([path])
  if (error) throw error
}
