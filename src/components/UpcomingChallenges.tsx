import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUpcomingChallenges, type Challenge } from '../data/challenges'
import { getJoinedChallengeIds, joinChallenge } from '../lib/challenges'
import { Button } from './Button'
import { PatchIcon } from './PatchIcon'

function formatWhen(challenge: Challenge) {
  const now = Date.now()
  if (challenge.startsAt.getTime() > now) {
    return `Starts ${challenge.startsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
  }
  const days = Math.ceil((challenge.endsAt.getTime() - now) / 86400000)
  return days <= 1 ? 'Ends today' : `${days} days left`
}

// Home: a sideways slider with 8 challenges you can still join (running now
// or starting soon). Challenges you already joined are left out.
export function UpcomingChallenges() {
  const navigate = useNavigate()
  const [joinedIds, setJoinedIds] = useState<string[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getJoinedChallengeIds()
      .then((ids) => { if (active) setJoinedIds(ids) })
      .catch(() => { if (active) setJoinedIds([]) })
    return () => { active = false }
  }, [])

  if (!joinedIds) return null
  const challenges = getUpcomingChallenges(new Date(), 8 + joinedIds.length)
    .filter((challenge) => !joinedIds.includes(challenge.id))
    .slice(0, 8)
  if (!challenges.length) return null

  async function join(challenge: Challenge) {
    setBusyId(challenge.id)
    setError('')
    try {
      await joinChallenge(challenge.id)
      setJoinedIds((ids) => [...(ids ?? []), challenge.id])
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Unable to join this challenge.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="latest-patches" aria-labelledby="upcoming-challenges-heading">
      <div className="crew-preview-heading">
        <div>
          <p className="eyebrow">Earn a limited patch</p>
          <h2 id="upcoming-challenges-heading">Upcoming challenges</h2>
        </div>
        <button type="button" className="text-action" onClick={() => navigate('/profile/patches')}>View all</button>
      </div>
      {error && <p className="edit-form-error" role="alert">{error}</p>}
      <div className="latest-patches-track">
        {challenges.map((challenge) => (
          <article key={challenge.id} className="all-patch-card upcoming-challenge-card">
            <span className="all-patch-icon challenge-icon">
              <PatchIcon name={challenge.icon} />
            </span>
            <span className="challenge-time-left">{formatWhen(challenge)}</span>
            <strong>{challenge.name}</strong>
            <small>{challenge.rule}</small>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="upcoming-challenge-join"
              onClick={() => void join(challenge)}
              disabled={busyId !== null}
            >
              {busyId === challenge.id ? 'Joining…' : 'Join challenge'}
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}
