import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { activities } from '../data/mockData'

export function MyActivitiesScreen() {
  const navigate = useNavigate()
  const [segment, setSegment] = useState<'upcoming' | 'past'>('upcoming')

  return (
    <div className="screen my-activities-screen">
      <header className="page-title">
        <p className="eyebrow">Your plans</p>
        <h1>My activities</h1>
      </header>

      <div className="segment-bar">
        <button type="button" className={segment === 'upcoming' ? 'active' : ''} onClick={() => setSegment('upcoming')} aria-pressed={segment === 'upcoming'}>Upcoming</button>
        <button type="button" className={segment === 'past' ? 'active' : ''} onClick={() => setSegment('past')} aria-pressed={segment === 'past'}>Past</button>
      </div>

      {segment === 'upcoming' ? (
        <div className="my-activities-grid">
          <section className="my-activities-section">
            <div className="status-line">
              <span>Going</span>
              <p>Your next activity</p>
            </div>
            <ActivityCard activity={activities[0]} onClick={() => navigate(`/activity/${activities[0].id}`)} />
          </section>

          <section className="my-activities-section">
            <div className="status-line">
              <span className="host-status">Hosting</span>
              <p>Your callout</p>
            </div>
            <ActivityCard activity={activities[1]} onClick={() => navigate(`/activity/${activities[1].id}`)} />
          </section>
        </div>
      ) : (
        <div className="empty-state-card compact">
          <h3>No past activities yet</h3>
          <p>Confirmed meetups will show here after they happen.</p>
        </div>
      )}
    </div>
  )
}
