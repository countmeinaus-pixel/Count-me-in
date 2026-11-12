import { sports } from '../data/sports'
import { supabase } from './supabase'

// Makes sure every sport from data/sports.ts exists in the Supabase "sports"
// table, so a sport added in code shows up on Edit my sports, Create activity
// and onboarding without anyone running SQL. Signed-in members may insert
// sports (policy "Sports are insertable by authenticated users").
// Runs at most once per app session; errors are ignored (the screen then
// simply shows what the table already has).
let syncPromise: Promise<void> | null = null

export function ensureSportsInDatabase() {
  if (!supabase) return Promise.resolve()
  syncPromise ??= (async () => {
    const client = supabase!
    const { data: session } = await client.auth.getSession()
    if (!session.session) return
    const { data, error } = await client.from('sports').select('name')
    if (error) return
    const existing = new Set((data ?? []).map((row: { name: string }) => row.name))
    const missing = sports.filter((sport) => !existing.has(sport.name)).map((sport) => ({ name: sport.name, icon: sport.icon }))
    if (missing.length === 0) return
    await client.from('sports').upsert(missing, { onConflict: 'name', ignoreDuplicates: true })
  })().catch(() => undefined)
  return syncPromise
}
