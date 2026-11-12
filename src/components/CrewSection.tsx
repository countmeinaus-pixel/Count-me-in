import { CalendarDays, Check, MapPin, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { InvitePanel } from './InvitePanel'
import type { ActivityCardData } from './ActivityCard'
import { Avatar } from './Avatar'
import { SportIcon } from './SportIcon'
import type { CommunityMember } from '../data/mockData'
import type { CrewSuggestion } from '../lib/friends'

// "Find your crew" on Home: friends as pills with their next plan, and the
// suggestions as a bento: one top match plus two smaller cards.

const sportVerbs: Record<string, string> = {
  Running: 'run',
  Hiking: 'hike',
  Spearfishing: 'spearfish',
  Freediving: 'freedive',
  Kitesurfing: 'kitesurf',
  Surfing: 'surf',
  Swimming: 'swim',
  Gym: 'lift',
  'Mountain biking': 'ride MTB',
  'Road cycling': 'ride the road',
  'SUP / kayak': 'paddle',
  'Scuba diving': 'dive',
  'Climbing / bouldering': 'climb',
}

function joinWords(words: string[]) {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

const waterSports = ['Spearfishing', 'Freediving', 'Kitesurfing', 'Surfing', 'Swimming', 'SUP / kayak', 'Scuba diving']

function initials(name: string) {
  const letters = name.replace(/[^A-Za-z ]/g, '').trim()
  const parts = letters.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : letters.slice(0, 1)).toUpperCase()
}

// Share the app with a mate, or copy the link when sharing is not available.

function dayLabel(date: Date) {
  return date.toLocaleDateString('en-AU', { weekday: 'short' })
}

// Their next upcoming activity, hosted or joined.
export function nextActivityFor(name: string, activities: ActivityCardData[], now = new Date()) {
  return activities
    .filter((activity) => activity.startsAt >= now && (activity.host === name || activity.attendees.includes(name)))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null
}

type Props = {
  friends: CommunityMember[]
  suggestions: CrewSuggestion[]
  activities: ActivityCardData[]
  onOpenProfile: (member: CommunityMember) => void
  onOpenActivity: (activity: ActivityCardData) => void
}

export function CrewSection({ friends, suggestions, activities, onOpenProfile, onOpenActivity }: Props) {
  // Phones show 1 top match, desktop shows 3 in a row; the tiles below skip
  // whoever is already shown as a top match on that screen size.
  const [top, ...rest] = suggestions
  const tops = suggestions.slice(0, 3)
  const side = rest.slice(0, 9)
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <>
      {inviteOpen && <InvitePanel onClose={() => setInviteOpen(false)} />}
      {(
        <div className="crew-friends">
          <h3>Your friends</h3>
          <div className="friend-tile-row friend-tile-grid">
            {friends.map((member, index) => {
              const next = nextActivityFor(member.name, activities)
              const isToday = next ? next.startsAt.toDateString() === new Date().toDateString() : false
              const tileSport = next?.sport ?? member.sports[0]?.name ?? 'Open activity'
              return (
                <button
                  type="button"
                  key={member.id ?? member.name}
                  className={`friend-tile ${isToday ? 'is-today' : ''} ${waterSports.includes(tileSport) ? 'tint-water' : 'tint-land'} ${index >= 5 ? 'beyond-grid' : ''}`}
                  onClick={() => onOpenProfile(member)}
                  aria-label={`${member.name}${next ? `, ${next.sport} ${isToday ? 'today' : dayLabel(next.startsAt)}` : ''}. View profile`}
                >
                  <span className="friend-tile-photo">
                    {member.photoUrl
                      ? <img src={member.photoUrl} alt="" loading="lazy" />
                      : <span className="friend-tile-initials">{initials(member.name)}</span>}
                    <SportIcon sport={tileSport} className="friend-tile-sport" />
                  </span>
                  <span className="friend-tile-info">
                    <strong>{member.name}</strong>
                    <small className={next ? 'has-plan' : ''}>
                      {next && <span className="friend-tile-dot" aria-hidden="true" />}
                      {next ? `${next.sport} ${isToday ? 'today' : dayLabel(next.startsAt)}` : 'No plans yet'}
                    </small>
                  </span>
                </button>
              )
            })}
            <button type="button" className="friend-tile friend-tile-invite" onClick={() => setInviteOpen(true)}>
              <span className="friend-tile-invite-icon"><UserPlus aria-hidden="true" /></span>
              <strong>Invite a mate</strong>
              <small>Bring your crew along</small>
            </button>
          </div>
        </div>
      )}

      {top && (
        <div className="crew-suggestions">
          <h3>Suggested for you</h3>
          <div className="crew-suggest-layout">
          <div className="crew-bento">
            {tops.map((suggestion, index) => (
              <div key={suggestion.member.id ?? suggestion.member.name} className={index > 0 ? 'crew-top-extra' : undefined}>
                <TopMatchCard
                  suggestion={suggestion}
                  hosting={activities.find((activity) => activity.host === suggestion.member.name && activity.startsAt >= new Date()) ?? null}
                  onOpenProfile={onOpenProfile}
                />
              </div>
            ))}
          </div>
          {side.length > 0 && (
            <div className="friend-tile-row friend-tile-grid crew-more-row" aria-label="More suggested members. Swipe to see more.">
              {side.map((suggestion, index) => {
                const tileSport = suggestion.shared[0] ?? suggestion.member.sports[0]?.name ?? 'Open activity'
                const reason = suggestion.shared.length > 1
                  ? `${suggestion.shared.length} sports in common`
                  : suggestion.shared.length === 1
                    ? `Also into ${suggestion.shared[0].toLowerCase()}`
                    : suggestion.nearby
                      ? `Also in ${suggestion.member.suburb}`
                      : suggestion.member.suburb
                return (
                  <button
                    type="button"
                    key={suggestion.member.id ?? suggestion.member.name}
                    className={`friend-tile ${waterSports.includes(tileSport) ? 'tint-water' : 'tint-land'} ${index >= 6 ? 'beyond-grid' : ''} ${index < 2 ? 'top-on-desktop' : ''}`}
                    onClick={() => onOpenProfile(suggestion.member)}
                    aria-label={`${suggestion.member.name}, ${suggestion.member.age}. ${reason}. View profile`}
                  >
                    <span className="friend-tile-photo">
                      {suggestion.member.photoUrl
                        ? <img src={suggestion.member.photoUrl} alt="" loading="lazy" />
                        : <span className="friend-tile-initials">{initials(suggestion.member.name)}</span>}
                      <SportIcon sport={tileSport} className="friend-tile-sport" />
                    </span>
                    <span className="friend-tile-info">
                      <strong>
                        {suggestion.member.name}, {suggestion.member.age}
                        {suggestion.member.verified && <ShieldCheck aria-label="Verified" />}
                      </strong>
                      <small className={suggestion.shared.length ? 'has-plan' : ''}>{reason}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          </div>
        </div>
      )}
    </>
  )
}

// Also used for friend requests: a different label and extra buttons below.
export function TopMatchCard({
  suggestion,
  hosting,
  onOpenProfile,
  label = 'Top match today',
  icon: LabelIcon = Sparkles,
  ctaVariant = 'primary',
  children,
}: {
  suggestion: CrewSuggestion
  hosting: ActivityCardData | null
  onOpenProfile: (member: CommunityMember) => void
  label?: string
  icon?: typeof Sparkles
  ctaVariant?: 'primary' | 'secondary'
  children?: ReactNode
}) {
  const { member, shared, nearby } = suggestion
  const bannerSport = shared[0] ?? member.sports[0]?.name ?? 'Open activity'
  const sharedVerbs = shared.map((sport) => sportVerbs[sport] ?? sport.toLowerCase())
  const spotsLeft = hosting ? Math.max(0, hosting.spotsTotal - hosting.spotsTaken) : 0

  // Always exactly two reasons, so every card in a row has the same height.
  const reasons: { key: string; icon: ReactNode; text: string }[] = []
  if (sharedVerbs.length > 0) reasons.push({ key: 'shared', icon: <Check aria-hidden="true" />, text: `You both ${joinWords(sharedVerbs)}` })
  if (hosting) {
    const day = hosting.startsAt.toLocaleDateString('en-AU', { weekday: 'short' })
    reasons.push({ key: 'hosting', icon: <CalendarDays aria-hidden="true" />, text: `Hosting ${day}${spotsLeft > 0 ? `, ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left` : ''}` })
  }
  if (nearby) reasons.push({ key: 'nearby', icon: <MapPin aria-hidden="true" />, text: `He's also in ${member.suburb}` })
  if (member.verified) reasons.push({ key: 'verified', icon: <ShieldCheck aria-hidden="true" />, text: 'Verified member' })
  reasons.push({ key: 'new', icon: <Users aria-hidden="true" />, text: 'New around Adelaide' })
  reasons.splice(2)

  return (
    <article className="crew-top-card">
      <div className="crew-top-banner">
        <span className="crew-top-label"><LabelIcon aria-hidden="true" /> {label}</span>
        <SportIcon sport={bannerSport} className="crew-top-sport" />
      </div>
      <div className="crew-top-body">
        <span className="crew-top-avatar"><Avatar name={member.name} photoUrl={member.photoUrl} size={56} /></span>
        <h4>
          {member.name}, {member.age}
          {member.verified && <ShieldCheck aria-label="Verified" />}
        </h4>
        <p className="crew-top-suburb"><MapPin aria-hidden="true" />{member.suburb}</p>
        <ul className="crew-top-reasons">
          {reasons.map((reason) => (
            <li key={reason.key}><span className="crew-reason-icon">{reason.icon}</span><span className="crew-reason-text">{reason.text}</span></li>
          ))}
        </ul>
        <div className="crew-top-stats">
          <span><strong>{member.stats.meetups}</strong><small>meetups</small></span>
          <span><strong>{member.stats.hosted}</strong><small>hosted</small></span>
          <span><strong>{member.stats.sports}</strong><small>sports</small></span>
        </div>
        <button type="button" className={`button button-${ctaVariant} button-md crew-top-cta`} onClick={() => onOpenProfile(member)}>
          View profile
        </button>
        {children}
      </div>
    </article>
  )
}
