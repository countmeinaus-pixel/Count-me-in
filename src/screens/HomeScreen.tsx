import { useMemo, useState } from 'react'
import { Bell, Check, MapPin, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { Button } from '../components/Button'
import { activities, filters } from '../data/mockData'

export function HomeScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('My sports')

  const visible = useMemo(() => {
    if (filter === 'My sports') return activities
    return activities.filter((item) => item.sport === filter)
  }, [filter])

  return (
    <div className="screen">
      <header className="topbar">
        <div className="location"><MapPin />Adelaide</div>
        <button className="icon-button" aria-label="Notifications"><Bell /></button>
      </header>

      <section className="intro">
        <p className="eyebrow">Good morning</p>
        <h1>Ready to get out there, Jai?</h1>
      </section>

      <div className="filter-row">
        {filters.map((item) => (
          <button
            key={item}
            className={`chip ${filter === item ? 'selected' : ''}`}
            onClick={() => setFilter(item)}
            type="button"
          >
            {filter === item && <Check />}
            {item}
          </button>
        ))}
      </div>

      <div className="section-heading">
        <h2>This week</h2>
        <span>{visible.length} callouts</span>
      </div>

      <div className="card-list">
        {visible.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onClick={() => navigate(`/activity/${activity.id}`)}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="empty-state">
          <Search />
          <h2>Nothing on for this sport yet</h2>
          <p>Be the first. Post a callout.</p>
          <Button onClick={() => navigate('/create')}>Create activity</Button>
        </div>
      )}
    </div>
  )
}
