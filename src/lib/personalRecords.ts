import { getPrType, type PrType } from '../data/prTypes'
import { databaseUpdateNeededMessage, isMissingDatabaseFeature } from './notifications'
import { supabase } from './supabase'

const proofBucket = 'pr-proofs'
export const prVerifyThreshold = 3

export type PersonalRecord = {
  id: string
  userId: string
  ownerName: string
  ownerPhotoUrl: string | null
  sport: string
  type: PrType | null
  recordType: string
  value: number
  note: string
  photoUrl: string | null // removed once the record is verified
  confirmCount: number
  flagCount: number
  createdAt: string
  viewerVote: 'confirm' | 'flag' | null
  viewerIsOwner: boolean
  staffVerified: boolean
}

// 3 confirms from members, or one check by an admin or moderator.
export function isRecordVerified(record: Pick<PersonalRecord, 'confirmCount' | 'staffVerified'>) {
  return record.staffVerified || record.confirmCount >= prVerifyThreshold
}

type RecordRow = {
  id: string
  user_id: string
  sport: string
  record_type: string
  value: number | string
  note: string
  photo_url: string | null
  confirm_count: number
  flag_count: number
  created_at: string
  staff_verified_at?: string | null
}

const baseRecordColumns = 'id, user_id, sport, record_type, value, note, photo_url, confirm_count, flag_count, created_at'
const recordColumns = `${baseRecordColumns}, staff_verified_at`

type RecordQueryResult = { data: RecordRow[] | null; error: { code?: string; message: string } | null }

// Reads records with the staff verification column. Until that database
// update has run, the column does not exist yet: then read without it.
async function selectRecords(
  build: (columns: string) => PromiseLike<RecordQueryResult>,
): Promise<RecordQueryResult> {
  const result = await build(recordColumns)
  if (result.error && (result.error.code === '42703' || /staff_verified_at/.test(result.error.message))) {
    return build(baseRecordColumns)
  }
  return result
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

function rethrow(error: unknown): never {
  if (isMissingDatabaseFeature(error)) throw new Error(databaseUpdateNeededMessage)
  throw error
}

async function getViewerId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

async function toRecords(rows: RecordRow[], viewerId: string | null): Promise<PersonalRecord[]> {
  if (!rows.length) return []
  const client = requireSupabase()
  const ownerIds = [...new Set(rows.map((row) => row.user_id))]
  const [ownersResult, votesResult] = await Promise.all([
    client.from('profiles').select('id, first_name, photo_url').in('id', ownerIds),
    viewerId
      ? client
          .from('personal_record_votes')
          .select('record_id, vote')
          .eq('voter_id', viewerId)
          .in('record_id', rows.map((row) => row.id))
      : Promise.resolve({ data: [], error: null }),
  ])
  if (ownersResult.error) throw ownersResult.error
  if (votesResult.error) throw votesResult.error

  const owners = new Map((ownersResult.data ?? []).map((owner) => [owner.id, owner]))
  const votes = new Map((votesResult.data ?? []).map((vote) => [vote.record_id, vote.vote as 'confirm' | 'flag']))
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    ownerName: owners.get(row.user_id)?.first_name ?? 'Member',
    ownerPhotoUrl: owners.get(row.user_id)?.photo_url ?? null,
    sport: row.sport,
    type: getPrType(row.record_type),
    recordType: row.record_type,
    value: Number(row.value),
    note: row.note,
    photoUrl: row.photo_url,
    confirmCount: row.confirm_count,
    flagCount: row.flag_count,
    createdAt: row.created_at,
    viewerVote: votes.get(row.id) ?? null,
    viewerIsOwner: row.user_id === viewerId,
    staffVerified: Boolean(row.staff_verified_at),
  }))
}

// Records on a member's profile. Returns null when PRs are not available yet.
export async function getPersonalRecordsForProfile(profileId: string): Promise<PersonalRecord[] | null> {
  if (!supabase) return null
  const viewerId = await getViewerId()
  if (!viewerId) return null
  const client = supabase
  const { data, error } = await selectRecords((columns) =>
    client
      .from('personal_records')
      .select(columns)
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .returns<RecordRow[]>(),
  )
  if (error) rethrow(error)
  const records = await toRecords(data ?? [], viewerId)
  // The owner tidies up proof photos of records that are verified now.
  for (const record of records) {
    if (record.viewerIsOwner && record.photoUrl && isRecordVerified(record)) {
      void clearVerifiedPhoto(record.id).catch(() => undefined)
      record.photoUrl = null
    }
  }
  return records
}

// Removes the proof photo of a verified record (owner or moderator).
export async function clearVerifiedPhoto(recordId: string) {
  const client = requireSupabase()
  const { data: path, error } = await client.rpc('clear_verified_record_photo', { target_record_id: recordId })
  if (error) {
    if (isMissingDatabaseFeature(error)) return
    throw error
  }
  if (typeof path === 'string' && path) await client.storage.from(proofBucket).remove([path])
}

// New records from other members that the viewer has not voted on yet.
export async function getRecordsToConfirm(limit = 6): Promise<PersonalRecord[]> {
  if (!supabase) return []
  const viewerId = await getViewerId()
  if (!viewerId) return []
  const client = supabase
  const { data, error } = await selectRecords((columns) =>
    client
      .from('personal_records')
      .select(columns)
      .neq('user_id', viewerId)
      .lt('confirm_count', prVerifyThreshold)
      .order('created_at', { ascending: false })
      .limit(30)
      .returns<RecordRow[]>(),
  )
  if (error) {
    if (isMissingDatabaseFeature(error)) return []
    throw error
  }
  const records = await toRecords(data ?? [], viewerId)
  return records
    .filter((record) => record.viewerVote === null && !record.staffVerified)
    .slice(0, limit)
}

// For admins and moderators: every record that is not verified yet, flagged
// ones first. Row Level Security also returns hidden records to staff.
export async function getRecordsForStaffReview(): Promise<PersonalRecord[]> {
  const client = requireSupabase()
  const viewerId = await getViewerId()
  const { data, error } = await client
    .from('personal_records')
    .select(recordColumns)
    .is('staff_verified_at', null)
    .lt('confirm_count', prVerifyThreshold)
    .order('flag_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<RecordRow[]>()
  if (error) {
    if (error.code === '42703') throw new Error(databaseUpdateNeededMessage)
    rethrow(error)
  }
  return toRecords(data ?? [], viewerId)
}

export async function staffVerifyRecord(recordId: string, verify = true) {
  const { error } = await requireSupabase().rpc('staff_verify_personal_record', {
    target_record_id: recordId,
    verify,
  })
  if (error) rethrow(error)
  if (verify) await clearVerifiedPhoto(recordId).catch(() => undefined)
}

export async function compressProofPhoto(file: File) {
  const bitmap = await createImageBitmap(file)
  const maxDimension = 1000
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas is not available in this browser.')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
  if (!blob) throw new Error('Unable to compress the proof photo.')
  return new File([blob], 'pr-proof.jpg', { type: 'image/jpeg' })
}

export async function claimPersonalRecord(input: {
  sport: string
  recordType: string
  value: number
  note: string
  photo: File
}) {
  const client = requireSupabase()
  const viewerId = await getViewerId()
  if (!viewerId) throw new Error('Sign in before claiming a PR.')

  const photo = await compressProofPhoto(input.photo)
  const path = `${viewerId}/${crypto.randomUUID()}.jpg`
  const upload = await client.storage.from(proofBucket).upload(path, photo, { cacheControl: '3600', upsert: false })
  if (upload.error) {
    if (/bucket not found/i.test(upload.error.message)) throw new Error(databaseUpdateNeededMessage)
    throw upload.error
  }
  const photoUrl = client.storage.from(proofBucket).getPublicUrl(path).data.publicUrl

  const { error } = await client.from('personal_records').insert({
    user_id: viewerId,
    sport: input.sport,
    record_type: input.recordType,
    value: input.value,
    note: input.note.trim(),
    photo_url: photoUrl,
    photo_path: path,
  })
  if (error) {
    await client.storage.from(proofBucket).remove([path])
    rethrow(error)
  }
}

export async function deletePersonalRecord(record: PersonalRecord) {
  await removePersonalRecordById(record.id)
}

// Owners remove their own PRs; moderators remove flagged ones.
export async function removePersonalRecordById(recordId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('personal_records')
    .delete()
    .eq('id', recordId)
    .select('photo_path')
    .maybeSingle()
  if (error) rethrow(error)
  if (data?.photo_path) await client.storage.from(proofBucket).remove([data.photo_path])
}

export async function voteOnPersonalRecord(recordId: string, vote: 'confirm' | 'flag' | null) {
  const client = requireSupabase()
  const viewerId = await getViewerId()
  if (!viewerId) throw new Error('Sign in before confirming a PR.')
  const { error: deleteError } = await client
    .from('personal_record_votes')
    .delete()
    .eq('record_id', recordId)
    .eq('voter_id', viewerId)
  if (deleteError) rethrow(deleteError)
  if (!vote) return
  const { error } = await client
    .from('personal_record_votes')
    .insert({ record_id: recordId, voter_id: viewerId, vote })
  if (error) rethrow(error)
}

// Dates on which the viewer confirmed other members' PRs, oldest first.
// Used for the Witness patches.
let confirmedPrDates: string[] = []

export function getConfirmedPrDates() {
  return confirmedPrDates
}

export async function loadConfirmedPrDates() {
  if (!supabase) return confirmedPrDates
  const viewerId = await getViewerId()
  if (!viewerId) return confirmedPrDates
  const { data, error } = await supabase
    .from('personal_record_votes')
    .select('created_at')
    .eq('voter_id', viewerId)
    .eq('vote', 'confirm')
    .order('created_at', { ascending: true })
  if (error) {
    if (isMissingDatabaseFeature(error)) return confirmedPrDates
    throw error
  }
  confirmedPrDates = (data ?? []).map((row) => row.created_at)
  return confirmedPrDates
}
