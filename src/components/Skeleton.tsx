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
    <div className="activity-card has-image skeleton-card" aria-hidden="true">
      <div className="card-media">
        <Skeleton width="100%" height="100%" radius={0} />
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

// Same shape as a MateCard: avatar, name, suburb, sport chips and stats.
export function MateCardSkeleton() {
  return (
    <div className="mate-card skeleton-card" aria-hidden="true">
      <Skeleton width={48} height={48} radius="50%" />
      <Skeleton width="70%" height={18} />
      <Skeleton width="50%" height={12} />
      <div className="skeleton-row tight">
        <Skeleton width={64} height={22} radius={999} />
        <Skeleton width={56} height={22} radius={999} />
      </div>
      <Skeleton width="100%" height={44} radius={10} />
    </div>
  )
}
