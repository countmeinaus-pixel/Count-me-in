import { MapPin } from 'lucide-react'
import type { CommunityMember } from '../data/mockData'
import { waterSportNames } from '../data/sports'
import { SportIcon } from './SportIcon'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

// Profile card: square photo top left with name, age and suburb next to it,
// the sports underneath, and the stats at the bottom (lined up across a row).
export function MateCard({
  member,
  onClick,
}: {
  member: CommunityMember
  onClick: () => void
  horizontal?: boolean // older prop, the layout is the same everywhere now
}) {
  const firstSport = member.sports[0]?.name
  const isWater = firstSport ? waterSportNames.includes(firstSport) : false

  return (
    <button type="button" className="mate-card" onClick={onClick} aria-label={`View ${member.name}'s profile`}>
      <span className="mate-card-head">
        <span className={`mate-card-photo ${isWater ? 'tint-water' : ''}`}>
          {member.photoUrl
            ? <img src={member.photoUrl} alt="" loading="lazy" />
            : <span className="mate-card-initials">{initials(member.name)}</span>}
          {firstSport && <SportIcon sport={firstSport} className="mate-card-sport-icon" />}
        </span>
        <span className="mate-card-identity">
          <span className="mate-card-name">
            {member.name}, {member.age}
          </span>
          <span className="mate-card-location"><MapPin aria-hidden="true" />{member.suburb}</span>
        </span>
      </span>
      <span className="mate-card-sports">
        {member.sports.slice(0, 3).map((sport) => <span className="mate-sport" key={sport.name}>{sport.name}</span>)}
        {member.sports.length > 3 && <span className="mate-sport-more">+{member.sports.length - 3}</span>}
      </span>
      <span className="mate-card-stats">
        <span><strong>{member.stats.meetups}</strong><small>meetups</small></span>
        <span><strong>{member.stats.hosted}</strong><small>hosted</small></span>
        <span><strong>{member.stats.sports}</strong><small>sports</small></span>
      </span>
    </button>
  )
}
