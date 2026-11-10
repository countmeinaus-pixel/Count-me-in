import type { CommunityMember } from '../data/mockData'

// Demo friends until friendships are stored in the database.
export const friendNames = ['Matt', 'Hamish', 'Sam', 'Luca']

export type CrewSuggestion = {
  member: CommunityMember
  reason: string
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
            : 'New around Adelaide'
      return {
        member,
        reason: nearby && shared.length > 0 ? `${reason} · ${member.suburb}` : reason,
        score: shared.length * 2 + (nearby ? 3 : 0) + Math.random(),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ member, reason }) => ({ member, reason }))
}
