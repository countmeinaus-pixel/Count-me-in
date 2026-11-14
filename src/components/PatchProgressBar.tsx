import type { PatchProgress } from '../lib/checkins'

export function PatchProgressBar({ patch }: { patch: Pick<PatchProgress, 'name' | 'progress' | 'target' | 'progressLabel'> }) {
  const progressPercent = Math.min(100, (patch.progress / patch.target) * 100)

  return (
    <div className="patch-progress">
      <div
        className="patch-progress-track"
        role="progressbar"
        aria-label={`${patch.name} progress`}
        aria-valuemin={0}
        aria-valuemax={patch.target}
        aria-valuenow={patch.progress}
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <small>{patch.progress} of {patch.target} {patch.progressLabel}</small>
    </div>
  )
}
