import type { CSSProperties } from 'react'

// Grey placeholder shapes with a soft shimmer, shown while real content loads,
// instead of flashing demo content first.

export function Skeleton({
  width,
  height = 14,
  radius,
  className = '',
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}) {
  const style: CSSProperties = { width, height, borderRadius: radius }
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />
}

// Same shape as an ActivityCard.
export function ActivityCardSkeleton() {
  return (
    <div className="activity-card skeleton-card" aria-hidden="true">
      <div className="skeleton-row">
        <Skeleton width={96} height={12} />
        <Skeleton width={80} height={12} />
      </div>
      <Skeleton width="80%" height={20} />
      <Skeleton width="55%" />
      <Skeleton width="65%" />
      <div className="skeleton-row">
        <div className="skeleton-row tight">
          <Skeleton width={28} height={28} radius="50%" />
          <Skeleton width={28} height={28} radius="50%" />
        </div>
        <Skeleton width={90} height={22} radius={6} />
      </div>
    </div>
  )
}

// A screen-sized loading state for a profile page.
export function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" aria-hidden="true">
      <Skeleton width={96} height={96} radius="50%" />
      <Skeleton width={180} height={26} />
      <Skeleton width={120} />
      <div className="profile-skeleton-stats">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="profile-skeleton-stat">
            <Skeleton width={32} height={24} />
            <Skeleton width={56} height={10} />
          </div>
        ))}
      </div>
      <Skeleton width="100%" height={120} radius={12} />
      <Skeleton width="100%" height={160} radius={12} />
    </div>
  )
}
