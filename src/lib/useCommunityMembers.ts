import { useEffect, useState } from 'react'
import { communityMembers, type CommunityMember } from '../data/mockData'
import { getCommunityProfiles } from './profile'

// Real profiles first, demo members after so the lists are never empty while testing.
export function useCommunityMembers() {
  const [members, setMembers] = useState<CommunityMember[]>(communityMembers)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCommunityProfiles()
      .then((profiles) => {
        if (active) setMembers([...profiles, ...communityMembers])
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load community profiles.')
      })
    return () => {
      active = false
    }
  }, [])

  return { members, error }
}
