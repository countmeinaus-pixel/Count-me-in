import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

export type AvatarSize = 24 | 28 | 32 | 36 | 48 | 56 | 96

type Props = {
  name: string
  photoUrl?: string | null
  size?: AvatarSize
  verified?: boolean
  className?: string
  label?: string
}

export function Avatar({ name, photoUrl, size = 32, verified = false, className = '', label }: Props) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [photoUrl])
  const showPhoto = Boolean(photoUrl) && !failed

  return (
    <span
      className={`user-avatar user-avatar-${size} ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {showPhoto
        ? <img src={photoUrl ?? undefined} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <span className="user-avatar-initial">{name.trim()[0]?.toUpperCase() ?? '?'}</span>}
      {verified && <i className="user-avatar-verified"><Check /></i>}
    </span>
  )
}
