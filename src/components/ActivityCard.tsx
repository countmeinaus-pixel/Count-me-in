import { Check, Fish, Footprints, MapPin, Mountain } from 'lucide-react'

export type Activity = {
  id: number
  sport: string
  title: string
  date: string
  facts: string
  place: string
  host: string
  spots: string
  level: string
  icon: 'fish' | 'mountain' | 'run'
}

export function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  const Icon = activity.icon === 'fish' ? Fish : activity.icon === 'mountain' ? Mountain : Footprints
  return (
    <button className="activity-card" onClick={onClick}>
      <div className="card-top"><span><Icon />{activity.sport}</span><time>{activity.date}</time></div>
      <h3>{activity.title}</h3>
      <p className="card-facts">{activity.facts}</p>
      <p className="card-place"><MapPin />{activity.place}</p>
      <div className="card-bottom">
        <div className="host"><div className="avatar">{activity.host[0]}<i><Check /></i></div><span>{activity.host}</span></div>
        <div className="spots"><i/><i/><i className="open"/><i className="open"/><span>{activity.spots}</span></div>
      </div>
    </button>
  )
}
