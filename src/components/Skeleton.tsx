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
      <div className="mate-card-head">
        <Skeleton width={88} height={88} radius={12} />
        <div className="mate-card-identity" style={{ flex: 1 }}>
          <Skeleton width="80%" height={18} />
          <Skeleton width="60%" height={12} />
        </div>
      </div>
      <div className="skeleton-row tight">
        <Skeleton width={64} height={22} radius={999} />
        <Skeleton width={56} height={22} radius={999} />
      </div>
      <Skeleton width="100%" height={44} radius={10} />
    </div>
  )
}

// Screen reader text for a loading state (the shapes themselves are hidden).
function LoadingLabel({ label }: { label: string }) {
  return <span className="sr-only">{label}</span>
}

// Rows like a list of chats, notifications or members: round photo and two lines.
export function ListSkeleton({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="list-skeleton" role="status">
      <LoadingLabel label={label} />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="list-skeleton-row" aria-hidden="true">
          <Skeleton width={44} height={44} radius="50%" />
          <div className="list-skeleton-text">
            <Skeleton width={`${60 - (index % 3) * 10}%`} height={16} />
            <Skeleton width={`${80 - (index % 2) * 15}%`} height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Grid of activity cards (My activities, Home).
export function ActivityCardsSkeleton({ count = 3, label = 'Loading activities' }: { count?: number; label?: string }) {
  return (
    <div className="card-list" role="status">
      <LoadingLabel label={label} />
      {Array.from({ length: count }, (_, index) => <ActivityCardSkeleton key={index} />)}
    </div>
  )
}

// A chat: header, a few message bubbles left and right, and the message box.
export function ChatSkeleton({ label = 'Loading chat' }: { label?: string }) {
  return (
    <div className="chat-skeleton" role="status">
      <LoadingLabel label={label} />
      <div className="chat-skeleton-header" aria-hidden="true">
        <Skeleton width={40} height={40} radius={10} />
        <div className="list-skeleton-text">
          <Skeleton width="55%" height={18} />
          <Skeleton width="30%" height={12} />
        </div>
      </div>
      <div className="chat-skeleton-messages" aria-hidden="true">
        <Skeleton width="62%" height={56} radius={14} />
        <Skeleton width="48%" height={44} radius={14} className="mine" />
        <Skeleton width="70%" height={72} radius={14} />
        <Skeleton width="40%" height={44} radius={14} className="mine" />
      </div>
      <Skeleton width="100%" height={52} radius={14} />
    </div>
  )
}

// A form page: title and a few fields.
export function FormSkeleton({ fields = 4, label = 'Loading' }: { fields?: number; label?: string }) {
  return (
    <div className="form-skeleton" role="status">
      <LoadingLabel label={label} />
      <Skeleton width="50%" height={30} />
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="form-skeleton-field" aria-hidden="true">
          <Skeleton width={90} height={12} />
          <Skeleton width="100%" height={48} radius={12} />
        </div>
      ))}
    </div>
  )
}

// Activity details: big photo, title, date and info blocks.
export function DetailSkeleton({ label = 'Loading activity' }: { label?: string }) {
  return (
    <div className="detail-skeleton" role="status">
      <LoadingLabel label={label} />
      <Skeleton width="100%" height={260} radius={0} />
      <div className="detail-skeleton-body" aria-hidden="true">
        <Skeleton width={90} height={12} />
        <Skeleton width="75%" height={30} />
        <Skeleton width="45%" height={14} />
        <Skeleton width="100%" height={110} radius={12} />
        <Skeleton width="100%" height={80} radius={12} />
        <Skeleton width="100%" height={52} radius={14} />
      </div>
    </div>
  )
}
