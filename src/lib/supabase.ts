import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://kpeequbmwlkcgmyloeyi.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZWVxdWJtd2xrY2dteWxvZXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5OTMxNzksImV4cCI6MjEwODU2OTE3OX0.mIG0YwOZS_DMpOmyZCW9n8_pkeuhHMwYfn-5gC_DAIM'

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function getSupabaseSetupHint() {
  if (hasSupabaseConfig) return 'Supabase is configured.'

  return 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local or Vercel.'
}
