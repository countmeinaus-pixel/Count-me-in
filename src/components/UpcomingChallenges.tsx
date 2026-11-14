import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUpcomingChallenges } from '../data/challenges'
import { loadSavedMeetupsForUser } from '../lib/checkins'
import {
  getChallengeProgress,
  getJoinedChallengeIds,
  joinChallenge,
  leaveChallenge,
  type ChallengeProgress,
} from '../lib/challenges'
import { ChallengeCard } from './ChallengeCard'

const SLOTS = 8

// Home: a sideways slider with 8 challenges that are running now or start
// soon. The ones you joined come first (with your progress), then the rest.
export function UpcomingChallenges({ userName }: { userName: string | null }) {
  const navigate = useNavigate()
  const [joinedIds, setJoinedIds] = useState<string[] | null>(null)
  const [, setMeetupsVersion] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getJoinedChallengeIds()
      .then((ids) => { if (active) setJoinedIds(ids) })
      .catch(() => { if (active) setJoinedIds([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!userName) return
    let active = true
    loadSavedMeetupsForUser(userName)
      .catch(() => undefined)
      .then(() => { if (active) setMeetupsVersion((version) => version + 1) })
    return () => { active = false }
  }, [userName])

  if (!joinedIds || !userName) return null

  // Enough candidates so 8 are left even if many are joined.
  const upcoming = getUpcomingChallenges(new Date(), 20).map((challenge) =>
    getChallengeProgress(challenge, userName, joinedIds.includes(challenge.id)),
  )
  const challenges = [
    ...upcoming.filter((challenge) => challenge.joined),
    ...upcoming.filter((challenge) => !challenge.joined),
  ].slice(0, SLOTS)
  if (!challenges.length) return null

  async function toggle(challenge: ChallengeProgress) {
    setBusyId(challenge.id)
    setError('')
    try {
      if (challenge.joined) {
        await leaveChallenge(challenge.id)
        setJoinedIds((ids) => (ids ?? []).filter((id) => id !== challenge.id))
      } else {
        await joinChallenge(challenge.id)
        setJoinedIds((ids) => [...(ids ?? []), challenge.id])
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update this challenge.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="latest-patches" aria-labelledby="upcoming-challenges-heading">
      <div className="crew-preview-heading">
        <div>
          <p className="eyebrow">Earn a limited patch</p>
          <h2 id="upcoming-challenges-heading">Challenges</h2>
        </div>
        <button type="button" className="text-action" onClick={() => navigate('/profile/patches')}>View all</button>
      </div>
      {error && <p className="edit-form-error" role="alert">{error}</p>}
      <div className="latest-patches-track upcoming-challenges-track">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            busyId={busyId}
            onToggle={(item) => void toggle(item)}
            className="upcoming-challenge-card"
          />
        ))}
      </div>
    </section>
  )
}
