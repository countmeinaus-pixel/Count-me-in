import { ArrowLeft, Check, ChevronRight, MapPin, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { activities, currentUser } from '../data/mockData'
import {
  getEarnedPatchesForUser,
  hasConfirmedMeetupForUser,
  recordMeetupCheckIn,
} from '../lib/checkins'

export function ActivityDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const activity = activities.find((item) => item.id === Number(id))
  const [qrOpen, setQrOpen] = useState(false)
  const [scanMode, setScanMode] = useState<'qr' | 'camera' | 'success'>('qr')
  const [confirmed, setConfirmed] = useState(activity ? hasConfirmedMeetupForUser(currentUser.name, activity.id) : false)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!activity || !qrOpen || !qrCanvasRef.current) return

    const payload = JSON.stringify({
      type: 'count-me-in',
      user: currentUser.name,
      partner: activity.host,
      activityId: activity.id,
      activityTitle: activity.title,
    })

    QRCode.toCanvas(qrCanvasRef.current, payload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0a1621',
        light: '#ffffff',
      },
    }).catch(() => undefined)
  }, [activity, qrOpen])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  if (!activity) return null

  function closeQr() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setQrOpen(false)
    setScanMode('qr')
  }

  function confirmMeetup() {
    const hostCheckIn = recordMeetupCheckIn({
      user: currentUser.name,
      partner: activity.host,
      activityId: activity.id,
      activityTitle: activity.title,
      activityDate: activity.date,
    })

    recordMeetupCheckIn({
      user: activity.host,
      partner: currentUser.name,
      activityId: activity.id,
      activityTitle: activity.title,
      activityDate: activity.date,
    })

    if (hostCheckIn) {
      setConfirmed(true)
    }
  }

  async function startCameraScan() {
    setScanMode('camera')

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setTimeout(() => {
        confirmMeetup()
        setScanMode('success')
      }, 1200)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
        setScanMode('success')
      }, 1400)
    } catch {
      setTimeout(() => {
        confirmMeetup()
        setScanMode('success')
      }, 1100)
    }
  }

  const earnedPatches = getEarnedPatchesForUser(currentUser.name).filter((patch) => patch.earned).slice(0, 2)

  return (
    <main className="detail-layout">
      <section className="detail-hero">
        <img src={activity.hero} alt={activity.title} />
        <div className="hero-scrim" />
        <button className="icon-button hero-back" aria-label="Back" onClick={() => navigate(-1)} type="button">
          <ArrowLeft />
        </button>
        <button className="icon-button hero-share" aria-label="Share" type="button">
          <Share2 />
        </button>
      </section>

      <section className="detail-content">
        <p className="eyebrow">{activity.sport}</p>
        <h1>{activity.title}</h1>
        <p className="date">{activity.date}</p>

        <div className="facts-grid">
          <div><span>Depth</span><strong>5 to 10 m</strong></div>
          <div><span>Entry</span><strong>Shore dive</strong></div>
          <div><span>Duration</span><strong>2 hours</strong></div>
          <div><span>Spots</span><strong>2 of 4</strong></div>
        </div>

        <div className="meta-row">
          <MapPin />
          <div>
            <strong>{activity.place}</strong>
            <span>Port Noarlunga</span>
          </div>
          <ChevronRight />
        </div>

        <div className="host-card">
          <div className="avatar-large">M<span><Check /></span></div>
          <div className="grow">
            <p className="eyebrow">Hosted by</p>
            <strong>{activity.host}, 34</strong>
            <span>{activity.hostMeta}</span>
          </div>
          <ChevronRight />
        </div>

        <div className="section-heading compact">
          <h2>Who’s going</h2>
          <span>2 spots left</span>
        </div>

        <div className="going-row">
          {activity.attendees.map((name) => (
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
            onClick={() => navigate('/profile')}
          >
            +
          </button>
        </div>

        <div className="notes-box">
          <h2>From Matt</h2>
          <p>{activity.notes}</p>
        </div>
      </section>

      <div className="sticky-action">
        <div className="sticky-action-group">
          <Button variant="secondary" onClick={() => navigate('/chats')} size="lg">Open chat</Button>
          <Button onClick={() => setQrOpen(true)} size="lg">{confirmed ? 'Confirmed' : 'Check in'}</Button>
        </div>
      </div>

      {qrOpen && (
        <div className="checkin-modal" role="dialog" aria-modal="true" aria-label="Check in">
          <div className="checkin-sheet">
            <div className="checkin-drag" aria-hidden="true" />
            <div className="checkin-header">
              <h3>{scanMode === 'success' ? 'Meetup confirmed' : 'QR check-in'}</h3>
              <button type="button" aria-label="Close check-in" onClick={closeQr} className="close-button">×</button>
            </div>

            {scanMode === 'qr' && (
              <>
                <div className="qr-card">
                  <canvas ref={qrCanvasRef} />
                  <div className="qr-meta">
                    <strong>{currentUser.name}</strong>
                    <span>{activity.title}</span>
                  </div>
                </div>

                <Button variant="secondary" onClick={startCameraScan} size="lg">Scan their code</Button>
              </>
            )}

            {scanMode === 'camera' && (
              <div className="camera-stage">
                <div className="camera-frame">
                  <video ref={videoRef} playsInline muted />
                </div>
                <p>Scanning the other person’s code…</p>
              </div>
            )}

            {scanMode === 'success' && (
              <div className="success-stage">
                <div className="success-icon">✓</div>
                <p>Meetup confirmed. Enjoy it, mate.</p>
                {earnedPatches.length > 0 && (
                  <div className="earned-patches">
                    {earnedPatches.map((patch) => (
                      <span key={patch.id}>{patch.label}</span>
                    ))}
                  </div>
                )}
                <Button onClick={closeQr} size="lg">Back to activity</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
