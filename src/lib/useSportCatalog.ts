import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { sportNames } from '../data/sports'

// The same sports as on Edit my sports (the sports table in Supabase) plus data/sports.ts.
// Until it loads, or when offline, the list from data/sports.ts is used.
export const builtInSports: string[] = sportNames

let cachedCatalog: string[] | null = null

export function useSportCatalog() {
  const [sports, setSports] = useState<string[]>(() => cachedCatalog ?? builtInSports)
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.from('sports').select('name').order('name')
      .then(({ data, error }) => {
        if (error || !data?.length) return
        // Database sports plus any sport added in code but not synced yet.
        cachedCatalog = [...new Set([...data.map((row: { name: string }) => row.name), ...sportNames])]
        if (active) setSports(cachedCatalog)
      })
    return () => {
      active = false
    }
  }, [])
  return sports
}
