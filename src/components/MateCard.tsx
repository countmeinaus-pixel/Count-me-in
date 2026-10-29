import { MapPin, ShieldCheck, Users } from 'lucide-react'
import type { CommunityMember } from '../data/mockData'

export function MateCard({ member, onClick }: { member: CommunityMember; onClick: () => void }) {
  return (
    <button type="button" className="mate-card" onClick={onClick} aria-label={`View ${member.name}'s profile`}>
      <span className="mate-card-avatar" aria-hidden="true">{member.name[0]}</span>
      <span className="mate-card-name">
        {member.name}, {member.age}
        {member.verified && <ShieldCheck aria-label="Verified" />}
      </span>
      <span className="mate-card-location"><MapPin aria-hidden="true" />{member.suburb}</span>
      <span className="mate-card-sports">
        {member.sports.slice(0, 2).map((sport) => <span className="mate-sport" key={sport.name}>{sport.name}</span>)}
        {member.sports.length > 2 && <span className="mate-sport-more">+{member.sports.length - 2}</span>}
      </span>
      <span className="mate-card-meta"><Users aria-hidden="true" />{member.stats.meetups} meetups</span>
    </button>
  )
}