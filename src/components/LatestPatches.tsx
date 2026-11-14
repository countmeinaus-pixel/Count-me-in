import { Check, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatchProgressForUser, loadSavedMeetupsForUser, type PatchProgress } from '../lib/checkins'
import { PatchIcon } from './PatchIcon'

const SLOTS = 8

function formatEarned(date: string | null) {
  return date ? new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''
}

// Home: a sideways slider with the last 8 patches you earned (newest first).
// Free spots are filled with the patches you are closest to earning.
export function LatestPatches({ userName }: { userName: string | null }) {
  const navigate = useNavigate()
  const [patches, setPatches] = useState<PatchProgress[]>([])

  useEffect(() => {
    if (!userName) return
    let active = true
    loadSavedMeetupsForUser(userName)
      .catch(() => userName) // show what we already know
      .then((name) => {
        if (!active) return
        const all = getPatchProgressForUser(name ?? userName)
        const earned = all
          .filter((patch) => patch.earned)
          .sort((left, right) => (right.earnedAt ?? '').localeCompare(left.earnedAt ?? ''))
          .slice(0, SLOTS)
        const closest = all
          .filter((patch) => !patch.earned)
          .sort((left, right) =>
            right.progress / right.target - left.progress / left.target
            || (left.target - left.progress) - (right.target - right.progress))
          .slice(0, SLOTS - earned.length)
        setPatches([...earned, ...closest])
      })
    return () => { active = false }
  }, [userName])

  if (!patches.length) return null

  return (
    <section className="latest-patches" aria-labelledby="latest-patches-heading">
      <div className="crew-preview-heading">
        <div>
          <p className="eyebrow">Your trophy shelf</p>
          <h2 id="latest-patches-heading">Latest patches</h2>
        </div>
        <button type="button" className="text-action" onClick={() => navigate('/profile/patches')}>View all</button>
      </div>
      <div className="latest-patches-track">
        {patches.map((patch) => (
          <button
            key={patch.id}
            type="button"
            className={`all-patch-card latest-patch-card ${patch.earned ? 'earned' : 'locked'}`}
            onClick={() => navigate('/profile/patches')}
            aria-label={patch.earned
              ? `${patch.name}, earned ${formatEarned(patch.earnedAt)}`
              : `${patch.name}, ${patch.progress} of ${patch.target} ${patch.progressLabel}`}
          >
            <span className="all-patch-icon">
              <PatchIcon name={patch.icon} />
              {patch.earned
                ? <span className="patch-earned-mark"><Check aria-hidden="true" /></span>
                : <LockKeyhole className="patch-lock-mark" aria-hidden="true" />}
            </span>
            <strong>{patch.name}</strong>
            <small>{patch.rule}</small>
            {patch.earned ? (
              patch.earnedAt && <span className="patch-earned-date">Earned {formatEarned(patch.earnedAt)}</span>
            ) : (
              <span className="patch-progress">
                <span className="patch-progress-track" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (patch.progress / patch.target) * 100)}%` }} />
                </span>
                <small>{patch.progress} of {patch.target} {patch.progressLabel}</small>
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
