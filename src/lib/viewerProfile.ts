import { useEffect, useState } from 'react'
import { getCurrentProfile, type CurrentProfile } from './profile'
import { supabase } from './supabase'

// The signed-in member's own profile, loaded once and shared by every screen.
// Screens used to start with the demo user and swap in the real profile a moment
// later, which made content flash when moving between pages.

export type ViewerProfileState =
  | { status: 'loading' }
  // profile is null when nobody is signed in (the demo user is shown then).
  | { status: 'ready'; profile: CurrentProfile | null; error: string }

let state: ViewerProfileState = { status: 'loading' }
let pending: Promise<void> | null = null
const listeners = new Set<() => void>()

function setState(next: ViewerProfileState) {
  state = next
  listeners.forEach((listener) => listener())
}

async function load() {
  try {
    if (!supabase) {
      setState({ status: 'ready', profile: null, error: '' })
      return
    }
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setState({ status: 'ready', profile: null, error: '' })
      return
    }
    const profile = await getCurrentProfile(data.session.user.id)
    setState({ status: 'ready', profile, error: '' })
  } catch (error) {
    // Keep what we had; screens can show the error.
    setState({
      status: 'ready',
      profile: state.status === 'ready' ? state.profile : null,
      error: error instanceof Error ? error.message : 'Unable to load your profile.',
    })
  } finally {
    pending = null
  }
}

// Reload after the profile changed (edit profile, sports). Screens keep showing
// the current profile until the new one arrives.
export function refreshViewerProfile() {
  pending ??= load()
  return pending
}

export function getViewerProfileState() {
  return state
}

export function useViewerProfile() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const listener = () => setVersion((version) => version + 1)
    listeners.add(listener)
    if (state.status === 'loading') void refreshViewerProfile()
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return state
}

supabase?.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') setState({ status: 'ready', profile: null, error: '' })
  if (event === 'SIGNED_IN' || event === 'USER_UPDATED') void refreshViewerProfile()
})
