import { ArrowDownToLine, BadgeCheck, Bike, CalendarCheck, CalendarDays, Fish, LockKeyhole, Megaphone, Mountain, QrCode, Sailboat, ShieldCheck, Sunrise, Users, Waves } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { FlowLayout } from '../components/FlowLayout'
import { MateCard } from '../components/MateCard'
import { activities, communityMembers } from '../data/mockData'
import { markWelcomeSeen } from '../lib/onboardingFlags'
import { supabase } from '../lib/supabase'

// Example PRs for the last slide: verified after 3 confirms from the crew.
const prExamples = [
  { sport: 'Spearfishing', label: 'Deepest dive', value: '18.1 m', confirms: 3 },
  { sport: 'Running', label: '5 km time', value: '21:45', confirms: 3 },
  { sport: 'Kitesurfing', label: 'Highest jump', value: '9.2 m', confirms: 2 },
  { sport: 'Hiking', label: 'Longest hike', value: '32 km', confirms: 1 },
  { sport: 'Gym', label: 'Deadlift', value: '180 kg', confirms: 3 },
  { sport: 'Surfing', label: 'Biggest wave', value: '8 ft', confirms: 2 },
]

// Shown once, before signing in: what Count Me In is about.
const slides = [
  {
    title: <><em>Find your crew</em> for the things you love doing</>,
    visual: (
      <div className="flow-showcase flow-showcase-cards" aria-hidden="true">
        {communityMembers.slice(0, 6).map((member, index) => (
          // Rows after the first drop out on short screens, two cards at a time.
          <div key={member.name} className="flow-showcase-card" data-optional={index >= 2 ? `crew-row-${Math.floor(index / 2)}` : undefined}>
            <MateCard member={member} onClick={() => {}} />
          </div>
        ))}
      </div>
    ),
  },
  {
    title: <>See a plan you like? Tap <em>Count me in</em></>,
    visual: (
      <div className="flow-showcase" aria-hidden="true">
        <ActivityCard activity={activities[1]} onClick={() => {}} />
        <span className="showcase-cta">Count me in</span>
      </div>
    ),
  },
  {
    title: <>Meet up, <em>check in with a QR scan</em> and earn patches</>,
    visual: (
      <div className="flow-showcase" aria-hidden="true">
        <div className="showcase-row">
          <QrCode />
          <span className="grow">
            <strong>Meetup confirmed</strong>
            <small>Scan each other's code on the day</small>
          </span>
          <BadgeCheck />
        </div>
        <div className="showcase-patches">
          <span className="showcase-patch"><ShieldCheck />First meetup</span>
          <span className="showcase-patch"><Waves />Salt water</span>
          <span className="showcase-patch"><Mountain />Trailhead</span>
          <span className="showcase-patch"><Users />Crew</span>
        </div>
        <div className="showcase-patches" data-optional="patches-row-2" data-optional-drop="2">
          <span className="showcase-patch"><Sunrise />Early bird</span>
          <span className="showcase-patch"><CalendarCheck />Regular</span>
          <span className="showcase-patch"><Megaphone />Host</span>
          <span className="showcase-patch"><Bike />First ride</span>
        </div>
        {/* Every sport has its own set of patches to collect. */}
        <div className="showcase-sport" data-optional="sport-patches" data-optional-drop="3">
          <div className="showcase-sport-heading">
            <Fish />
            <strong>Spearfishing patches</strong>
            <small>2 of 20</small>
          </div>
          <div className="showcase-patches">
            <span className="showcase-patch"><Fish />First dive</span>
            <span className="showcase-patch"><Fish />Reef rookie</span>
            <span className="showcase-patch locked"><ArrowDownToLine />Deep breath<LockKeyhole className="showcase-patch-lock" /></span>
            <span className="showcase-patch locked"><Sailboat />Boat crew<LockKeyhole className="showcase-patch-lock" /></span>
          </div>
        </div>
        <div className="showcase-row">
          <CalendarDays />
          <span className="grow">
            <strong>Monthly challenge</strong>
            <small>2 of 4 meetups</small>
            <div className="showcase-progress"><span style={{ width: '50%' }} /></div>
          </span>
        </div>
        <div className="showcase-row" data-optional="challenge-2" data-optional-drop="1">
          <Waves />
          <span className="grow">
            <strong>Summer salt water</strong>
            <small>1 of 3 ocean sessions · ends 31 Jan</small>
            <div className="showcase-progress"><span style={{ width: '33%' }} /></div>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: <>Claim your <em>personal records</em> and let the crew confirm them</>,
    visual: (
      <div className="flow-showcase" aria-hidden="true">
        <div className="showcase-prs">
          {prExamples.map((pr, index) => (
            // Rows 2 and 3 drop out on short screens, the last row first.
            <div
              key={pr.label}
              className={`showcase-pr${pr.confirms === 3 ? ' is-verified' : ''}`}
              data-optional={index >= 2 ? `pr-row-${Math.floor(index / 2) + 1}` : undefined}
            >
              <small>{pr.sport}</small>
              <strong>{pr.label}</strong>
              <span className="showcase-pr-value">
                {pr.value}
                {pr.confirms === 3 && <BadgeCheck />}
              </span>
              <span className="showcase-pr-status">
                {pr.confirms === 3 ? 'Verified by the crew' : `${pr.confirms} of 3 confirms`}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export function WelcomeScreen() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const isLast = index === slides.length - 1

  async function finish() {
    markWelcomeSeen()
    // Opened again from Help while signed in: back to the app, not to sign in.
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    navigate(session ? '/' : '/login', { replace: true })
  }

  return (
    <FlowLayout
      fitViewport
      progress={(index + 1) / slides.length}
      title={slide.title}
      onBack={index > 0 ? () => setIndex(index - 1) : undefined}
      onSkip={() => void finish()}
      primaryLabel={isLast ? 'Get started' : 'Continue'}
      onPrimary={() => (isLast ? void finish() : setIndex(index + 1))}
    >
      {slide.visual}
    </FlowLayout>
  )
}
