import { MapPin, ShieldCheck } from 'lucide-react'
import type { CommunityMember } from '../data/mockData'
import { Avatar } from './Avatar'

export function MateCard({
  member,
  onClick,
  horizontal = false,
}: {
  member: CommunityMember
  onClick: () => void
  horizontal?: boolean // photo on the left, name and suburb next to it
}) {
  return (
    <button type="button" className={`mate-card ${horizontal ? 'horizontal' : ''}`} onClick={onClick} aria-label={`View ${member.name}'s profile`}>
      <span className="mate-card-top">
        <Avatar name={member.name} photoUrl={member.photoUrl} size={48} className="mate-card-avatar" />
        <span className="mate-card-identity">
          <span className="mate-card-name">
            {member.name}, {member.age}
            {member.verified && <ShieldCheck aria-label="Verified" />}
          </span>
          <span className="mate-card-location"><MapPin aria-hidden="true" />{member.suburb}</span>
        </span>
      </span>
      <span className="mate-card-sports">
        {member.sports.slice(0, 2).map((sport) => <span className="mate-sport" key={sport.name}>{sport.name}</span>)}
        {member.sports.length > 2 && <span className="mate-sport-more">+{member.sports.length - 2}</span>}
      </span>
      {/* Always at the bottom of the card, so stats line up across a row. */}
      <span className="mate-card-stats">
        <span><strong>{member.stats.meetups}</strong><small>meetups</small></span>
        <span><strong>{member.stats.hosted}</strong><small>hosted</small></span>
        <span><strong>{member.stats.sports}</strong><small>sports</small></span>
      </span>
    </button>
  )
}