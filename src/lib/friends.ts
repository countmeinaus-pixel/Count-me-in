import type { CommunityMember } from '../data/mockData'
import { supabase } from './supabase'

// Demo friends until friendships are stored in the database.
export const friendNames = ['Matt', 'Hamish', 'Sam', 'Luca']

export type MetMate = { id: string; first_name: string; suburb: string; photo_url: string | null }

// Friends are the mates you have confirmed a meetup with (QR check-in).
// Each check-in stores a row for both men, so your own rows list everyone you met.
export async function getMetMates(userId: string): Promise<MetMate[]> {
  if (!supabase) return []
  const { data: meetups, error: meetupsError } = await supabase
    .from('activity_meetup_confirmations')
    .select('partner_id')
    .eq('user_id', userId)
  if (meetupsError) throw meetupsError

  const mateIds = [...new Set((meetups ?? []).map((meetup) => meetup.partner_id))]
  if (mateIds.length === 0) return []

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, suburb, photo_url')
    .in('id', mateIds)
    .order('first_name')
  if (profilesError) throw profilesError
  return profiles ?? []
}

export type CrewSuggestion = {
  member: CommunityMember
  reason: string
  shared: string[] // sports you both do
  nearby: boolean // same suburb
}

// Members who are not friends yet, best matches first: shared sports and the
// same suburb score highest. Ties are shuffled so the list feels fresh.
export function getCrewSuggestions(
  members: CommunityMember[],
  viewer: { name: string; sports: string[]; suburb: string },
  excludedNames: string[],
  limit = 8,
): CrewSuggestion[] {
  const seen = new Set<string>()
  return members
    .filter((member) => {
      const key = member.id ?? member.name
      if (seen.has(key)) return false
      seen.add(key)
      return member.name !== viewer.name && !excludedNames.includes(member.name)
    })
    .map((member) => {
      const shared = member.sports
        .map((sport) => sport.name)
        .filter((sport) => viewer.sports.includes(sport))
      const nearby =
        Boolean(viewer.suburb) &&
        member.suburb.toLowerCase() === viewer.suburb.toLowerCase()
      const reason = shared.length > 1
        ? `${shared.length} sports in common`
        : shared.length === 1
          ? `Also into ${shared[0].toLowerCase()}`
          : nearby
            ? `Also in ${member.suburb}`
            : 'New to Count Me In'
      return {
        member,
        reason: nearby && shared.length > 0 ? `${reason} · ${member.suburb}` : reason,
        shared,
        nearby,
        score: shared.length * 2 + (nearby ? 3 : 0) + Math.random(),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ member, reason, shared, nearby }) => ({ member, reason, shared, nearby }))
}
