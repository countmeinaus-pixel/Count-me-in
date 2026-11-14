import { Check } from 'lucide-react'
import type { ChallengeProgress } from '../lib/challenges'
import { Button } from './Button'
import { PatchIcon } from './PatchIcon'
import { PatchProgressBar } from './PatchProgressBar'

function formatWhen(challenge: ChallengeProgress) {
  const now = Date.now()
  if (challenge.startsAt.getTime() > now) {
    return `Starts ${challenge.startsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
  }
  const days = Math.ceil((challenge.endsAt.getTime() - now) / 86400000)
  return days <= 1 ? 'Ends today' : `${days} days left`
}

// One challenge: used on the Patches page and in the Home slider.
export function ChallengeCard({
  challenge,
  busyId,
  onToggle,
  className = '',
}: {
  challenge: ChallengeProgress
  busyId: string | null
  onToggle: (challenge: ChallengeProgress) => void
  className?: string
}) {
  return (
    <article className={`challenge-card ${challenge.joined ? 'joined' : ''} ${className}`.trim()}>
      <span className={`all-patch-icon ${challenge.completed ? '' : 'challenge-icon'}`}>
        <PatchIcon name={challenge.icon} />
        {challenge.completed && <span className="patch-earned-mark"><Check aria-hidden="true" /></span>}
      </span>
      <div className="challenge-body">
        <div className="challenge-title-row">
          <strong>{challenge.name}</strong>
          <span className="challenge-time-left">{formatWhen(challenge)}</span>
        </div>
        <small>{challenge.rule}</small>
        {challenge.completed ? (
          <span className="patch-earned-date">Completed. Patch earned!</span>
        ) : challenge.joined ? (
          <>
            <PatchProgressBar patch={challenge} />
            <button
              type="button"
              className="challenge-leave"
              onClick={() => onToggle(challenge)}
              disabled={busyId !== null}
            >
              Leave challenge
            </button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => onToggle(challenge)}
            disabled={busyId !== null}
          >
            {busyId === challenge.id ? 'Joining…' : 'Join challenge'}
          </Button>
        )}
      </div>
    </article>
  )
}
