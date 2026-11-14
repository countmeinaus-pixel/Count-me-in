import type { PatchProgress } from './checkins'
import { supabase } from './supabase'

// Remembers which patches you have already been shown, so "New patch unlocked"
// appears only once per patch. Saved in Supabase (table seen_patches: same on
// every device), with a copy on this device for speed and as a fallback.
export const newPatchesEvent = 'count-me-in-new-patches'
const storageKey = (userId: string) => `count-me-in-seen-patches-v2:${userId}`

function readLocal(userId: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeLocal(userId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]))
  } catch {
    // Storage full or private mode: the database copy still counts.
  }
}

// null = the table does not exist yet (SQL not run) or could not be read.
async function readServer(userId: string): Promise<Set<string> | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('seen_patches').select('patch_id').eq('user_id', userId)
  if (error) return null
  return new Set((data ?? []).map((row) => row.patch_id as string))
}

async function saveServer(userId: string, ids: string[]) {
  if (!supabase || !ids.length) return
  await supabase
    .from('seen_patches')
    .upsert(ids.map((patch_id) => ({ user_id: userId, patch_id })), { onConflict: 'user_id,patch_id', ignoreDuplicates: true })
}

// One check at a time, so two screens loading at once never show a patch twice.
let queue: Promise<void> = Promise.resolve()

// Call with fresh patch progress. The very first time for an account it only
// remembers what you already have; after that each newly earned patch is
// announced once, ever.
export function announceNewPatches(_userName: string, patches: PatchProgress[]) {
  queue = queue.then(() => check(patches)).catch(() => undefined)
}

async function check(patches: PatchProgress[]) {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return

  const earned = patches.filter((patch) => patch.earned)
  const local = readLocal(userId)
  const server = await readServer(userId)
  const seen = new Set([...(local ?? []), ...(server ?? [])])
  const firstTime = !local && (server === null || server.size === 0)

  if (firstTime) {
    const ids = earned.map((patch) => patch.id)
    writeLocal(userId, new Set(ids))
    await saveServer(userId, ids)
    return
  }

  const fresh = earned.filter((patch) => !seen.has(patch.id))
  // Keep both copies complete (e.g. a device that saw patches before the table existed).
  const missingOnServer = server ? [...seen].filter((id) => !server.has(id)) : []
  fresh.forEach((patch) => seen.add(patch.id))
  writeLocal(userId, seen)
  await saveServer(userId, [...missingOnServer, ...fresh.map((patch) => patch.id)])

  if (fresh.length) {
    window.dispatchEvent(new CustomEvent<PatchProgress[]>(newPatchesEvent, { detail: fresh }))
  }
}
