import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ActivityCard, type ActivityCardData } from "../components/ActivityCard"
import { Button } from "../components/Button"
import { activities } from "../data/mockData"
import {
  getMySavedActivities,
  type MySavedActivity,
} from "../lib/activityParticipation"
import { hasDemoJoinRequest } from "../lib/demoParticipation"

export function MyActivitiesScreen() {
  const navigate = useNavigate()
  const [segment, setSegment] = useState<"upcoming" | "past">("upcoming")
  const [savedActivities, setSavedActivities] = useState<MySavedActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let active = true
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
            const defaultStatus =
              activity.id === activities[1].id ? "hosting" : "going"
            return {
              activity: {
                ...activity,
                joinStatus: isRequested ? "pending" as const : undefined,
              },
              status: isRequested ? "requested" as const : defaultStatus,
              pendingRequestCount: 0,
            }
          }),
      ]

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
          className={segment === "past" ? "active" : ""}
          onClick={() => setSegment("past")}
          aria-pressed={segment === "past"}
        >
          Past
        </button>
      </div>

      {loadError ? (
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
