import { ArrowLeft, ChevronRight, Check, MapPin, Share2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { activities } from '../data/mockData'

export function ActivityDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const activity = activities.find((item) => item.id === Number(id))

  if (!activity) return null

  return (
    <main className="detail-layout">
      <section className="detail-hero">
        <img src={activity.hero} alt={activity.title} />
        <div className="hero-scrim" />
        <button className="icon-button hero-back" aria-label="Back" onClick={() => navigate(-1)} type="button">
          <ArrowLeft />
        </button>
        <button className="icon-button hero-share" aria-label="Share" type="button">
          <Share2 />
        </button>
      </section>

      <section className="detail-content">
        <p className="eyebrow">{activity.sport}</p>
        <h1>{activity.title}</h1>
        <p className="date">{activity.date}</p>

        <div className="facts-grid">
          <div><span>Depth</span><strong>5 to 10 m</strong></div>
          <div><span>Entry</span><strong>Shore dive</strong></div>
          <div><span>Duration</span><strong>2 hours</strong></div>
          <div><span>Spots</span><strong>2 of 4</strong></div>
        </div>

        <div className="meta-row">
          <MapPin />
          <div>
            <strong>{activity.place}</strong>
            <span>Port Noarlunga</span>
          </div>
          <ChevronRight />
        </div>

        <div className="host-card">
          <div className="avatar-large">M<span><Check /></span></div>
          <div className="grow">
            <p className="eyebrow">Hosted by</p>
            <strong>{activity.host}, 34</strong>
            <span>{activity.hostMeta}</span>
          </div>
          <ChevronRight />
        </div>

        <div className="section-heading compact">
          <h2>Who’s going</h2>
          <span>2 spots left</span>
        </div>

        <div className="going-row">
          {activity.attendees.map((name) => (
            <div key={name} className="avatar small">{name[0]}</div>
          ))}
          <div className="avatar small empty">+</div>
        </div>

        <div className="notes-box">
          <h2>From Matt</h2>
          <p>{activity.notes}</p>
        </div>
      </section>

      <div className="sticky-action">
        <Button onClick={() => navigate('/activities')} size="lg">Count me in</Button>
      </div>
    </main>
  )
}
