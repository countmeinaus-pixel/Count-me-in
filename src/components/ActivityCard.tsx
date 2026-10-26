import { Check, Fish, Footprints, MapPin, Mountain, Waves, Bike, Dumbbell } from 'lucide-react'
import type { Activity } from '../data/mockData'

export function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  const Icon = activity.icon === 'fish'
    ? Fish
    : activity.icon === 'mountain'
      ? Mountain
      : activity.icon === 'run'
        ? Footprints
        : activity.icon === 'waves'
          ? Waves
          : activity.icon === 'bike'
            ? Bike
            : Dumbbell

  return (
    <button className="activity-card" onClick={onClick} type="button">
      <div className="card-top">
        <span><Icon />{activity.sport}</span>
        <time>{activity.date}</time>
      </div>

      <h3>{activity.title}</h3>
      <p className="card-facts">{activity.facts}</p>
      <p className="card-place"><MapPin />{activity.place}</p>

      <div className="card-bottom">
        <div className="host">
          <div className="avatar">{activity.host[0]}<i><Check /></i></div>
          <span>{activity.host}</span>
        </div>

        <div className="meta-right">
          <span className="level-pill">{activity.level}</span>
          <div className="spots"><i /><i /><i className="open" /><i className="open" /><span>{activity.spots}</span></div>
        </div>
      </div>
    </button>
  )
}
