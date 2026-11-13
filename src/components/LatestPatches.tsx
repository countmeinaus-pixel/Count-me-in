import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatchProgressForUser, loadSavedMeetupsForUser, type PatchProgress } from '../lib/checkins'
import { PatchIcon } from './PatchIcon'

function formatEarned(date: string | null) {
  return date ? new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''
}

// Home: a sideways slider with the last 8 patches you earned (newest first).
// Hidden until you have earned one.
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
        const earned = getPatchProgressForUser(name ?? userName)
          .filter((patch) => patch.earned)
          .sort((left, right) => (right.earnedAt ?? '').localeCompare(left.earnedAt ?? ''))
          .slice(0, 8)
        setPatches(earned)
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
            className="all-patch-card earned latest-patch-card"
            onClick={() => navigate('/profile/patches')}
            aria-label={`${patch.name}, earned ${formatEarned(patch.earnedAt)}`}
          >
            <span className="all-patch-icon">
              <PatchIcon name={patch.icon} />
              <span className="patch-earned-mark"><Check aria-hidden="true" /></span>
            </span>
            <strong>{patch.name}</strong>
            <small>{patch.rule}</small>
            {patch.earnedAt && <span className="patch-earned-date">Earned {formatEarned(patch.earnedAt)}</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
