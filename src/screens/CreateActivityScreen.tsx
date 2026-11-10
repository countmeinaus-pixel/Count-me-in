import {
  Anchor,
  ArrowLeft,
  Bike,
  Check,
  ChevronRight,
  Dumbbell,
  Fish,
  Footprints,
  ImagePlus,
  MapPin,
  Mountain,
  MountainSnow,
  Plus,
  Sailboat,
  Waves,
  Wind,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { KiteSizePicker } from '../components/KiteSizePicker'
import { LocationFields } from '../components/LocationFields'
import { activities, getDefaultActivityHero } from '../data/mockData'
import { compressActivityCover, deleteActivityCover, uploadActivityCover } from '../lib/activityImages'
import { isMissingLocationColumns, parseCoordinates } from '../lib/location'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

type SportOption = {
  id: number
  name: string
  icon: string | null
  profileSkill: string | null
}
type InviteSuggestion = { id: string; first_name: string; suburb: string; photo_url: string | null }
type PresetField = {
  key: string
  label: string
  placeholder?: string
  options?: string[]
  type?: 'text' | 'number' | 'textarea' | 'kite_sizes'
  min?: number
  max?: number
  step?: number
  maxLength?: number
}

const steps = ['Sport', 'Details', 'Level', 'Add people', 'Review']
const levels = ['Beginner friendly', 'Intermediate', 'Experienced']
const presetFields: Record<string, PresetField[]> = {
  Spearfishing: [
    { key: 'spot', label: 'Spot', placeholder: 'For example, Port Noarlunga reef' },
    { key: 'target_depth', label: 'Depth', options: ['0 to 5 m', '5 to 10 m', '10 to 15 m', '15 m+'] },
    { key: 'entry', label: 'Entry', options: ['Shore dive', 'Boat dive'] },
    { key: 'duration_hours', label: 'Duration (hours)', type: 'number', min: 0.25, max: 24, step: 0.25 },
    { key: 'own_gear', label: 'Own gear needed', options: ['Yes', 'No'] },
  ],
  Kitesurfing: [
    { key: 'spot', label: 'Spot', placeholder: 'For example, Brighton' },
    { key: 'discipline', label: 'Discipline', options: ['Freeride', 'Freestyle', 'Foil', 'Wave'] },
    { key: 'kite_sizes', label: 'Kite sizes', type: 'kite_sizes' },
    { key: 'duration_hours', label: 'Duration (hours)', type: 'number', min: 0.25, max: 24, step: 0.25 },
  ],
  Hiking: [
    { key: 'destination', label: 'Trail or destination', placeholder: 'For example, Mount Lofty Summit' },
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 200, step: 0.1 },
    { key: 'elevation', label: 'Elevation', options: ['Flat', 'Moderate', 'Steep'] },
    { key: 'duration_hours', label: 'Estimated duration (hours)', type: 'number', min: 0.25, max: 24, step: 0.25 },
  ],
  Running: [
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 200, step: 0.1 },
    { key: 'pace', label: 'Pace', options: ['Easy 6:30+ /km', 'Steady 5:30 to 6:30', 'Fast under 5:30'] },
    { key: 'terrain', label: 'Terrain', options: ['Road', 'Trail', 'Track'] },
  ],
  Surfing: [
    { key: 'spot', label: 'Spot', placeholder: 'For example, Middleton Point' },
    { key: 'board', label: 'Board', options: ['Shortboard', 'Longboard', 'Any'] },
    { key: 'duration_hours', label: 'Duration (hours)', type: 'number', min: 0.25, max: 24, step: 0.25 },
  ],
  Swimming: [
    { key: 'location', label: 'Location', options: ['Ocean', 'Pool'] },
    { key: 'distance_m', label: 'Distance (m)', type: 'number', min: 1, max: 100000, step: 50 },
    { key: 'pace', label: 'Pace', options: ['Relaxed', 'Steady', 'Training'] },
  ],
  Gym: [
    { key: 'gym_name', label: 'Gym name', placeholder: 'For example, your local gym' },
    { key: 'focus', label: 'Focus', options: ['Strength', 'Hypertrophy', 'Cardio', 'Functional'] },
    { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', min: 15, max: 1440, step: 15 },
  ],
  'Mountain biking': [
    { key: 'trail_park', label: 'Trail park', placeholder: 'For example, Eagle Mountain Bike Park' },
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 200, step: 0.1 },
    { key: 'trail_grade', label: 'Trail grade', options: ['Green', 'Blue', 'Black'] },
  ],
  'Road cycling': [
    { key: 'route', label: 'Route', placeholder: 'For example, coast to coast' },
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 500, step: 0.1 },
    { key: 'average_speed', label: 'Average speed', options: ['Social under 25 km/h', 'Steady 25 to 30 km/h', 'Fast 30+ km/h'] },
  ],
  'SUP / kayak': [
    { key: 'location', label: 'Location', placeholder: 'For example, West Lakes' },
    { key: 'craft', label: 'Craft', options: ['SUP', 'Kayak'] },
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 200, step: 0.1 },
  ],
  'Scuba diving': [
    { key: 'dive_site', label: 'Dive site', placeholder: 'For example, Rapid Bay jetty' },
    { key: 'max_depth_m', label: 'Max depth (m)', type: 'number', min: 0, max: 100, step: 1 },
    { key: 'certification', label: 'Certification needed', options: ['Open Water', 'Advanced', 'Rescue or higher'] },
  ],
  'Climbing / bouldering': [
    { key: 'venue', label: 'Venue', placeholder: 'For example, Beyond Bouldering' },
    { key: 'setting', label: 'Setting', options: ['Indoor', 'Outdoor'] },
    { key: 'grade_range', label: 'Grade range', placeholder: 'For example, V2 to V4' },
  ],
  'Open activity': [
    { key: 'activity_name', label: 'Activity name', placeholder: 'For example, Fishing off Semaphore jetty', maxLength: 120 },
    { key: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
  ],
}

const sportIcons: Record<string, ComponentType<{ className?: string }>> = {
  footprints: Footprints,
  mountain: Mountain,
  fish: Fish,
  wind: Wind,
  waves: Waves,
  dumbbell: Dumbbell,
  bike: Bike,
  sailboat: Sailboat,
  anchor: Anchor,
  'mountain-snow': MountainSnow,
  plus: Plus,
}

function getLocalDateMinimum() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function getSuggestedTitle(sport: string, suburb: string) {
  return `${sport} at ${suburb || 'Adelaide'}`
}

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`
  if (minutes < 60) return `${minutes} minutes`
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) {
    return error instanceof Error ? error.message : fallback
  }

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : error instanceof Error
      ? error.message
      : fallback
  const code = 'code' in error && typeof error.code === 'string' ? `Code: ${error.code}` : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  return [message, code, hint].filter(Boolean).join(' ')
}

export function CreateActivityScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const preselectedSport = searchParams.get('sport')
  const [step, setStep] = useState(1)
  const [furthestStep, setFurthestStep] = useState(1)
  const [sports, setSports] = useState<SportOption[]>([])
  const [inviteSuggestions, setInviteSuggestions] = useState<InviteSuggestion[]>([])
  const [selectedSport, setSelectedSport] = useState<SportOption | null>(null)
  const [userId, setUserId] = useState('')
  const [suburb, setSuburb] = useState('')
  const [title, setTitle] = useState('')
  const [titleEdited, setTitleEdited] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [durationHours, setDurationHours] = useState('2')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [spotsTotal, setSpotsTotal] = useState(1)
  const [level, setLevel] = useState('Beginner friendly')
  const [notes, setNotes] = useState('')
  const [autoAccept, setAutoAccept] = useState(false)
  const [sportDetails, setSportDetails] = useState<Record<string, string>>({})
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [inviteSearch, setInviteSearch] = useState('')
  const [selectedInvites, setSelectedInvites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState('')
  const [sportChangeNotice, setSportChangeNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadFormData() {
      const client = supabase
      if (!client) {
        setError(getSupabaseSetupHint())
        setIsLoading(false)
        return
      }

      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError) {
        if (userError.name === 'AuthSessionMissingError') {
          navigate('/login', { replace: true })
          return
        }
        if (active) {
          setError(userError.message)
          setIsLoading(false)
        }
        return
      }
      if (!userData.user) {
        navigate('/login', { replace: true })
        return
      }

      const user = userData.user
      const [profileResult, profileSportsResult, inviteesResult, catalogResult] = await Promise.all([
        client.from('profiles').select('suburb').eq('id', user.id).maybeSingle(),
        client.from('profile_sports').select('sport_id, skill').eq('profile_id', user.id),
        client
          .from('profiles')
          .select('id, first_name, suburb, photo_url')
          .neq('id', user.id)
          .order('first_name')
          .limit(50),
        client.from('sports').select('id, name, icon').order('name'),
      ])

      if (!active) return
      if (profileResult.error || profileSportsResult.error || inviteesResult.error || catalogResult.error) {
        setError(
          profileResult.error?.message ??
            profileSportsResult.error?.message ??
            inviteesResult.error?.message ??
            catalogResult.error?.message ??
            'Unable to load your activity details.',
        )
        setIsLoading(false)
        return
      }

      const profileSuburb = profileResult.data?.suburb ?? ''
      setSuburb(profileSuburb)
      setUserId(user.id)
      setInviteSuggestions(inviteesResult.data ?? [])

      const profileSports = profileSportsResult.data ?? []
      const skillBySport = new Map(profileSports.map((item) => [item.sport_id, item.skill]))
      const availableSports = (catalogResult.data ?? [])
        .map((sport) => ({
          id: sport.id,
          name: sport.name,
          icon: sport.icon,
          profileSkill: skillBySport.get(sport.id) ?? null,
        }))
        .sort((left, right) =>
          Number(right.profileSkill !== null) - Number(left.profileSkill !== null) ||
          left.name.localeCompare(right.name),
        )

      setSports(availableSports)
      const initialSport = availableSports.find((sport) => sport.name === preselectedSport)
      if (initialSport) {
        setSelectedSport(initialSport)
        setTitle(initialSport.name === 'Open activity' ? '' : getSuggestedTitle(initialSport.name, profileSuburb))
      }

      const requestedInvitees = searchParams.getAll('invite')
      if (requestedInvitees.length > 0) {
        const matched = (inviteesResult.data ?? [])
          .filter((person) => requestedInvitees.includes(person.first_name))
          .map((person) => person.id)
        setSelectedInvites(matched)
      }
      setIsLoading(false)
    }

    void loadFormData()
    return () => {
      active = false
    }
  }, [navigate, preselectedSport, searchParams])

  const filteredInviteSuggestions = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase()
    return inviteSuggestions.filter((person) =>
      !selectedInvites.includes(person.id) &&
      (!query || `${person.first_name} ${person.suburb}`.toLowerCase().includes(query)),
    )
  }, [inviteSearch, inviteSuggestions, selectedInvites])

  const selectedInvitees = inviteSuggestions.filter((person) => selectedInvites.includes(person.id))
  const sportImage = selectedSport ? getDefaultActivityHero(selectedSport.name) : activities[0].hero
  const activityCoverImage = coverPreviewUrl ?? sportImage
  const dateTimeValue = date && time ? new Date(`${date}T${time}`).getTime() : Number.NaN
  const validDetails =
    title.trim().length > 0 &&
    title.trim().length <= 120 &&
    date !== '' &&
    time !== '' &&
    dateTimeValue > Date.now() &&
    Number(durationHours) >= 0.25 &&
    Number(durationHours) <= 24 &&
    meetingPoint.trim().length > 0 &&
    suburb.trim().length > 0 &&
    (coordinates.trim() === '' || parseCoordinates(coordinates) !== null) &&
    notes.length <= 300

  useEffect(() => {
    if (!coverPreviewUrl) return
    return () => URL.revokeObjectURL(coverPreviewUrl)
  }, [coverPreviewUrl])

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
    setError('')
  }

  function handleRemoveCover() {
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setError('')
  }

  function chooseSport(sport: SportOption) {
    if (selectedSport && selectedSport.id !== sport.id) {
      const hadSportDetails = Object.values(sportDetails).some((value) => value.trim() !== '')
      setSportChangeNotice(
        hadSportDetails
          ? `You switched to ${sport.name}. Fill in the ${sport.name} details again in the next step.`
          : '',
      )
      setFurthestStep((current) => Math.min(current, 2))
    }
    setSelectedSport(sport)
    setSportDetails({})
    setTitleEdited(false)
    setTitle(sport.name === 'Open activity' ? '' : getSuggestedTitle(sport.name, suburb))
    setDurationHours(sport.name === 'Gym' ? '1' : '2')
  }

  function updateSportDetail(key: string, value: string) {
    setSportDetails((current) => ({ ...current, [key]: value }))
    if (key === 'activity_name') setTitle(value)
    if (key === 'duration_hours') setDurationHours(value)
    if (key === 'duration_minutes') setDurationHours(value ? String(Number(value) / 60) : '')
  }

  function updateSuburb(value: string) {
    setSuburb(value)
    if (!titleEdited && selectedSport && selectedSport.name !== 'Open activity') {
      setTitle(getSuggestedTitle(selectedSport.name, value))
    }
  }

  function toggleInvite(userIdToToggle: string) {
    setSelectedInvites((current) => current.includes(userIdToToggle)
      ? current.filter((id) => id !== userIdToToggle)
      : [...current, userIdToToggle])
  }

  function canContinue() {
    if (step === 1) return selectedSport !== null
    if (step === 2) return validDetails
    return true
  }

  // A visited step is reachable when every step before it is filled in.
  function canOpenStep(targetStep: number) {
    if (targetStep < 1 || targetStep > furthestStep) return false
    if (targetStep > 1 && !selectedSport) return false
    if (targetStep > 2 && !validDetails) return false
    return true
  }

  function goToStep(nextStep: number) {
    if (!canOpenStep(nextStep)) return
    setStep(nextStep)
    setError('')
    if (nextStep !== 2) setSportChangeNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (step <= 1) return
    setStep(step - 1)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function continueToNextStep() {
    if (!canContinue() || step >= steps.length) return
    const nextStep = step + 1
    setStep(nextStep)
    setFurthestStep((current) => Math.max(current, nextStep))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelActivity() {
    if (window.confirm('Discard this activity?')) navigate('/')
  }

  async function postActivity() {
    const client = supabase
    if (!client || !selectedSport || !userId) {
      setError(client ? 'Your session expired. Please sign in again.' : getSupabaseSetupHint())
      return
    }

    setIsPosting(true)
    setError('')

    let uploadedCoverPath: string | null = null
    let activityCreated = false

    try {
      const start = new Date(`${date}T${time}`)
      const durationMinutes = Math.round(Number(durationHours) * 60)
      let coverImageUrl = getDefaultActivityHero(selectedSport.name)
      if (coverFile) {
        const uploadedCover = await uploadActivityCover(
          await compressActivityCover(coverFile),
          userId,
        )
        uploadedCoverPath = uploadedCover.path
        coverImageUrl = uploadedCover.url
      }

      const activityRow = {
        host_id: userId,
        sport_id: selectedSport.id,
        title: title.trim(),
        starts_at: start.toISOString(),
        duration_minutes: durationMinutes,
        meeting_point: meetingPoint.trim(),
        suburb: suburb.trim(),
        spots_total: spotsTotal,
        level_wanted: level,
        notes: notes.trim(),
        auto_accept: autoAccept,
        sport_details: selectedSport.name === 'Open activity'
          ? Object.fromEntries(Object.entries(sportDetails).filter(([key]) => key !== 'activity_name'))
          : sportDetails,
        cover_image_url: coverImageUrl,
      }
      const pin = parseCoordinates(coordinates)
      let { data: createdActivity, error: createError } = await client
        .from('activities')
        .insert({
          ...activityRow,
          address: address.trim(),
          latitude: pin?.latitude ?? null,
          longitude: pin?.longitude ?? null,
        })
        .select('id')
        .single()

      // Before the location update is run in Supabase, save without address and map pin.
      if (createError && isMissingLocationColumns(createError)) {
        ({ data: createdActivity, error: createError } = await client
          .from('activities')
          .insert(activityRow)
          .select('id')
          .single())
      }

      if (createError || !createdActivity) throw createError ?? new Error('Unable to post this activity.')
      activityCreated = true

      if (selectedInvites.length > 0) {
        const { error: inviteError } = await client.from('activity_invites').insert(
          selectedInvites.map((inviteeId) => ({
            activity_id: createdActivity.id,
            invitee_id: inviteeId,
            invited_by: userId,
          })),
        )

        if (inviteError) {
          const { error: rollbackError } = await client
            .from('activities')
            .delete()
            .eq('id', createdActivity.id)
            .eq('host_id', userId)

          if (rollbackError) {
            throw new Error(
              `The activity was saved, but invitations could not be saved or rolled back. Check your activities before trying again. ${inviteError.message} ${rollbackError.message}`,
            )
          }
          activityCreated = false
          throw inviteError
        }
      }

      navigate(`/activity/${createdActivity.id}`)
    } catch (postError) {
      const message = getErrorMessage(postError, 'Unable to post this activity.')
      if (uploadedCoverPath && !activityCreated) {
        try {
          await deleteActivityCover(uploadedCoverPath, userId)
          setError(message)
        } catch (cleanupError) {
          const cleanupMessage = getErrorMessage(cleanupError, 'Unable to remove the uploaded banner.')
          setError(`${message} The unused banner could not be removed from storage: ${cleanupMessage}`)
        }
      } else {
        setError(message)
      }
    } finally {
      setIsPosting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="screen create-wizard">
        <p className="eyebrow">Create activity</p>
        <p className="text-[var(--text-secondary)]">Loading your sports…</p>
      </main>
    )
  }

  if (error && sports.length === 0) {
    return (
      <main className="screen create-wizard">
        <p className="wizard-error" role="alert">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Back to home</Button>
      </main>
    )
  }

  if (sports.length === 0 && !error) {
    return (
      <main className="screen create-wizard">
        <header className="page-title">
          <p className="eyebrow">Create activity</p>
          <h1>Activities are unavailable</h1>
        </header>
        <p className="text-[var(--text-secondary)]">We could not find any activity types. Please try again later.</p>
        <Button onClick={() => navigate('/')} size="lg">Back to home</Button>
      </main>
    )
  }

  const preset = selectedSport ? presetFields[selectedSport.name] ?? [] : []
  const hasPresetDuration = preset.some((field) => field.key === 'duration_hours' || field.key === 'duration_minutes')
  const SelectedSportIcon = selectedSport ? sportIcons[selectedSport.icon ?? ''] ?? Plus : Plus

  return (
    <main className="screen create-wizard">
      <header className="create-wizard-header">
        <button type="button" className="wizard-cancel" onClick={cancelActivity}>Cancel</button>
        <div className="wizard-title">
          <p className="eyebrow">Start a callout</p>
          <h1>Create activity</h1>
        </div>
      </header>

      <nav className="wizard-progress" aria-label="Activity creation progress">
        {steps.map((label, index) => {
          const stepNumber = index + 1
          const isCurrent = stepNumber === step
          const isCompleted = !isCurrent && stepNumber <= furthestStep && canOpenStep(stepNumber)
          return (
            <button
              key={label}
              type="button"
              className={`wizard-progress-step ${isCompleted ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => goToStep(stepNumber)}
              disabled={!isCompleted}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={isCompleted ? `Go to ${label} step` : `${label}${isCurrent ? ', current step' : ''}`}
              title={isCompleted ? `Go to ${label}` : undefined}
            >
              <span>{isCompleted ? <Check /> : stepNumber}</span>
              <small>{label}</small>
            </button>
          )
        })}
      </nav>
      <p className="wizard-step-count">Step {step} of {steps.length}</p>
      {furthestStep > 1 && <p className="wizard-progress-hint">Tap a step above to jump back to it. Everything you filled in stays.</p>}

      {error && <p className="wizard-error" role="alert">{error}</p>}
      {sportChangeNotice && step <= 2 && <p className="wizard-notice" role="status">{sportChangeNotice}</p>}

      {step === 1 && (
        <section className="wizard-section" aria-labelledby="sport-step-title">
          <div className="wizard-section-heading">
            <h2 id="sport-step-title">What are you keen to do?</h2>
            <p>Choose from all sports, or create an open activity. Your profile sports are shown first.</p>
          </div>
          <div className="wizard-sport-grid">
            {sports.map((sport) => {
              const Icon = sportIcons[sport.icon ?? ''] ?? Plus
              const isSelected = selectedSport?.id === sport.id
              return (
                <button
                  key={sport.id}
                  type="button"
                  className={`wizard-sport-tile ${isSelected ? 'selected' : ''}`}
                  onClick={() => chooseSport(sport)}
                  aria-pressed={isSelected}
                >
                  {isSelected && <span className="wizard-sport-check"><Check /></span>}
                  <Icon />
                  <strong>{sport.name}</strong>
                  <small>{sport.profileSkill ? `Your level: ${sport.profileSkill}` : 'Available to choose'}</small>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 2 && selectedSport && (
        <section className="wizard-section" aria-labelledby="details-step-title">
          <div className="wizard-section-heading">
            <h2 id="details-step-title">The details</h2>
            <p>Set the plan. You can update it later.</p>
          </div>

          <div className="wizard-cover-preview">
            <img src={activityCoverImage} alt={`${selectedSport.name} activity banner preview`} />
            <div>
              <span>Activity banner</span>
              <strong>{coverFile ? 'Your selected image' : `Default ${selectedSport.name} image`}</strong>
            </div>
          </div>

          <div className="create-form">
            <div className="wizard-cover-controls">
              <input
                ref={coverInputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                aria-label="Choose an activity banner image"
              />
              <div className="wizard-cover-buttons">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isPosting}
                >
                  <ImagePlus />
                  {coverFile ? 'Change banner image' : 'Add banner image'}
                </Button>
                {coverFile && (
                  <Button type="button" variant="ghost" onClick={handleRemoveCover} disabled={isPosting}>
                    Use default image
                  </Button>
                )}
              </div>
              <p className="wizard-cover-guidance">
                Recommended image: 1200 × 600 px (2:1). We resize the long edge to 1200 px and compress it to JPEG when you post.
              </p>
            </div>

            {selectedSport.name !== 'Open activity' && (
              <label className="field">
                <span>Activity title</span>
                <input
                  maxLength={120}
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setTitleEdited(true)
                  }}
                  placeholder={`For example, ${getSuggestedTitle(selectedSport.name, suburb)}`}
                />
              </label>
            )}

            {!hasPresetDuration && (
              <label className="field">
                <span>Duration (hours)</span>
                <input type="number" min="0.25" max="24" step="0.25" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} />
              </label>
            )}

            <div className="wizard-field-grid">
              <label className="field">
                <span>Date</span>
                <input type="date" min={getLocalDateMinimum()} value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <label className="field">
                <span>Start time</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            </div>

            <LocationFields
              meetingPoint={meetingPoint}
              suburb={suburb}
              address={address}
              coordinates={coordinates}
              onMeetingPointChange={setMeetingPoint}
              onSuburbChange={updateSuburb}
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
              <small className="field-helper">Choose 1 buddy or a small group of 2 to 8 spots.</small>
            </div>

            {preset.length > 0 && (
              <div className="wizard-preset-fields">
                <div className="wizard-section-heading compact">
                  <h3>{selectedSport.name} details</h3>
                  <p>Optional, but helpful for the crew.</p>
                </div>
                <div className="wizard-field-grid">
                  {preset.map((field) => field.type === 'kite_sizes' ? (
                    <KiteSizePicker
                      key={field.key}
                      value={sportDetails[field.key]}
                      onChange={(value) => updateSportDetail(field.key, value)}
                    />
                  ) : (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      {field.options ? (
                        <select
                          className={sportDetails[field.key] ? '' : 'is-placeholder'}
                          value={sportDetails[field.key] ?? ''}
                          onChange={(event) => updateSportDetail(field.key, event.target.value)}
                        >
                          <option value="">Choose if you know</option>
                          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={sportDetails[field.key] ?? ''}
                          onChange={(event) => updateSportDetail(field.key, event.target.value)}
                          placeholder={field.placeholder ?? 'Optional'}
                          maxLength={field.maxLength}
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type ?? 'text'}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={sportDetails[field.key] ?? (
                            field.key === 'duration_hours'
                              ? durationHours
                              : field.key === 'duration_minutes'
                                ? String(Number(durationHours) * 60)
                                : ''
                          )}
                          onChange={(event) => updateSportDetail(field.key, event.target.value)}
                          placeholder={field.placeholder ?? 'Optional'}
                          maxLength={field.maxLength}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="field">
              <span>Notes <small>(optional, max 300 characters)</small></span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} placeholder="Anything else the crew should know?" rows={3} />
              <small className="field-helper">{notes.length}/300</small>
            </label>

            <label className="toggle-row wizard-auto-accept">
              <span>
                <strong>Auto-accept</strong>
                <small>Accept join requests without checking first.</small>
              </span>
              <input type="checkbox" checked={autoAccept} onChange={(event) => setAutoAccept(event.target.checked)} />
            </label>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="wizard-section" aria-labelledby="level-step-title">
          <div className="wizard-section-heading">
            <h2 id="level-step-title">Who is this for?</h2>
            <p>Choose the level that best fits this activity.</p>
          </div>
          <div className="wizard-level-options">
            {levels.map((option) => (
              <button
                key={option}
                type="button"
                className={`wizard-level-option ${level === option ? 'selected' : ''}`}
                onClick={() => setLevel(option)}
                aria-pressed={level === option}
              >
                <span>{option}</span>
                {level === option && <Check />}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="wizard-section" aria-labelledby="invite-step-title">
          <div className="wizard-section-heading">
            <h2 id="invite-step-title">Bring someone along</h2>
            <p>Invite a mate if you like. You can skip this step.</p>
          </div>
          <div className="invite-panel">
            <div className="invite-header">
              <span>People in Count Me In</span>
              <small>{selectedInvites.length} selected</small>
            </div>
            <input
              className="invite-search"
              type="search"
              value={inviteSearch}
              onChange={(event) => setInviteSearch(event.target.value)}
              placeholder="Search by name or suburb"
              aria-label="Search people to invite"
            />
            {selectedInvitees.length > 0 && (
              <div className="invited-list">
                {selectedInvitees.map((person) => (
                  <button key={person.id} type="button" className="invited-pill" onClick={() => toggleInvite(person.id)}>
                    {person.first_name}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="invite-user-grid">
              {filteredInviteSuggestions.length > 0 ? filteredInviteSuggestions.map((person) => (
                <button key={person.id} type="button" className="invite-user" onClick={() => toggleInvite(person.id)}>
                  <Avatar name={person.first_name} photoUrl={person.photo_url} size={28} />
                  <span><strong>{person.first_name}</strong><small>{person.suburb}</small></span>
                  <Plus />
                </button>
              )) : (
                <p className="invite-empty">No matching people found.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {step === 5 && selectedSport && (
        <section className="wizard-section" aria-labelledby="review-step-title">
          <div className="wizard-section-heading">
            <h2 id="review-step-title">Ready to post?</h2>
            <p>Check the details before you share it with the crew.</p>
          </div>
          <article className="wizard-review-card">
            <div className="wizard-review-cover">
              <img src={activityCoverImage} alt="" />
              <span><SelectedSportIcon />{selectedSport.name}</span>
            </div>
            <div className="wizard-review-content">
              <div className="wizard-review-heading">
                <h3>Sport</h3>
                <button type="button" onClick={() => goToStep(1)}>Edit</button>
              </div>
              <p>{selectedSport.name}</p>
            </div>
            <div className="wizard-review-content">
              <div className="wizard-review-heading">
                <h3>Activity details</h3>
                <button type="button" onClick={() => goToStep(2)}>Edit</button>
              </div>
              <strong className="wizard-review-title">{title}</strong>
              <p>{date && time ? new Date(`${date}T${time}`).toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Date and time not set'}</p>
              <p>{formatDuration(Math.round(Number(durationHours || 0) * 60))} · {spotsTotal === 1 ? '1 buddy wanted' : `${spotsTotal} spots`}</p>
              <p><MapPin />{[meetingPoint, address.trim(), suburb].filter(Boolean).join(', ')}</p>
              {parseCoordinates(coordinates) && <p>Map pin added</p>}
              {Object.entries(sportDetails)
                .filter(([key, value]) => key !== 'activity_name' && value.trim())
                .map(([key, value]) => (
                <p key={key}>{key === 'kite_sizes' ? 'Kites' : key.replace(/_/g, ' ')}: {value}</p>
              ))}
              {notes.trim() && <p>{notes.trim()}</p>}
              <p>Level: {level}</p>
              <p>Auto-accept: {autoAccept ? 'On' : 'Off'}</p>
            </div>
            <div className="wizard-review-content">
              <div className="wizard-review-heading">
                <h3>People invited</h3>
                <button type="button" onClick={() => goToStep(4)}>Edit</button>
              </div>
              <p>{selectedInvitees.length ? selectedInvitees.map((person) => person.first_name).join(', ') : 'No one invited'}</p>
            </div>
            <div className="wizard-review-content">
              <div className="wizard-review-heading">
                <h3>Level wanted</h3>
                <button type="button" onClick={() => goToStep(3)}>Edit</button>
              </div>
              <p>{level}</p>
            </div>
          </article>
        </section>
      )}

      <footer className="wizard-actions">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={goBack}>
            <ArrowLeft /> Back
          </Button>
        ) : <span />}
        {step < steps.length ? (
          <Button type="button" size="lg" onClick={continueToNextStep} disabled={!canContinue()}>
            {step === 4 && selectedInvites.length === 0 ? 'Skip' : 'Continue'} <ChevronRight />
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={() => void postActivity()} disabled={isPosting || !validDetails}>
            {isPosting ? 'Posting…' : 'Post activity'}
          </Button>
        )}
      </footer>
    </main>
  )
}
