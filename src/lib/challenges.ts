import { getChallengeById, type Challenge } from '../data/challenges'
import { getConfirmedMeetupsForUser, getPatchMetricProgress } from './checkins'
import { databaseUpdateNeededMessage, isMissingDatabaseFeature } from './notifications'
import { supabase } from './supabase'

const demoStorageKey = 'count-me-in-joined-challenges-v1'

export type ChallengeProgress = Challenge & {
  joined: boolean
  progress: number
  completed: boolean
  completedAt: string | null
}

function readDemoJoined(): string[] {
  try {
    const value = window.localStorage.getItem(demoStorageKey)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeDemoJoined(ids: string[]) {
  try {
    window.localStorage.setItem(demoStorageKey, JSON.stringify([...new Set(ids)]))
  } catch {
    throw new Error('Your challenge could not be saved in this browser.')
  }
}

async function getSignedInUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// Signed in: challenges are saved in Supabase. Demo mode: in this browser.
export async function getJoinedChallengeIds(): Promise<string[]> {
  const userId = await getSignedInUserId()
  if (!supabase || !userId) return readDemoJoined()
  const { data, error } = await supabase
    .from('challenge_enrollments')
    .select('challenge_id')
    .eq('user_id', userId)
  if (error) {
    if (isMissingDatabaseFeature(error)) return []
    throw error
  }
  return (data ?? []).map((row) => row.challenge_id)
}

export async function joinChallenge(challengeId: string) {
  const userId = await getSignedInUserId()
  if (!supabase || !userId) {
    writeDemoJoined([...readDemoJoined(), challengeId])
    return
  }
  const { error } = await supabase
    .from('challenge_enrollments')
    .insert({ user_id: userId, challenge_id: challengeId })
  if (error && error.code !== '23505') {
    if (isMissingDatabaseFeature(error)) throw new Error(databaseUpdateNeededMessage)
    throw error
  }
}

export async function leaveChallenge(challengeId: string) {
  const userId = await getSignedInUserId()
  if (!supabase || !userId) {
    writeDemoJoined(readDemoJoined().filter((id) => id !== challengeId))
    return
  }
  const { error } = await supabase
    .from('challenge_enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
  if (error) {
    if (isMissingDatabaseFeature(error)) throw new Error(databaseUpdateNeededMessage)
    throw error
  }
}

export function getChallengeProgress(challenge: Challenge, userName: string, joined: boolean): ChallengeProgress {
  const entries = getConfirmedMeetupsForUser(userName)
    .filter((entry) => {
      const startsAt = new Date(entry.startsAt).getTime()
      return startsAt >= challenge.startsAt.getTime() && startsAt < challenge.endsAt.getTime()
    })
    .sort((left, right) => left.confirmedAt.localeCompare(right.confirmedAt))
  const { progress, qualifyingEntries } = getPatchMetricProgress(challenge.metric, entries)
  const completed = joined && progress >= challenge.target
  return {
    ...challenge,
    joined,
    progress: Math.min(progress, challenge.target),
    completed,
    completedAt: completed ? qualifyingEntries[challenge.target - 1]?.confirmedAt ?? null : null,
  }
}

// Challenge patches you earned, from any period. Missed ones are not shown.
export function getEarnedChallenges(joinedIds: string[], userName: string): ChallengeProgress[] {
  return joinedIds.flatMap((id) => {
    const challenge = getChallengeById(id)
    if (!challenge) return []
    const progress = getChallengeProgress(challenge, userName, true)
    return progress.completed ? [progress] : []
  })
}
