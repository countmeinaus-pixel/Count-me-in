import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// The same sports as on Edit my sports (the sports table in Supabase).
// Until it loads, or when offline, the built-in list is used.
export const builtInSports = [
  'Running', 'Hiking', 'Spearfishing', 'Kitesurfing', 'Surfing', 'Swimming', 'Gym',
  'Mountain biking', 'Road cycling', 'SUP / kayak', 'Scuba diving', 'Climbing / bouldering',
]

let cachedCatalog: string[] | null = null

export function useSportCatalog() {
  const [sports, setSports] = useState<string[]>(() => cachedCatalog ?? builtInSports)
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.from('sports').select('name').order('name')
      .then(({ data, error }) => {
        if (error || !data?.length) return
        cachedCatalog = data.map((row: { name: string }) => row.name)
        if (active) setSports(cachedCatalog)
      })
    return () => {
      active = false
    }
  }, [])
  return sports
}
