import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  MapPin,
  Share2,
} from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
import { getSavedActivity, type SavedActivityDetails } from "../lib/activities"
import {
  getPatchProgressForUser,
  hasConfirmedMeetupForUser,
  recordMeetupCheckIn,
} from "../lib/checkins"

export function ActivityDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const mockActivity = activities.find((item) => String(item.id) === id)
  const [savedActivity, setSavedActivity] =
    useState<SavedActivityDetails | null>(null)
  const [isLoadingSavedActivity, setIsLoadingSavedActivity] = useState(
    Boolean(id && !mockActivity),
  )
  const [loadError, setLoadError] = useState("")
  const [qrOpen, setQrOpen] = useState(false)
  const [scanMode, setScanMode] = useState<"qr" | "camera" | "success">("qr")
  const [joinRequested, setJoinRequested] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(() =>
    mockActivity
      ? hasConfirmedMeetupForUser(currentUser.name, mockActivity.id)
      : false,
  )
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activity: Activity | SavedActivityDetails | null =
    mockActivity ?? savedActivity
  const isSavedActivity = savedActivity !== null

  useEffect(() => {
    if (!id) return
    if (mockActivity) {
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
    if (!mockActivity || !qrOpen || !qrCanvasRef.current) return

    const payload = JSON.stringify({
      type: "count-me-in",
      user: currentUser.name,
      partner: mockActivity.host,
      activityId: mockActivity.id,
      activityTitle: mockActivity.title,
    })

    QRCode.toCanvas(qrCanvasRef.current, payload, {
      width: 220,
      margin: 1,
      color: {
        dark: "#0a1621",
        light: "#ffffff",
      },
    }).catch(() => undefined)
  }, [mockActivity, qrOpen])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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

  function closeQr() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setQrOpen(false)
    setScanMode("qr")
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

  async function startCameraScan() {
    setScanMode("camera")

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setTimeout(() => {
        confirmMeetup()
        setScanMode("success")
      }, 1200)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        confirmMeetup()
        setScanMode("success")
      }, 1400)
    } catch {
      setTimeout(() => {
        confirmMeetup()
        setScanMode("success")
      }, 1100)
    }
  }

  const earnedPatches = getPatchProgressForUser(currentUser.name).filter(
    (patch) => patch.earned,
  )
  const savedDetails = savedActivity
  const sportFacts = savedDetails
    ? [
        ...Object.entries(savedDetails.sportDetails).map(([key, value]) => ({
          label: key.replace(/_/g, " "),
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
  const attendees = savedDetails
    ? [savedDetails.host]
    : (mockActivity?.attendees ?? [])
  const activityStart = savedDetails
    ? new Date(savedDetails.startsAt)
    : mockActivity?.startsAt
  const isActivityDay =
    activityStart !== undefined &&
    activityStart.getFullYear() === new Date().getFullYear() &&
    activityStart.getMonth() === new Date().getMonth() &&
    activityStart.getDate() === new Date().getDate()
  const isHost =
    savedDetails?.viewerIsHost ?? mockActivity?.host === currentUser.name
  const isJoined = isHost || attendees.includes(currentUser.name)
  const spotsLabel = savedDetails
    ? `${savedDetails.spotsTotal} ${
        savedDetails.spotsTotal === 1 ? "spot" : "spots"
      } available`
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
        >
          <Share2 />
        </button>
      </section>

      <section className="detail-content">
        <p className="eyebrow">{activity.sport}</p>
        <h1>{activity.title}</h1>
        <p className="date">{displayDate}</p>
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
          <div className="avatar-large">
            {savedDetails?.hostPhoto ? (
              <img src={savedDetails.hostPhoto} alt="" />
            ) : (
              hostName[0]
            )}
            {savedDetails?.hostVerified !== false && (
              <span>
                <Check />
              </span>
            )}
          </div>
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
          {attendees.map((name) => (
            <button
              key={name}
              type="button"
              className="avatar small"
              aria-label={`View ${name}'s profile`}
              onClick={() => navigate(`/profile/${encodeURIComponent(name)}`)}
            >
              {name[0]}
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

        <div className="notes-box">
          <h2>From {hostName}</h2>
          <p>{activity.notes}</p>
        </div>
      </section>

      <div className="sticky-action">
        <div className="sticky-action-group">
          {isHost ? (
            <Button size="lg" disabled>
              Manage activity
            </Button>
          ) : isJoined ? (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate("/chats")}
                size="lg"
              >
                Open chat
              </Button>
              <Button
                onClick={() => setQrOpen(true)}
                size="lg"
                disabled={!isActivityDay || confirmed || isSavedActivity}
                title={
                  !isActivityDay
                    ? "Check-in opens on the activity day."
                    : undefined
                }
              >
                {confirmed ? "Confirmed" : "Check in"}
              </Button>
            </>
          ) : (
            <>
              {joinRequested && (
                <Button
                  variant="secondary"
                  onClick={() => setJoinRequested(false)}
                  size="lg"
                >
                  Cancel request
                </Button>
              )}
              <Button
                onClick={() => setJoinRequested(true)}
                size="lg"
                disabled={joinRequested}
              >
                {joinRequested ? "Requested" : "Count me in"}
              </Button>
            </>
          )}
        </div>
      </div>

      {qrOpen && !isSavedActivity && (
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
                <div className="qr-card">
                  <canvas ref={qrCanvasRef} />
                  <div className="qr-meta">
                    <strong>{currentUser.name}</strong>
                    <span>{activity.title}</span>
                  </div>
                </div>

                <Button variant="secondary" onClick={startCameraScan} size="lg">
                  Scan their code
                </Button>
              </>
            )}
            {reportOpen && savedActivity && (
              <ReportDialog
                targetType="activity"
                targetId={savedActivity.id}
                targetLabel={`activity: ${savedActivity.title}`}
                onClose={() => setReportOpen(false)}
              />
            )}

            {scanMode === "camera" && (
              <div className="camera-stage">
                <div className="camera-frame">
                  <video ref={videoRef} playsInline muted />
                </div>
                <p>Scanning the other person’s code…</p>
              </div>
            )}

            {scanMode === "success" && (
              <div className="success-stage">
                <div className="success-icon">✓</div>
                <p>Meetup confirmed. Enjoy it, mate.</p>
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
