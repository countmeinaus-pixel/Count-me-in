import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'
import { SportIcon } from '../components/SportIcon'
import { activities, communityMembers, currentUser } from '../data/mockData'
import { getConfirmedMeetupsForUserAndSport } from '../lib/checkins'

type ActivityTab = 'upcoming' | 'past'

export function SportProfileScreen() {
  const navigate = useNavigate()
  const { name, sport } = useParams()
  const [activeTab, setActiveTab] = useState<ActivityTab>('upcoming')
  const isCurrentUser = !name
  const profileName = name ? decodeURIComponent(name) : currentUser.name
  const profile = isCurrentUser
    ? currentUser
    : communityMembers.find((member) => member.name === profileName)
  const selectedSport = profile?.sports.find((item) => item.name === sport)
  const meetupEntries = useMemo(
    () => getConfirmedMeetupsForUserAndSport(profileName, sport ?? ''),
    [profileName, sport],
  )

  if (!profile || !selectedSport) {
    return (
      <div className="screen sport-profile-page">
        <button type="button" className="icon-button" aria-label="Back to profile" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <div className="empty-state-card">
          <h1>Sport not found</h1>
          <p>This profile does not list that sport.</p>
        </div>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sportActivities = activities.filter(
    (activity) => activity.sport === selectedSport.name && activity.host === profile.name,
  )
  const hostedActivities = meetupEntries.length > 0
    ? new Set(meetupEntries.filter((entry) => entry.hosted).map((entry) => entry.activityId))
    : new Set(sportActivities.filter((activity) => activity.host === profile.name).map((activity) => activity.id))
  const visibleActivities = sportActivities.filter((activity) => (
    activeTab === 'upcoming' ? activity.startsAt >= today : activity.startsAt < today
  ))
  const lastMeetup = meetupEntries
    .map((entry) => new Date(entry.activityDate))
    .sort((left, right) => right.getTime() - left.getTime())[0]
  const meetupCount = meetupEntries.length > 0 ? meetupEntries.length : selectedSport.meetups

  return (
    <div className="screen sport-profile-page">
      <header className="sport-profile-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Back to profile"
          onClick={() => navigate(isCurrentUser ? '/profile' : `/profile/${encodeURIComponent(profile.name)}`)}
        >
          <ArrowLeft />
        </button>
        <div className="sport-profile-title">
          <span className="sport-profile-icon"><SportIcon sport={selectedSport.name} /></span>
          <div>
            <p className="eyebrow">{selectedSport.level}</p>
            <h1>{selectedSport.name}</h1>
          </div>
        </div>
        <span className="sport-profile-spacer" aria-hidden="true" />
      </header>

      <div className="sport-profile-stats" aria-label={`${selectedSport.name} statistics`}>
        <div>
          <strong>{meetupCount}</strong>
          <span>Confirmed meetups</span>
        </div>
        <div>
          <strong>{hostedActivities.size}</strong>
          <span>Hosted</span>
        </div>
        <div>
          <strong>{lastMeetup
            ? lastMeetup.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
            : '—'}</strong>
          <span>Last meetup</span>
        </div>
      </div>

      <div className="sport-activity-tabs" role="tablist" aria-label={`${selectedSport.name} activities`}>
        {(['upcoming', 'past'] as const).map((tab) => (
          <button
            key={tab}
            id={`sport-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="sport-activity-panel"
            className={activeTab === tab ? 'selected' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'upcoming' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>

      <section
        id="sport-activity-panel"
        className="sport-activity-list"
        role="tabpanel"
        aria-labelledby={`sport-tab-${activeTab}`}
      >
        {visibleActivities.length > 0 ? (
          visibleActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => navigate(`/activity/${activity.id}`)}
            />
          ))
        ) : (
          <div className="empty-state-card">
            <h2>{activeTab === 'upcoming' ? 'Nothing planned yet' : `No ${selectedSport.name.toLowerCase()} meetups yet`}</h2>
            {activeTab === 'upcoming' && isCurrentUser ? (
              <>
                <p>Post a callout and find a mate to join you.</p>
                <button
                  type="button"
                  className="sport-create-link"
                  onClick={() => navigate(`/create?sport=${encodeURIComponent(selectedSport.name)}`)}
                >
                  Create a {selectedSport.name} activity <ChevronRight aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}
