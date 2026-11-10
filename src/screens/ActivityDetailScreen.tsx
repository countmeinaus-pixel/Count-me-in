import {
  ArrowLeft,
  ChevronRight,
  Flag,
  MapPin,
  Share2,
} from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Avatar } from "../components/Avatar"
import { Button } from "../components/Button"
import { ReportDialog } from "../components/ReportDialog"
import {
  activities,
  communityMembers,
  currentUser,
  formatActivityDate,
  getActivitySpotsLabel,
  getActivitySpotsLeft,
  type Activity,
} from "../data/mockData"
import {
  cancelActivityJoinRequest,
  getActivityJoinState,
  leaveActivity,
  requestToJoinActivity,
  respondToActivityJoinRequest,
  type ActivityJoinState,
} from "../lib/activityParticipation"
import { getActivityChatThreadId } from "../lib/chat"
import {
  getDemoJoinRequestKey,
  hasDemoJoinRequest,
  removeDemoJoinRequest,
  saveDemoJoinRequest,
} from "../lib/demoParticipation"
import { getSavedActivity, type SavedActivityDetails } from "../lib/activities"
import {
  confirmSavedActivityMeetup,
  getSavedActivityCheckinCode,
  getPatchProgressForUser,
  hasSavedActivityCheckin,
  hasConfirmedMeetupForUser,
  loadSavedMeetupsForUser,
  recordMeetupCheckIn,
} from "../lib/checkins"

function getAdelaideDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Adelaide",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function ActivityDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const mockActivity = activities.find((item) => String(item.id) === id)
  const [savedActivity, setSavedActivity] =
    useState<SavedActivityDetails | null>(null)
  const [isLoadingSavedActivity, setIsLoadingSavedActivity] = useState(
    Boolean(id && !mockActivity),
  )
  const [checkinUserName, setCheckinUserName] = useState(currentUser.name)
  const [, setCheckinStatsVersion] = useState(0)
  const [loadError, setLoadError] = useState("")
  const [joinState, setJoinState] = useState<ActivityJoinState | null>(null)
  const [isLoadingJoinState, setIsLoadingJoinState] = useState(false)
  const [joinError, setJoinError] = useState("")
  const [isUpdatingJoin, setIsUpdatingJoin] = useState(false)
  const [respondingToUserId, setRespondingToUserId] = useState<string | null>(
    null,
  )
  const [qrOpen, setQrOpen] = useState(false)
  const [scanMode, setScanMode] = useState<"qr" | "camera" | "success">("qr")
  const [qrError, setQrError] = useState("")
  const [checkinCode, setCheckinCode] = useState("")
  const [qrPayload, setQrPayload] = useState("")
  const [joinRequested, setJoinRequested] = useState(() =>
    mockActivity ? hasDemoJoinRequest(mockActivity.id) : false,
  )
  const [joinFeedback, setJoinFeedback] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveMessage, setLeaveMessage] = useState("")
  const [shareFeedback, setShareFeedback] = useState("")
  const [confirmed, setConfirmed] = useState(() =>
    mockActivity
      ? hasConfirmedMeetupForUser(currentUser.name, mockActivity.id)
      : false,
  )
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(
    Boolean(id && !mockActivity),
  )
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null)
  const scanHandledRef = useRef(false)
  const activity: Activity | SavedActivityDetails | null =
    mockActivity ?? savedActivity
  const isSavedActivity = savedActivity !== null

  useEffect(() => {
    if (!id) return
    if (mockActivity) {
      setJoinRequested(hasDemoJoinRequest(mockActivity.id))
      setJoinFeedback("")
      setSavedActivity(null)
      setIsLoadingSavedActivity(false)
      setLoadError("")
      return
    }

    let active = true
    setSavedActivity(null)
    setIsLoadingSavedActivity(true)
    setLoadError("")
    void getSavedActivity(id)
      .then((result) => {
        if (active) setSavedActivity(result)
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load this activity.",
          )
      })
      .finally(() => {
        if (active) setIsLoadingSavedActivity(false)
      })

    return () => {
      active = false
    }
  }, [id, mockActivity])

  useEffect(() => {
    if (!savedActivity) {
      setJoinState(null)
      setIsLoadingJoinState(false)
      return
    }

    let active = true
    setJoinState(null)
    setJoinError("")
    setIsLoadingJoinState(true)
    void getActivityJoinState(savedActivity.id)
      .then((result) => {
        if (active) setJoinState(result)
      })
      .catch((error: unknown) => {
        if (active)
          setJoinError(
            error instanceof Error
              ? error.message
              : "Unable to load activity join requests.",
          )
      })
      .finally(() => {
        if (active) setIsLoadingJoinState(false)
      })

    return () => {
      active = false
    }
  }, [savedActivity])

  useEffect(() => {
    if (!savedActivity) return
    let active = true
    setIsLoadingConfirmation(true)
    setConfirmed(false)
    void hasSavedActivityCheckin(savedActivity.id)
      .then((result) => {
        if (active) setConfirmed(result)
      })
      .catch((error: unknown) => {
        if (active)
          setJoinError(
            error instanceof Error ? error.message : "Unable to load check-in status.",
          )
      })
      .finally(() => {
        if (active) setIsLoadingConfirmation(false)
      })
    return () => {
      active = false
    }
  }, [savedActivity])

  useEffect(() => {
    if (!qrOpen || !activity) return
    let active = true
    setQrError("")
    setCheckinCode("")
    setQrPayload("")

    async function renderCode() {
      try {
        let payload: string
        if (savedActivity) {
          const code = await getSavedActivityCheckinCode(savedActivity.id)
          if (!active) return
          setCheckinCode(code)
          payload = JSON.stringify({
            type: "count-me-in-checkin",
            activityId: savedActivity.id,
            code,
          })
        } else if (mockActivity) {
          payload = JSON.stringify({
            type: "count-me-in-demo",
            user: currentUser.name,
            partner: mockActivity.host,
            activityId: mockActivity.id,
            activityTitle: mockActivity.title,
          })
        } else {
          return
        }
        if (active) setQrPayload(payload)
      } catch (error) {
        if (active)
          setQrError(
            error instanceof Error ? error.message : "Unable to create your check-in code.",
          )
      }
    }

    void renderCode()
    return () => {
      active = false
    }
  }, [activity, mockActivity, qrOpen, savedActivity])

  useEffect(() => {
    if (!qrOpen || !qrPayload || !qrCanvasRef.current) return
    void QRCode.toCanvas(qrCanvasRef.current, qrPayload, {
      width: 220,
      margin: 1,
      color: { dark: "#0a1621", light: "#ffffff" },
    }).catch((error: unknown) => {
      setQrError(error instanceof Error ? error.message : "Unable to draw your QR code.")
    })
  }, [qrOpen, qrPayload, checkinCode])

  useEffect(() => () => scannerControlsRef.current?.stop(), [])

  if (!activity) {
    return (
      <main className="screen">
        <p
          role={loadError ? "alert" : undefined}
          className={
            loadError ? "wizard-error" : "text-[var(--text-secondary)]"
          }
        >
          {isLoadingSavedActivity
            ? "Loading activity…"
            : loadError || "This activity could not be found."}
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </main>
    )
  }

  async function refreshJoinState() {
    if (!savedActivity) return
    const result = await getActivityJoinState(savedActivity.id)
    setJoinState(result)
  }

  async function handleShareActivity() {
    setShareFeedback("")
    const url = window.location.href
    const activityTitle = activity?.title ?? ""

    if (navigator.share) {
      try {
        await navigator.share({ title: activityTitle, url })
        setShareFeedback("Activity shared.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareFeedback("Activity link copied.")
    } catch (error) {
      setShareFeedback(
        error instanceof Error
          ? `Unable to copy the activity link: ${error.message}`
          : "Unable to copy the activity link. Please copy the page address from your browser.",
      )
    }
  }

  async function handleJoinActivity() {
    if (mockActivity) {
      try {
        saveDemoJoinRequest(mockActivity.id)
      } catch {
        setJoinError(
          "This demo request could not be saved in this browser. Try a real activity to send a request to its host.",
        )
        return
      }
      setJoinRequested(true)
      setJoinError("")
      return
    }
    if (!savedActivity) return

    setIsUpdatingJoin(true)
    setJoinError("")
    try {
      const status = await requestToJoinActivity(savedActivity.id)
      await refreshJoinState()
      setJoinFeedback(
        status === "accepted"
          ? "You’re in. The host accepts this activity automatically."
          : "Your request was sent to the host and is waiting for review.",
      )
    } catch (error) {
      setJoinError(
        error instanceof Error
          ? error.message
          : "Unable to send your join request.",
      )
    } finally {
      setIsUpdatingJoin(false)
    }
  }

  async function handleCancelJoinRequest() {
    if (mockActivity) {
      try {
        removeDemoJoinRequest(mockActivity.id)
      } catch {
        setJoinError(
          "This demo request could not be removed from this browser.",
        )
        return
      }
      setJoinRequested(false)
      setJoinError("")
      return
    }
    if (!savedActivity) return

    setIsUpdatingJoin(true)
    setJoinError("")
    try {
      await cancelActivityJoinRequest(savedActivity.id)
      await refreshJoinState()
      setJoinFeedback("")
    } catch (error) {
      setJoinError(
        error instanceof Error
          ? error.message
          : "Unable to cancel your join request.",
      )
    } finally {
      setIsUpdatingJoin(false)
    }
  }

  async function handleLeaveActivity() {
    if (!savedActivity) return
    setIsUpdatingJoin(true)
    setJoinError("")
    try {
      await leaveActivity(savedActivity.id, leaveMessage)
      await refreshJoinState()
      setLeaveOpen(false)
      setLeaveMessage("")
      setJoinFeedback(`You're out. We've let ${hostName} know.`)
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "Unable to leave this activity.",
      )
      setLeaveOpen(false)
    } finally {
      setIsUpdatingJoin(false)
    }
  }

  async function handleJoinRequestResponse(
    userId: string,
    response: "accepted" | "declined",
  ) {
    if (!savedActivity) return
    setRespondingToUserId(userId)
    setJoinError("")
    try {
      await respondToActivityJoinRequest(savedActivity.id, userId, response)
      await refreshJoinState()
      if (response === "accepted") {
        window.dispatchEvent(new Event("count-me-in-chat-unread-changed"))
      }
    } catch (error) {
      setJoinError(
        error instanceof Error
          ? error.message
          : "Unable to update this join request.",
      )
    } finally {
      setRespondingToUserId(null)
    }
  }

  async function openSavedActivityChat() {
    if (!savedActivity) return
    setJoinError("")
    try {
      const threadId = await getActivityChatThreadId(savedActivity.id)
      if (!threadId) {
        setJoinError("The group chat is not ready yet. Try again in a moment.")
        return
      }
      navigate(`/chats/${threadId}`)
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to open the activity chat.")
    }
  }

  function closeQr() {
    scannerControlsRef.current?.stop()
    scannerControlsRef.current = null
    setQrOpen(false)
    setScanMode("qr")
    setQrError("")
  }

  function confirmMeetup() {
    if (!mockActivity) return

    const hostCheckIn = recordMeetupCheckIn({
      user: currentUser.name,
      partner: mockActivity.host,
      activityId: mockActivity.id,
      activityTitle: mockActivity.title,
      activityDate: mockActivity.startsAt.toISOString(),
      sport: mockActivity.sport,
      startsAt: mockActivity.startsAt.toISOString(),
      hosted: mockActivity.host === currentUser.name,
      oceanActivity: mockActivity.details.Location?.toLowerCase() === "ocean",
      terrain: mockActivity.details.Terrain,
    })

    recordMeetupCheckIn({
      user: mockActivity.host,
      partner: currentUser.name,
      activityId: mockActivity.id,
      activityTitle: mockActivity.title,
      activityDate: mockActivity.startsAt.toISOString(),
      sport: mockActivity.sport,
      startsAt: mockActivity.startsAt.toISOString(),
      hosted: true,
      oceanActivity: mockActivity.details.Location?.toLowerCase() === "ocean",
      terrain: mockActivity.details.Terrain,
    })

    if (hostCheckIn) {
      setConfirmed(true)
    }
  }

  async function handleScannedCode(rawValue: string) {
    if (!savedActivity) {
      confirmMeetup()
      setScanMode("success")
      return
    }

    try {
      const payload: unknown = JSON.parse(rawValue)
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("type" in payload) ||
        !("activityId" in payload) ||
        !("code" in payload) ||
        payload.type !== "count-me-in-checkin" ||
        payload.activityId !== savedActivity.id ||
        typeof payload.code !== "string"
      ) {
        throw new Error("That QR code is not for this activity.")
      }

      await confirmSavedActivityMeetup(savedActivity.id, payload.code)
      setConfirmed(true)
      setScanMode("success")
      try {
        const userName = await loadSavedMeetupsForUser()
        if (userName) setCheckinUserName(userName)
        setCheckinStatsVersion((version) => version + 1)
      } catch (error) {
        setQrError(
          error instanceof Error
            ? `Meetup confirmed, but your stats could not be refreshed: ${error.message}`
            : "Meetup confirmed, but your stats could not be refreshed.",
        )
      }
    } catch (error) {
      setQrError(
        error instanceof Error ? error.message : "Unable to confirm this meetup.",
      )
      setScanMode("qr")
    }
  }

  async function startCameraScan() {
    setScanMode("camera")
    setQrError("")

    if (!savedActivity) {
      window.setTimeout(() => {
        confirmMeetup()
        setScanMode("success")
      }, 1200)
      return
    }

    scanHandledRef.current = false
    if (!videoRef.current) {
      setQrError("The camera preview could not be opened.")
      setScanMode("qr")
      return
    }

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser")
      const reader = new BrowserQRCodeReader()
      scannerControlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, controls) => {
          if (!result || scanHandledRef.current) return
          scanHandledRef.current = true
          controls.stop()
          scannerControlsRef.current = null
          void handleScannedCode(result.getText())
        },
      )
    } catch (error) {
      setQrError(
        error instanceof Error
          ? `Unable to access the camera: ${error.message}`
          : "Unable to access the camera. Check your browser permissions and try again.",
      )
      setScanMode("qr")
    }
  }

  const earnedPatches = getPatchProgressForUser(checkinUserName).filter(
    (patch) => patch.earned,
  )
  const savedDetails = savedActivity
  const sportFacts = savedDetails
    ? [
        ...Object.entries(savedDetails.sportDetails)
          // Duration is shown once below, from the activity itself.
          .filter(([key, value]) => value.trim() !== "" && !/^duration/i.test(key))
          .map(([key, value]) => ({
            label: key === "kite_sizes" ? "Kites" : key.replace(/_/g, " "),
            value,
          })),
        {
          label: "Duration",
          value:
            savedDetails.durationMinutes % 60 === 0
              ? `${savedDetails.durationMinutes / 60} ${
                  savedDetails.durationMinutes === 60 ? "hour" : "hours"
                }`
              : `${Math.floor(savedDetails.durationMinutes / 60)} hr ${savedDetails.durationMinutes % 60} min`,
        },
        {
          label: "Spots",
          value:
            savedDetails.spotsTotal === 1
              ? "1 buddy wanted"
              : `${savedDetails.spotsTotal} spots`,
        },
      ]
    : [
        ...Object.entries(mockActivity?.details ?? {}).map(
          ([label, value]) => ({ label, value }),
        ),
        {
          label: "Spots",
          value: mockActivity ? getActivitySpotsLabel(mockActivity) : "",
        },
      ]
  const displayDate = savedDetails
    ? formatActivityDate(new Date(savedDetails.startsAt), {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : mockActivity
      ? formatActivityDate(mockActivity.startsAt)
      : ""
  const hostName = savedDetails?.host ?? mockActivity?.host ?? ""
  const hostAge =
    savedDetails?.hostAge ??
    (hostName === currentUser.name
      ? currentUser.age
      : communityMembers.find((member) => member.name === hostName)?.age)
  const attendeeProfiles: Array<{
    key: string
    name: string
    photoUrl: string | null
  }> = savedDetails
    ? [
        { key: "host", name: savedDetails.host, photoUrl: savedDetails.hostPhoto },
        ...(joinState?.acceptedParticipants.map((participant) => ({
          key: participant.id,
          name: participant.name,
          photoUrl: participant.photoUrl,
        })) ?? []),
      ]
    : (mockActivity?.attendees ?? []).map((name, index) => ({
        key: `${name}-${index}`,
        name,
        photoUrl: mockActivity?.attendeePhotos?.[index] ?? null,
      }))
  const attendees = attendeeProfiles.map((attendee) => attendee.name)
  const activityStart = savedDetails
    ? new Date(savedDetails.startsAt)
    : mockActivity?.startsAt
  const isActivityDay =
    activityStart !== undefined &&
    getAdelaideDateKey(activityStart) === getAdelaideDateKey(new Date())
  const isHost =
    savedDetails?.viewerIsHost ?? mockActivity?.host === currentUser.name
  const canEditActivity = savedDetails?.viewerCanEdit ?? false
  const isJoined =
    isHost ||
    (savedDetails
      ? joinState?.status === "accepted"
      : attendees.includes(currentUser.name))
  const isFull =
    Boolean(savedDetails) &&
    (joinState?.acceptedParticipants.length ?? 0) >=
      (savedDetails?.spotsTotal ?? 0) &&
    joinState?.status !== "accepted"
  const spotsLabel = savedDetails
    ? isFull
      ? "Full"
      : savedDetails.spotsTotal === 1
        ? "1 buddy wanted"
        : `${savedDetails.spotsTotal - (joinState?.acceptedParticipants.length ?? 0)} spots left`
    : mockActivity?.spotsTotal === 1
      ? "1 buddy wanted"
      : `${mockActivity ? getActivitySpotsLeft(mockActivity) : 0} spots left`

  return (
    <main className="detail-layout">
      <section className="detail-hero">
        <img src={activity.hero} alt={activity.title} />
        <div className="hero-scrim" />
        <button
          className="icon-button hero-back"
          aria-label="Back"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft />
        </button>
        <button
          className="icon-button hero-share"
          aria-label="Share"
          type="button"
          onClick={() => void handleShareActivity()}
        >
          <Share2 />
        </button>
      </section>

      <section className="detail-content">
        <p className="eyebrow">{activity.sport}</p>
        <h1>{activity.title}</h1>
        <p className="date">{displayDate}</p>
        {typeof location.state?.statusMessage === "string" && (
          <p className="activity-share-feedback" role="status">
            {location.state.statusMessage}
          </p>
        )}
        {shareFeedback && (
          <p className={`activity-share-feedback ${shareFeedback.startsWith("Unable") ? "error" : ""}`} role="status">
            {shareFeedback}
          </p>
        )}
        {canEditActivity && savedActivity && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/activity/${savedActivity.id}/edit`)}
          >
            Edit activity
          </Button>
        )}
        {isSavedActivity && !isHost && (
          <button
            type="button"
            className="detail-report-action"
            onClick={() => setReportOpen(true)}
          >
            <Flag aria-hidden="true" />
            Report activity
          </button>
        )}

        <div className="facts-grid">
          {sportFacts.map((fact) => (
            <div key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>

        {activity.notes.trim() && (
          <div className="notes-box notes-box-after-facts">
            <h2>From {hostName}</h2>
            <p>{activity.notes}</p>
          </div>
        )}

        <div className="meta-row">
          <MapPin />
          <div>
            <strong>
              {savedDetails?.meetingPoint ?? mockActivity?.place ?? ""}
            </strong>
            <span>{savedDetails?.suburb ?? mockActivity?.suburb ?? ""}</span>
          </div>
          <ChevronRight />
        </div>

        <div className="host-card">
          <Avatar
            name={hostName}
            photoUrl={savedDetails?.hostPhoto}
            size={48}
            verified={savedDetails?.hostVerified !== false}
          />
          <div className="grow">
            <p className="eyebrow">Hosted by</p>
            <strong>
              {hostName}
              {hostAge ? `, ${hostAge}` : ""}
            </strong>
            <span>
              {savedDetails
                ? "Hosting this activity"
                : (mockActivity?.hostMeta ?? "")}
            </span>
          </div>
          <ChevronRight />
        </div>

        <div className="section-heading compact">
          <h2>Who’s going</h2>
          <span>{spotsLabel}</span>
        </div>

        <div className="going-row">
          {attendeeProfiles.map((attendee) => (
            <button
              key={attendee.key}
              type="button"
              className="going-avatar-button"
              aria-label={`View ${attendee.name}'s profile`}
              onClick={() =>
                navigate(`/profile/${encodeURIComponent(attendee.name)}`)
              }
            >
              <Avatar
                name={attendee.name}
                photoUrl={attendee.photoUrl}
                size={36}
              />
            </button>
          ))}
          <button
            type="button"
            className="avatar small empty"
            aria-label="View more profiles"
            onClick={() => navigate("/profile")}
          >
            +
          </button>
        </div>

        {isHost && (joinState?.pendingRequests.length ?? 0) > 0 && (
          <section className="activity-join-requests">
            <h2>Join requests</h2>
            {joinState?.pendingRequests.map((request) => (
              <article className="activity-join-request" key={request.id}>
                <Avatar name={request.name} photoUrl={request.photoUrl} size={36} />
                <div>
                  <strong>{request.name}</strong>
                  {request.message && <p>{request.message}</p>}
                </div>
                <div className="activity-join-request-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={respondingToUserId !== null}
                    onClick={() =>
                      void handleJoinRequestResponse(request.id, "declined")
                    }
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={respondingToUserId !== null}
                    onClick={() =>
                      void handleJoinRequestResponse(request.id, "accepted")
                    }
                  >
                    Accept
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}

        {joinError && (
          <p className="activity-join-error" role="alert">
            {joinError}
          </p>
        )}
        {joinFeedback && (
          <p className="activity-join-feedback" role="status">
            {joinFeedback}
          </p>
        )}
      </section>

      {!(isHost && savedDetails && !isActivityDay) && (
      <div className="sticky-action">
        <div className="sticky-action-group">
          {isHost ? (
            savedDetails ? (
              isActivityDay && (
                <Button
                  size="lg"
                  onClick={() => setQrOpen(true)}
                  disabled={confirmed || isLoadingConfirmation}
                >
                  {confirmed ? "Confirmed" : "Check in"}
                </Button>
              )
            ) : isActivityDay ? (
              <Button
                size="lg"
                onClick={() => setQrOpen(true)}
                disabled={confirmed}
              >
                {confirmed ? "Confirmed" : "Check in"}
              </Button>
            ) : (
              <Button size="lg" disabled>
                Check-in opens on the day
              </Button>
            )
          ) : isJoined ? (
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => void openSavedActivityChat()}
              >
                Open chat
              </Button>
              {isActivityDay ? (
                <Button
                  size="lg"
                  onClick={() => setQrOpen(true)}
                  disabled={confirmed || isLoadingConfirmation}
                >
                  {confirmed ? "Confirmed" : "Check in"}
                </Button>
              ) : (
                savedDetails && (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => setLeaveOpen(true)}
                    disabled={isUpdatingJoin}
                  >
                    Can’t make it
                  </Button>
                )
              )}
            </>
          ) : savedDetails?.id && joinState?.status === "pending" ? (
            <>
              <Button
                variant="secondary"
                onClick={() => void handleCancelJoinRequest()}
                size="lg"
                disabled={isUpdatingJoin}
              >
                Cancel request
              </Button>
              <Button size="lg" disabled>
                Requested
              </Button>
            </>
          ) : (
            <>
              {joinRequested && (
                <Button
                  variant="secondary"
                  onClick={() => void handleCancelJoinRequest()}
                  size="lg"
                  disabled={isUpdatingJoin}
                >
                  Cancel request
                </Button>
              )}
              <Button
                onClick={() => void handleJoinActivity()}
                size="lg"
                disabled={
                  joinRequested ||
                  isUpdatingJoin ||
                  (Boolean(savedDetails) &&
                    (isLoadingJoinState || !joinState || isFull))
                }
              >
                {joinRequested
                  ? "Requested"
                  : isUpdatingJoin
                    ? "Sending request…"
                    : isFull
                      ? "Full"
                      : "Count me in"}
              </Button>
            </>
          )}
        </div>
        {mockActivity && (
          <p className="activity-demo-notice" role="note">
            Demo activity — this request is only saved in this browser and is
            not sent to the host.
          </p>
        )}
      </div>
      )}

      {reportOpen && savedActivity && (
        <ReportDialog
          targetType="activity"
          targetId={savedActivity.id}
          targetLabel={`activity: ${savedActivity.title}`}
          onClose={() => setReportOpen(false)}
        />
      )}

      {leaveOpen && (
        <div className="report-dialog-backdrop" role="presentation">
          <form
            className="report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-dialog-title"
            onSubmit={(event) => {
              event.preventDefault()
              void handleLeaveActivity()
            }}
          >
            <h2 id="leave-dialog-title">
              Let {hostName} know you can’t make it?
            </h2>
            <p className="leave-sheet-note">
              Your spot opens up again and you’ll leave the group chat.
            </p>
            <label className="report-field">
              <span>Message for {hostName} (optional)</span>
              <textarea
                value={leaveMessage}
                maxLength={280}
                rows={3}
                placeholder="Sorry mate, something came up."
                onChange={(event) => setLeaveMessage(event.target.value)}
              />
            </label>
            <div className="report-dialog-actions">
              <button
                type="button"
                className="button button-secondary button-md"
                onClick={() => setLeaveOpen(false)}
                disabled={isUpdatingJoin}
              >
                Stay in
              </button>
              <button
                type="submit"
                className="button button-destructive button-md"
                disabled={isUpdatingJoin}
              >
                {isUpdatingJoin ? "Leaving…" : "Yes, I’m out"}
              </button>
            </div>
          </form>
        </div>
      )}

      {qrOpen && activity && (
        <div
          className="checkin-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Check in"
        >
          <div className="checkin-sheet">
            <div className="checkin-drag" aria-hidden="true" />
            <div className="checkin-header">
              <h3>
                {scanMode === "success" ? "Meetup confirmed" : "QR check-in"}
              </h3>
              <button
                type="button"
                aria-label="Close check-in"
                onClick={closeQr}
                className="close-button"
              >
                ×
              </button>
            </div>

            {scanMode === "qr" && (
              <>
                {qrError && <p className="activity-join-error" role="alert">{qrError}</p>}
                <div className="qr-card">
                  {savedActivity && !checkinCode ? (
                    qrError ? null : <p>Loading your check-in code…</p>
                  ) : <canvas ref={qrCanvasRef} />}
                  <div className="qr-meta">
                    <strong>{checkinUserName}</strong>
                    <span>{activity.title}</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => void startCameraScan()}
                  size="lg"
                  disabled={Boolean(savedActivity && !checkinCode)}
                >
                  Scan their code
                </Button>
              </>
            )}

            {scanMode === "camera" && (
              <div className="camera-stage">
                <div className="camera-frame">
                  <video ref={videoRef} playsInline muted />
                </div>
                <p>Scanning the other person’s code…</p>
                {qrError && <p className="activity-join-error" role="alert">{qrError}</p>}
                {qrError && (
                  <Button variant="secondary" onClick={() => setScanMode("qr")}>
                    Back to my code
                  </Button>
                )}
              </div>
            )}

            {scanMode === "success" && (
              <div className="success-stage">
                <div className="success-icon">✓</div>
                <p>Meetup confirmed. Enjoy it, mate.</p>
                {qrError && <p role="status">{qrError}</p>}
                {earnedPatches.length > 0 && (
                  <div className="earned-patches">
                    {earnedPatches.map((patch) => (
                      <span key={patch.id}>{patch.name}</span>
                    ))}
                  </div>
                )}
                <Button onClick={closeQr} size="lg">
                  Back to activity
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
