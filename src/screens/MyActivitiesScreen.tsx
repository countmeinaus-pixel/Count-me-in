import { useNavigate } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { activities } from '../data/mockData'

export function MyActivitiesScreen() {
  const navigate = useNavigate()

  return (
    <div className="screen">
      <header className="page-title">
        <p className="eyebrow">Your plans</p>
        <h1>My activities</h1>
      </header>

      <div className="segment-bar">
        <button type="button" className="active">Upcoming</button>
        <button type="button">Past</button>
      </div>

      <div className="status-line">
        <span>Going</span>
        <p>Next up on Saturday</p>
      </div>
      <ActivityCard activity={activities[0]} onClick={() => navigate(`/activity/${activities[0].id}`)} />

      <div className="status-line">
        <span className="host-status">Hosting</span>
        <p>2 join requests</p>
      </div>
      <ActivityCard activity={activities[1]} onClick={() => navigate(`/activity/${activities[1].id}`)} />
    </div>
  )
}
