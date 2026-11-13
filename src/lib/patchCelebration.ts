import type { PatchProgress } from './checkins'

// Remembers which patches you have already seen per account (on this device),
// so a newly earned patch can be celebrated once.
const storageKey = (user: string) => `count-me-in-seen-patches-v1:${user}`
export const newPatchesEvent = 'count-me-in-new-patches'

function readSeen(user: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(storageKey(user))
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(user: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(storageKey(user), JSON.stringify([...ids]))
  } catch {
    // Private mode or storage full: no celebration, nothing breaks.
  }
}

// Call with fresh patch progress. The very first time on a device it only
// remembers what you have (no flood of old patches); after that, every patch
// that is newly earned is announced once.
export function announceNewPatches(user: string, patches: PatchProgress[]) {
  const earned = patches.filter((patch) => patch.earned)
  const seen = readSeen(user)
  if (!seen) {
    writeSeen(user, new Set(earned.map((patch) => patch.id)))
    return
  }
  const fresh = earned.filter((patch) => !seen.has(patch.id))
  if (!fresh.length) return
  fresh.forEach((patch) => seen.add(patch.id))
  writeSeen(user, seen)
  window.dispatchEvent(new CustomEvent<PatchProgress[]>(newPatchesEvent, { detail: fresh }))
}
