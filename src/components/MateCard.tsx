import { MapPin, ShieldCheck, Users } from 'lucide-react'
import type { CommunityMember } from '../data/mockData'
import { Avatar } from './Avatar'

export function MateCard({ member, onClick }: { member: CommunityMember; onClick: () => void }) {
  return (
    <button type="button" className="mate-card" onClick={onClick} aria-label={`View ${member.name}'s profile`}>
      <Avatar name={member.name} photoUrl={member.photoUrl} size={48} className="mate-card-avatar" />
      <span className="mate-card-name">
        {member.name}, {member.age}
        {member.verified && <ShieldCheck aria-label="Verified" />}
      </span>
      <span className="mate-card-location"><MapPin aria-hidden="true" />{member.suburb}</span>
      <span className="mate-card-sports">
        {member.sports.slice(0, 2).map((sport) => <span className="mate-sport" key={sport.name}>{sport.name}</span>)}
        {member.sports.length > 2 && <span className="mate-sport-more">+{member.sports.length - 2}</span>}
      </span>
      <span className="mate-card-meta">
        <Users aria-hidden="true" />
        {member.stats.meetups} meetups · {member.stats.hosted} hosted · {member.stats.sports} sports
      </span>
    </button>
  )
}