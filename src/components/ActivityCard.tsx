import { Check, Fish, Footprints, MapPin, Mountain, Waves, Bike, Dumbbell } from 'lucide-react'
import { formatActivityDate, getActivitySpotsLabel, type Activity } from '../data/mockData'

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
        <time>{formatActivityDate(activity.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}</time>
      </div>

      <h3>{activity.title}</h3>
      <p className="card-facts">{activity.facts}</p>
      <p className="card-place"><MapPin />{activity.place}</p>

      <div className="card-bottom">
        <div className={`card-attendees ${activity.attendees.length >= 3 ? 'stacked' : ''}`} aria-label={`${activity.attendees.length} ${activity.attendees.length === 1 ? 'person' : 'people'} going, hosted by ${activity.host}`}>
          {activity.attendees.length >= 3 ? (
            <>
              {activity.attendees.slice(0, 3).map((name, index) => (
                <span key={`${name}-${index}`} className={`avatar attendee-avatar ${index === 0 ? 'host-avatar' : ''}`} aria-label={name}>
                  {name[0]}
                  {index === 0 && <i><Check /></i>}
                </span>
              ))}
              {activity.attendees.length > 3 && <span className="attendee-overflow">+{activity.attendees.length - 3}</span>}
            </>
          ) : (
            <>
              {activity.attendees.map((name, index) => (
                <span key={`${name}-${index}`} className={`avatar attendee-avatar ${index === 0 ? 'host-avatar' : ''}`} aria-label={name}>
                  {name[0]}
                  {index === 0 && <i><Check /></i>}
                </span>
              ))}
              <span className="attendee-names">{activity.attendees.join(', ')}</span>
            </>
          )}
        </div>

        <div className="meta-right">
          <span className="level-pill">{activity.level}</span>
          <div className="spots">
            <span className="spot-dots" aria-hidden="true">
              {Array.from({ length: activity.spotsTotal }, (_, index) => (
                <i key={index} className={index >= activity.spotsTaken ? 'open' : ''} />
              ))}
            </span>
            <span>{getActivitySpotsLabel(activity)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
