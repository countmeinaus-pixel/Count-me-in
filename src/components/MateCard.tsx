import { MapPin } from 'lucide-react'
import type { CommunityMember } from '../data/mockData'
import { waterSportNames } from '../data/sports'
import { SportIcon } from './SportIcon'
import { FitChips } from './FitChips'
import { formatDistanceShort, useDistanceFromMe } from '../lib/useDistanceFromMe'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

// Profile card: square photo top left with name, age, suburb and sports next to
// it, and the stats at the bottom (lined up across a row).
export function MateCard({
  member,
  onClick,
  note,
  noteHighlighted = false,
  className = '',
}: {
  member: CommunityMember
  onClick: () => void
  horizontal?: boolean // older prop, the layout is the same everywhere now
  note?: string // extra line under the location, e.g. their next plan on Home
  noteHighlighted?: boolean
  className?: string
}) {
  const distanceFromMe = useDistanceFromMe()
  const distance = formatDistanceShort(distanceFromMe(member))
  const firstSport = member.sports[0]?.name
  const isWater = firstSport ? waterSportNames.includes(firstSport) : false

  return (
    <button type="button" className={`mate-card ${className}`.trim()} onClick={onClick} aria-label={`View ${member.name}'s profile${note ? `, ${note}` : ''}`}>
      <span className="mate-card-head">
        <span className={`mate-card-photo ${isWater ? 'tint-water' : ''}`}>
          {member.photoUrl
            ? <img src={member.photoUrl} alt="" loading="lazy" />
            : <span className="mate-card-initials">{initials(member.name)}</span>}
          {firstSport && <SportIcon sport={firstSport} className="mate-card-sport-icon" />}
          {distance && <span className="mate-card-distance">{distance}<span className="mate-card-distance-suffix"> away</span></span>}
        </span>
        <span className="mate-card-identity">
          <span className="mate-card-name">
            {member.name}, {member.age}
          </span>
          <span className="mate-card-location"><MapPin aria-hidden="true" />{member.suburb}</span>
          {note && (
            <span className={`mate-card-note ${noteHighlighted ? 'has-plan' : ''}`}>
              {noteHighlighted && <span className="friend-tile-dot" aria-hidden="true" />}
              {note}
            </span>
          )}
          <FitChips className="mate-card-sports" items={member.sports.map((sport) => sport.name)} />
        </span>
      </span>
      <span className="mate-card-stats">
        <span><strong>{member.stats.meetups}</strong><small>meetups</small></span>
        <span><strong>{member.stats.hosted}</strong><small>hosted</small></span>
        <span><strong>{member.stats.sports}</strong><small>sports</small></span>
      </span>
    </button>
  )
}
