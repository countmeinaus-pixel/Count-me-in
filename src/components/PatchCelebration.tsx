import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PatchProgress } from '../lib/checkins'
import { newPatchesEvent } from '../lib/patchCelebration'
import { PatchIcon } from './PatchIcon'

// Full-screen "Patch unlocked" moment: the patch pops in with a glow and
// sparks, with its name and why you earned it. Several new patches are
// shown one after the other.
export function PatchCelebration() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<PatchProgress[]>([])

  useEffect(() => {
    function onNewPatches(event: Event) {
      const patches = (event as CustomEvent<PatchProgress[]>).detail ?? []
      setQueue((current) => [...current, ...patches.filter((patch) => !current.some((item) => item.id === patch.id))])
    }
    window.addEventListener(newPatchesEvent, onNewPatches)
    return () => window.removeEventListener(newPatchesEvent, onNewPatches)
  }, [])

  const patch = queue[0]
  useEffect(() => {
    if (!patch) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setQueue((current) => current.slice(1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [patch])

  if (!patch) return null
  const remaining = queue.length - 1

  function next() {
    setQueue((current) => current.slice(1))
  }

  return (
    <div className="patch-celebration" role="dialog" aria-modal="true" aria-labelledby="patch-celebration-title">
      <div className="patch-celebration-card" key={patch.id}>
        <div className="patch-celebration-badge" aria-hidden="true">
          <span className="patch-celebration-ring" />
          <span className="patch-celebration-ring delay" />
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="patch-celebration-spark" style={{ ['--spark' as string]: index }} />
          ))}
          <span className="patch-celebration-icon"><PatchIcon name={patch.icon} /></span>
        </div>
        <p className="eyebrow">New patch unlocked</p>
        <h2 id="patch-celebration-title">{patch.name}</h2>
        <p className="patch-celebration-description">{patch.description}</p>
        <p className="patch-celebration-rule"><strong>Why you got it:</strong> {patch.rule}</p>
        <div className="patch-celebration-actions">
          <button type="button" className="button button-primary button-lg" onClick={next}>
            {remaining > 0 ? `Next patch (${remaining} more)` : 'Nice one!'}
          </button>
          <button
            type="button"
            className="button button-secondary button-lg"
            onClick={() => { setQueue([]); navigate('/profile/patches') }}
          >
            See my patches
          </button>
        </div>
      </div>
    </div>
  )
}
