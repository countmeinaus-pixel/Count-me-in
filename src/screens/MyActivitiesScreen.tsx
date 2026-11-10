import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ActivityCard, type ActivityCardData } from "../components/ActivityCard"
import { Avatar } from "../components/Avatar"
import { Button } from "../components/Button"
import { activities } from "../data/mockData"
import {
  getMySavedActivities,
  getPendingInvites,
  respondToActivityInvite,
  type InvitedActivity,
  type MySavedActivity,
} from "../lib/activityParticipation"
import { hasDemoJoinRequest } from "../lib/demoParticipation"

export function MyActivitiesScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [segment, setSegment] = useState<"upcoming" | "invited" | "past">(
    "upcoming",
  )
  const [savedActivities, setSavedActivities] = useState<MySavedActivity[]>([])
  const [invites, setInvites] = useState<InvitedActivity[]>([])
  const [inviteError, setInviteError] = useState("")
  const [inviteFeedback, setInviteFeedback] = useState("")
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let active = true
    void getPendingInvites()
      .then((result) => {
        if (active) setInvites(result)
      })
      .catch((error: unknown) => {
        if (active)
          setInviteError(
            error instanceof Error ? error.message : "Unable to load invitations.",
          )
      })
    void getMySavedActivities()
      .then((result) => {
        if (active) setSavedActivities(result)
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load your activities.",
          )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const displayedActivities: Array<{
    activity: ActivityCardData
    status: "going" | "hosting" | "requested"
    pendingRequestCount: number
  }> = savedActivities.length
    ? savedActivities.map(
        ({ joinStatus, pendingRequestCount, ...activity }) => ({
          activity,
          status: joinStatus,
          pendingRequestCount,
        }),
      )
    : [
        ...activities
          .filter(
            (activity) =>
              activity.id === activities[0].id ||
              activity.id === activities[1].id ||
              hasDemoJoinRequest(activity.id),
          )
          .map((activity) => {
            const isRequested = hasDemoJoinRequest(activity.id)
            const defaultStatus: "hosting" | "going" =
              activity.id === activities[1].id ? "hosting" : "going"
            return {
              activity: {
                ...activity,
                joinStatus: isRequested ? "pending" as const : undefined,
              },
              status: isRequested ? ("requested" as const) : defaultStatus,
              pendingRequestCount: 0,
            }
          }),
      ]

  async function answerInvite(
    invite: InvitedActivity,
    response: "accepted" | "declined",
  ) {
    setRespondingTo(invite.id)
    setInviteError("")
    setInviteFeedback("")
    try {
      await respondToActivityInvite(invite.id, response)
      setInvites((current) => current.filter((item) => item.id !== invite.id))
      if (response === "accepted") {
        setSavedActivities(await getMySavedActivities())
        setInviteFeedback(`You’re going to ${invite.title}. It’s under Upcoming.`)
      } else {
        setInviteFeedback(`No worries. We’ve let ${invite.invitedBy} know.`)
      }
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Unable to answer this invitation.",
      )
    } finally {
      setRespondingTo(null)
    }
  }

  const statusLabels = {
    going: "Going",
    hosting: "Hosting",
    requested: "Requested",
  } as const

  return (
    <div className="screen my-activities-screen">
      <header className="page-title">
        <p className="eyebrow">Your plans</p>
        <h1>My activities</h1>
      </header>

      {typeof location.state?.statusMessage === "string" && (
        <p className="activity-share-feedback" role="status">
          {location.state.statusMessage}
        </p>
      )}

      <Button
        className="my-activities-create"
        onClick={() => navigate("/create")}
      >
        <Plus aria-hidden="true" />
        Create activity
      </Button>

      <div className="segment-bar">
        <button
          type="button"
          className={segment === "upcoming" ? "active" : ""}
          onClick={() => setSegment("upcoming")}
          aria-pressed={segment === "upcoming"}
        >
          Upcoming
        </button>
        <button
          type="button"
          className={segment === "invited" ? "active" : ""}
          onClick={() => setSegment("invited")}
          aria-pressed={segment === "invited"}
          aria-label={invites.length ? `Invited, ${invites.length} open` : "Invited"}
        >
          Invited
          {invites.length > 0 && (
            <span className="segment-count" aria-hidden="true">
              {invites.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={segment === "past" ? "active" : ""}
          onClick={() => setSegment("past")}
          aria-pressed={segment === "past"}
        >
          Past
        </button>
      </div>

      {inviteFeedback && (
        <p className="activity-join-feedback" role="status">
          {inviteFeedback}
        </p>
      )}

      {segment === "invited" ? (
        <div className="my-activities-grid">
          {inviteError && (
            <p className="wizard-error" role="alert">
              {inviteError}
            </p>
          )}
          {invites.length === 0 ? (
            <div className="empty-state-card compact">
              <h3>No open invitations</h3>
              <p>When a mate invites you to an activity, it lands here.</p>
              <Button variant="secondary" onClick={() => navigate("/")}>
                Find activities
              </Button>
            </div>
          ) : (
            invites.map((invite) => (
              <section className="invite-card" key={invite.id}>
                <p className="invite-card-from">
                  <Avatar
                    name={invite.invitedBy}
                    photoUrl={invite.invitedByPhotoUrl}
                    size={32}
                  />
                  <span>
                    <strong>{invite.invitedBy}</strong> invited you
                  </span>
                </p>
                <ActivityCard
                  activity={invite}
                  onClick={() => navigate(`/activity/${invite.id}`)}
                />
                <div className="invite-card-actions">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={respondingTo !== null}
                    onClick={() => void answerInvite(invite, "declined")}
                  >
                    Not this time
                  </Button>
                  <Button
                    size="md"
                    disabled={respondingTo !== null}
                    onClick={() => void answerInvite(invite, "accepted")}
                  >
                    Count me in
                  </Button>
                </div>
              </section>
            ))
          )}
        </div>
      ) : loadError ? (
        <p className="wizard-error" role="alert">
          {loadError}
        </p>
      ) : isLoading ? (
        <p className="text-[var(--text-secondary)]" role="status">
          Loading your activities…
        </p>
      ) : segment === "upcoming" ? (
        <div className="my-activities-grid">
          {(["going", "hosting", "requested"] as const).map((status) => {
            const items = displayedActivities.filter(
              (item) => item.status === status,
            )
            if (items.length === 0) return null

            return (
              <section className="my-activities-section" key={status}>
                <div className="status-line">
                  <span className={`${status}-status`}>
                    {statusLabels[status]}
                  </span>
                  <p>
                    {status === "hosting"
                      ? items.some((item) => item.pendingRequestCount > 0)
                        ? `${items.reduce((count, item) => count + item.pendingRequestCount, 0)} pending requests`
                        : "Your callouts"
                      : status === "requested"
                        ? "Waiting for the host"
                        : "Your upcoming plans"}
                  </p>
                </div>
                {items.map(({ activity }) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => navigate(`/activity/${activity.id}`)}
                  />
                ))}
              </section>
            )
          })}
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
