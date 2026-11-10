import { BadgeCheck, CalendarDays, Fish, Mountain, QrCode, ShieldCheck, Users, Waves } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { FlowLayout } from '../components/FlowLayout'
import { MateCard } from '../components/MateCard'
import { activities, communityMembers } from '../data/mockData'
import { markWelcomeSeen } from '../lib/onboardingFlags'
import { supabase } from '../lib/supabase'

// Shown once, before signing in: what Count Me In is about.
const slides = [
  {
    title: <><em>Find your crew</em> for the things you love doing</>,
    visual: (
      <div className="flow-showcase flow-showcase-cards" aria-hidden="true">
        {communityMembers.slice(0, 3).map((member) => (
          <MateCard key={member.name} member={member} onClick={() => {}} horizontal />
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
        <div className="showcase-row">
          <CalendarDays />
          <span className="grow">
            <strong>Monthly challenge</strong>
            <small>2 of 4 meetups</small>
            <div className="showcase-progress"><span style={{ width: '50%' }} /></div>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: <>Claim your <em>personal records</em> and let the crew confirm them</>,
    visual: (
      <div className="flow-showcase" aria-hidden="true">
        <div className="showcase-row">
          <Fish />
          <span className="grow">
            <small>Spearfishing</small>
            <strong>Deepest dive · 18.1 m</strong>
          </span>
          <BadgeCheck />
        </div>
        <div className="showcase-row">
          <Users />
          <span className="grow">
            <strong>3 of 3 confirms</strong>
            <small>Verified by the crew</small>
          </span>
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
