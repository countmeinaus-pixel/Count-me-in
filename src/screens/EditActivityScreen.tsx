import { activityLevels } from '../lib/activityFilters'
import { ArrowLeft, ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { KiteSizePicker } from '../components/KiteSizePicker'
import { LocationFields } from '../components/LocationFields'
import { getSavedActivity, type SavedActivityDetails } from '../lib/activities'
import {
  compressActivityCover,
  deleteActivityCover,
  getActivityCoverPath,
  uploadActivityCover,
} from '../lib/activityImages'
import { cancelActivity } from '../lib/activityParticipation'
import { formatCoordinates, isMissingLocationColumns, locationNotSavedMessage, parseCoordinates, parseMapPin } from '../lib/location'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

const levels = activityLevels
const defaultCancelMessage = 'Sorry lads, something came up and I can’t make it anymore. Hope to catch you next time.'

function getLocalDateTime(isoString: string) {
  const date = new Date(isoString)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function getErrorMessage(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return error instanceof Error ? error.message : 'Unable to update this activity.'
  }

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Unable to update this activity.'
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  return [message, hint].filter(Boolean).join(' ')
}

export function EditActivityScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const [activity, setActivity] = useState<SavedActivityDetails | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelMessage, setCancelMessage] = useState(defaultCancelMessage)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [suburb, setSuburb] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [spotsTotal, setSpotsTotal] = useState(1)
  const [level, setLevel] = useState(levels[0])
  const [notes, setNotes] = useState('')
  const [autoAccept, setAutoAccept] = useState(false)
  const [sportDetails, setSportDetails] = useState<Record<string, string>>({})
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [useDefaultCover, setUseDefaultCover] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!coverPreviewUrl) return
    return () => URL.revokeObjectURL(coverPreviewUrl)
  }, [coverPreviewUrl])

  useEffect(() => {
    let active = true

    async function loadActivity() {
      try {
        if (!supabase) throw new Error(getSupabaseSetupHint())
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) {
          navigate('/login', { replace: true })
          return
        }

        const saved = await getSavedActivity(id ?? '')
        if (!saved) throw new Error('This activity could not be found.')
        if (!saved.viewerCanEdit) {
          throw new Error('Only the activity host or an admin can edit this activity.')
        }

        if (!active) return
        setActivity(saved)
        setUserId(userData.user.id)
        setTitle(saved.title)
        setStartsAt(getLocalDateTime(saved.startsAt))
        setDurationHours(String(saved.durationMinutes / 60))
        setMeetingPoint(saved.meetingPoint)
        setSuburb(saved.suburb)
        setAddress(saved.address)
        setCoordinates(formatCoordinates(saved.latitude, saved.longitude))
        setSpotsTotal(saved.spotsTotal)
        setLevel(saved.level)
        setNotes(saved.notes)
        setAutoAccept(saved.autoAccept)
        setSportDetails(saved.sportDetails)
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadActivity()
    return () => {
      active = false
    }
  }, [id, navigate])

  function handleCoverSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the activity banner.')
      return
    }

    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
    setUseDefaultCover(false)
    setError('')
    setFeedback('')
  }

  function resetCover() {
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setUseDefaultCover(true)
    setFeedback('')
  }

  async function saveActivity() {
    if (!supabase || !activity || !userId) return
    const start = new Date(startsAt)
    const durationMinutes = Math.round(Number(durationHours) * 60)
    if (
      !title.trim() ||
      title.trim().length > 120 ||
      Number.isNaN(start.getTime()) ||
      start <= new Date() ||
      durationMinutes < 1 ||
      durationMinutes > 1440 ||
      !meetingPoint.trim() ||
      !suburb.trim() ||
      (coordinates.trim() !== '' && !parseMapPin(coordinates)) ||
      notes.length > 300
    ) {
      setError('Check the title, future date and time, duration, location, map pin and notes.')
      return
    }

    setIsSaving(true)
    setError('')
    setFeedback('')
    let uploadedCoverPath: string | null = null
    let savedChanges = false

    try {
      let coverImageUrl = activity.coverImageUrl
      if (coverFile) {
        const upload = await uploadActivityCover(await compressActivityCover(coverFile), userId)
        uploadedCoverPath = upload.path
        coverImageUrl = upload.url
      } else if (useDefaultCover) {
        coverImageUrl = null
      }

      const activityChanges = {
        title: title.trim(),
        starts_at: start.toISOString(),
        duration_minutes: durationMinutes,
        meeting_point: meetingPoint.trim(),
        suburb: suburb.trim(),
        spots_total: spotsTotal,
        level_wanted: level,
        notes: notes.trim(),
        auto_accept: autoAccept,
        sport_details: sportDetails,
        cover_image_url: coverImageUrl,
        updated_at: new Date().toISOString(),
      }
      const pin = parseMapPin(coordinates)
      let { error: updateError } = await supabase
        .from('activities')
        .update({
          ...activityChanges,
          address: address.trim(),
          latitude: pin?.latitude ?? null,
          longitude: pin?.longitude ?? null,
        })
        .eq('id', activity.id)

      // Before the location update is run in Supabase, save without address and map pin.
      const locationSkipped = Boolean(updateError && isMissingLocationColumns(updateError))
      if (locationSkipped) {
        ({ error: updateError } = await supabase
          .from('activities')
          .update(activityChanges)
          .eq('id', activity.id))
      }

      if (updateError) throw updateError
      savedChanges = true

      const oldCoverPath = getActivityCoverPath(activity.coverImageUrl)
      let cleanupWarning = ''
      if (oldCoverPath && oldCoverPath !== uploadedCoverPath && (coverFile || useDefaultCover)) {
        try {
          await deleteActivityCover(oldCoverPath, userId)
        } catch (cleanupError) {
          cleanupWarning = `Activity updated, but the old banner could not be removed from storage: ${getErrorMessage(cleanupError)}`
        }
      }

      navigate(`/activity/${activity.id}`, {
        replace: true,
        state: locationSkipped && (address.trim() || pin)
          ? { statusMessage: locationNotSavedMessage }
          : cleanupWarning ? { statusMessage: cleanupWarning } : undefined,
      })
    } catch (saveError) {
      const message = getErrorMessage(saveError)
      if (uploadedCoverPath && !savedChanges) {
        try {
          await deleteActivityCover(uploadedCoverPath, userId)
          setError(message)
        } catch (cleanupError) {
          setError(`${message} The unused uploaded banner could not be removed: ${getErrorMessage(cleanupError)}`)
        }
      } else {
        setError(message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCancelActivity() {
    if (!activity) return
    setIsCancelling(true)
    setCancelError('')
    try {
      const notifiedCount = await cancelActivity(activity.id, cancelMessage)
      let statusMessage = notifiedCount === 0
        ? 'Activity cancelled and taken down.'
        : `Activity cancelled. We've let ${notifiedCount === 1 ? '1 member' : `${notifiedCount} members`} know.`
      const coverPath = getActivityCoverPath(activity.coverImageUrl)
      if (coverPath && supabase) {
        try {
          const { data } = await supabase.auth.getUser()
          if (data.user) await deleteActivityCover(coverPath, data.user.id)
        } catch {
          statusMessage += ' The banner photo could not be removed from storage.'
        }
      }
      window.dispatchEvent(new Event('count-me-in-chat-unread-changed'))
      navigate('/activities', { replace: true, state: { statusMessage } })
    } catch (cancelFailure) {
      setCancelError(cancelFailure instanceof Error ? cancelFailure.message : 'Unable to cancel this activity.')
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return <main className="screen create-wizard"><p className="text-[var(--text-secondary)]">Loading activity…</p></main>
  }

  if (!activity || error && !title) {
    return (
      <main className="screen create-wizard">
        <p className="wizard-error" role="alert">{error || 'This activity could not be found.'}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
      </main>
    )
  }

  const coverSource = coverPreviewUrl ?? (useDefaultCover ? activity.hero : activity.coverImageUrl ?? activity.hero)

  return (
    <main className="screen create-wizard edit-activity-page">
      <header className="create-wizard-header">
        <button type="button" className="wizard-cancel" onClick={() => navigate(`/activity/${activity.id}`)}>
          <ArrowLeft aria-hidden="true" /> Back to activity
        </button>
        <div className="wizard-title">
          <p className="eyebrow">Activity settings</p>
          <h1>Edit activity</h1>
        </div>
      </header>

      {error && <p className="wizard-error" role="alert">{error}</p>}
      {feedback && <p className="edit-form-status" role="status">{feedback}</p>}

      <section className="wizard-section">
        <div className="wizard-section-heading">
          <h2>{activity.sport}</h2>
          <p>Update the plan and save your changes.</p>
        </div>

        <div className="wizard-cover-preview">
          <img src={coverSource} alt={`${activity.sport} activity banner preview`} />
          <div>
            <span>Activity banner</span>
            <strong>{coverFile ? 'Your selected image' : useDefaultCover || !activity.coverImageUrl ? `Default ${activity.sport} image` : 'Current banner image'}</strong>
          </div>
        </div>
        <div className="wizard-cover-controls">
          <input ref={coverInputRef} className="sr-only" type="file" accept="image/*" onChange={handleCoverSelect} aria-label="Choose an activity banner image" />
          <div className="wizard-cover-buttons">
            <Button type="button" variant="secondary" onClick={() => coverInputRef.current?.click()} disabled={isSaving}>
              <ImagePlus /> {activity.coverImageUrl || coverFile ? 'Change banner image' : 'Add banner image'}
            </Button>
            {(activity.coverImageUrl || coverFile) && (
              <Button type="button" variant="ghost" onClick={resetCover} disabled={isSaving}>Use default image</Button>
            )}
          </div>
          <p className="wizard-cover-guidance">Recommended image: 1200 × 600 px (2:1). We resize the long edge to 1200 px and compress it to JPEG when you save.</p>
        </div>

        <div className="create-form edit-activity-form">
          <label className="field">
            <span>Activity title</span>
            <input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="wizard-field-grid">
            <label className="field">
              <span>Date and time</span>
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </label>
            <label className="field">
              <span>Duration (hours)</span>
              <input type="number" min="0.25" max="24" step="0.25" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} />
            </label>
          </div>
          <LocationFields
            meetingPoint={meetingPoint}
            suburb={suburb}
            address={address}
            coordinates={coordinates}
            onMeetingPointChange={setMeetingPoint}
            onSuburbChange={setSuburb}
            onAddressChange={setAddress}
            onCoordinatesChange={setCoordinates}
          />
          <div className="field">
            <span>Group size</span>
            <div className="wizard-group-size">
              <button type="button" className={spotsTotal === 1 ? 'selected' : ''} onClick={() => setSpotsTotal(1)}>1 buddy</button>
              <button type="button" className={spotsTotal > 1 ? 'selected' : ''} onClick={() => setSpotsTotal((value) => value > 1 ? value : 2)}>Small group</button>
              {spotsTotal > 1 && (
                <div className="wizard-stepper" aria-label="Number of buddy spots">
                  <button type="button" aria-label="Remove one spot" onClick={() => setSpotsTotal((value) => Math.max(2, value - 1))}>−</button>
                  <strong>{spotsTotal} spots</strong>
                  <button type="button" aria-label="Add one spot" onClick={() => setSpotsTotal((value) => Math.min(8, value + 1))}>+</button>
                </div>
              )}
            </div>
          </div>
          <label className="field">
            <span>Level wanted</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              {levels.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {activity.sport === 'Kitesurfing' && !('kite_sizes' in sportDetails) && (
            <KiteSizePicker
              value=""
              onChange={(value) => setSportDetails((current) => ({ ...current, kite_sizes: value }))}
            />
          )}
          {Object.entries(sportDetails).map(([key, value]) => key === 'kite_sizes' ? (
            <KiteSizePicker
              key={key}
              value={value}
              onChange={(nextValue) => setSportDetails((current) => ({ ...current, kite_sizes: nextValue }))}
            />
          ) : (
            <label className="field" key={key}>
              <span>{key.replace(/_/g, ' ')}</span>
              <input
                value={value}
                onChange={(event) => setSportDetails((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
          <label className="field">
            <span>Notes <small>(optional, max 300 characters)</small></span>
            <textarea rows={4} maxLength={300} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <small className="field-helper">{notes.length}/300</small>
          </label>
          <label className="toggle-row wizard-auto-accept">
            <span><strong>Auto-accept</strong><small>Accept join requests without checking first.</small></span>
            <input type="checkbox" checked={autoAccept} onChange={(event) => setAutoAccept(event.target.checked)} />
          </label>
        </div>
      </section>

      <footer className="wizard-actions">
        <Button type="button" variant="secondary" onClick={() => navigate(`/activity/${activity.id}`)} disabled={isSaving}>Cancel</Button>
        <Button type="button" size="lg" onClick={() => void saveActivity()} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </footer>

      {new Date(activity.startsAt) > new Date() && (
        <section className="edit-activity-cancel">
          <h2>Cancel activity</h2>
          <p>Can’t make it anymore? Everyone who’s going or asked to join gets a notification, and the activity and its group chat are taken down for good.</p>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={() => {
              setCancelError('')
              setCancelMessage(defaultCancelMessage)
              setCancelOpen(true)
            }}
            disabled={isSaving}
          >
            Cancel activity
          </Button>
        </section>
      )}

      {cancelOpen && (
        <div className="report-dialog-backdrop" role="presentation">
          <form
            className="report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-activity-dialog-title"
            onSubmit={(event) => {
              event.preventDefault()
              void handleCancelActivity()
            }}
          >
            <h2 id="cancel-activity-dialog-title">Cancel this activity?</h2>
            <p className="leave-sheet-note">This can’t be undone. We’ll let everyone who’s going or asked to join know.</p>
            <label className="report-field">
              <span>Message for the group</span>
              <textarea
                value={cancelMessage}
                maxLength={280}
                rows={3}
                placeholder="Write a message, or leave it empty."
                onChange={(event) => setCancelMessage(event.target.value)}
              />
              <small className="field-helper">
                We send this with the notification. Change it or write your own.
              </small>
            </label>
            {cancelError && <p className="activity-join-error" role="alert">{cancelError}</p>}
            <div className="report-dialog-actions">
              <button
                type="button"
                className="button button-secondary button-md"
                onClick={() => setCancelOpen(false)}
                disabled={isCancelling}
              >
                Keep it
              </button>
              <button type="submit" className="button button-destructive button-md" disabled={isCancelling}>
                {isCancelling ? 'Cancelling…' : 'Cancel activity'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
