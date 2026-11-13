import { MapPin } from 'lucide-react'
import { formatActivityDate, getActivitySpotsLabel } from '../data/mockData'
import type { ActivityCardData } from './ActivityCard'
import { Avatar } from './Avatar'
import { SportIcon } from './SportIcon'

// Activity card with the photo left and details right. Used on the Home map
// and for activities shared in a chat.
export function ActivityPreviewCard({ activity, onOpen }: { activity: ActivityCardData; onOpen: () => void }) {
  return (
    <button type="button" className="activity-map-card-open" onClick={onOpen} aria-label={`Open activity ${activity.title}`}>
      <span className="map-card-media">
        <img src={activity.hero} alt="" />
        <span className="map-card-pill map-card-sport"><SportIcon sport={activity.sport} />{activity.sport}</span>
        <time className="map-card-pill map-card-time">
          {formatActivityDate(activity.startsAt, { weekday: 'short', day: 'numeric', month: 'short' }, activity.suburb)}
        </time>
      </span>
      <span className="map-card-body">
        <strong>{activity.title}</strong>
        {activity.facts && <span className="map-card-facts">{activity.facts}</span>}
        <span className="map-card-place"><MapPin aria-hidden="true" /><span className="map-card-place-text">{activity.place}{activity.suburb && activity.place !== activity.suburb ? `, ${activity.suburb}` : ''}</span></span>
        <span className="map-card-bottom">
          <span className="map-card-host">
            <Avatar name={activity.host} photoUrl={activity.attendeePhotos?.[0]} size={24} />
            {activity.host}
          </span>
          <span className="level-pill">{activity.level}</span>
          <span className="map-card-spots">{getActivitySpotsLabel(activity)}</span>
        </span>
      </span>
    </button>
  )
}
