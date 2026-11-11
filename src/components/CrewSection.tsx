import { CalendarDays, Check, MapPin, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react'
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

const waterSports = ['Spearfishing', 'Kitesurfing', 'Surfing', 'Swimming', 'SUP / kayak', 'Scuba diving']

function initials(name: string) {
  const letters = name.replace(/[^A-Za-z ]/g, '').trim()
  const parts = letters.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : letters.slice(0, 1)).toUpperCase()
}

// Share the app with a mate, or copy the link when sharing is not available.
async function inviteMate() {
  const url = window.location.origin
  const text = 'Join me on Count Me In: find a crew for runs, dives, rides and more around Adelaide.'
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Count Me In', text, url })
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    window.alert('Invite link copied. Paste it in a message to your mate.')
  } catch {
    // Sharing was cancelled.
  }
}

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
  const [top, ...rest] = suggestions
  const side = rest.slice(0, 7)

  return (
    <>
      {friends.length > 0 && (
        <div className="crew-friends">
          <h3>Your friends</h3>
          <div className="friend-tile-row">
            {friends.map((member) => {
              const next = nextActivityFor(member.name, activities)
              const isToday = next ? next.startsAt.toDateString() === new Date().toDateString() : false
              const tileSport = next?.sport ?? member.sports[0]?.name ?? 'Open activity'
              return (
                <button
                  type="button"
                  key={member.id ?? member.name}
                  className={`friend-tile ${isToday ? 'is-today' : ''} ${waterSports.includes(tileSport) ? 'tint-water' : 'tint-land'}`}
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
            <button type="button" className="friend-tile friend-tile-invite" onClick={() => void inviteMate()}>
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
          <div className="crew-bento">
            <TopMatchCard
              suggestion={top}
              hosting={activities.find((activity) => activity.host === top.member.name && activity.startsAt >= new Date()) ?? null}
              onOpenProfile={onOpenProfile}
            />
          </div>
          {side.length > 0 && (
            <div className="friend-tile-row crew-more-row" aria-label="More suggested members. Swipe to see more.">
              {side.map((suggestion) => {
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
                    className={`friend-tile ${waterSports.includes(tileSport) ? 'tint-water' : 'tint-land'}`}
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
      )}
    </>
  )
}

function TopMatchCard({
  suggestion,
  hosting,
  onOpenProfile,
}: {
  suggestion: CrewSuggestion
  hosting: ActivityCardData | null
  onOpenProfile: (member: CommunityMember) => void
}) {
  const { member, shared, nearby } = suggestion
  const bannerSport = shared[0] ?? member.sports[0]?.name ?? 'Open activity'
  const sharedVerbs = shared.map((sport) => sportVerbs[sport] ?? sport.toLowerCase())
  const spotsLeft = hosting ? Math.max(0, hosting.spotsTotal - hosting.spotsTaken) : 0

  return (
    <article className="crew-top-card">
      <div className="crew-top-banner">
        <span className="crew-top-label"><Sparkles aria-hidden="true" /> Top match this week</span>
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
          {sharedVerbs.length > 0 && (
            <li><span className="crew-reason-icon"><Check aria-hidden="true" /></span>You both {joinWords(sharedVerbs)}</li>
          )}
          {nearby && (
            <li><span className="crew-reason-icon"><MapPin aria-hidden="true" /></span>He's also in {member.suburb}</li>
          )}
          {hosting && (
            <li>
              <span className="crew-reason-icon"><CalendarDays aria-hidden="true" /></span>
              Hosting {hosting.title} this {hosting.startsAt.toLocaleDateString('en-AU', { weekday: 'short' })}
              {spotsLeft > 0 ? `, ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left` : ''}
            </li>
          )}
          {sharedVerbs.length === 0 && !nearby && !hosting && (
            <li><span className="crew-reason-icon"><Users aria-hidden="true" /></span>New around Adelaide</li>
          )}
        </ul>
        <div className="crew-top-stats">
          <span><strong>{member.stats.meetups}</strong><small>meetups</small></span>
          <span><strong>{member.stats.hosted}</strong><small>hosted</small></span>
          <span><strong>{member.stats.sports}</strong><small>sports</small></span>
        </div>
        <button type="button" className="button button-primary button-md crew-top-cta" onClick={() => onOpenProfile(member)}>
          View profile
        </button>
      </div>
    </article>
  )
}
