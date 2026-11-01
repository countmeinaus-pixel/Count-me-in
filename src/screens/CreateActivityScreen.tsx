import {
  Anchor,
  ArrowLeft,
  Bike,
  Check,
  ChevronRight,
  Dumbbell,
  Fish,
  Footprints,
  MapPin,
  Mountain,
  MountainSnow,
  Plus,
  Sailboat,
  Waves,
  Wind,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { activities, getDefaultActivityHero } from '../data/mockData'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

type SportOption = { id: number; name: string; icon: string | null; skill: string }
type InviteSuggestion = { id: string; first_name: string; suburb: string }
type PresetField = {
  key: string
  label: string
  placeholder?: string
  options?: string[]
  type?: 'text' | 'number'
  min?: number
  max?: number
  step?: number
}

const steps = ['Sport', 'Details', 'Level', 'Add people', 'Review']
const levels = ['Beginner friendly', 'Intermediate', 'Experienced']
const presetFields: Record<string, PresetField[]> = {
  Spearfishing: [
    { key: 'target_depth', label: 'Target depth', options: ['0-5 m', '5-10 m', '10-15 m', '15 m+'] },
    { key: 'entry', label: 'Entry', options: ['Shore dive', 'Boat dive'] },
  ],
  Kitesurfing: [
    { key: 'kite_size', label: 'Kite size (m²)', type: 'number', min: 1, max: 30, step: 0.5 },
    { key: 'style', label: 'Style', options: ['Freeride', 'Freestyle', 'Wave'] },
    { key: 'spot', label: 'Spot', placeholder: 'For example, Brighton' },
  ],
  Hiking: [
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 200, step: 0.1 },
    { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Moderate', 'Steep'] },
  ],
  Running: [
    { key: 'distance_km', label: 'Distance (km)', type: 'number', min: 0.1, max: 200, step: 0.1 },
    { key: 'pace', label: 'Pace', options: ['Relaxed', 'Steady', 'Fast'] },
    { key: 'terrain', label: 'Terrain', options: ['Road', 'Trail', 'Beach'] },
  ],
  Gym: [
    { key: 'focus', label: 'Focus', options: ['Strength', 'Conditioning', 'Mixed'] },
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

export function CreateActivityScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [spotsTotal, setSpotsTotal] = useState(1)
  const [level, setLevel] = useState('Beginner friendly')
  const [notes, setNotes] = useState('')
  const [autoAccept, setAutoAccept] = useState(false)
  const [sportDetails, setSportDetails] = useState<Record<string, string>>({})
  const [inviteSearch, setInviteSearch] = useState('')
  const [selectedInvites, setSelectedInvites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState('')

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
      const [profileResult, profileSportsResult, inviteesResult] = await Promise.all([
        client.from('profiles').select('suburb').eq('id', user.id).maybeSingle(),
        client.from('profile_sports').select('sport_id, skill').eq('profile_id', user.id),
        client
          .from('profiles')
          .select('id, first_name, suburb')
          .neq('id', user.id)
          .order('first_name')
          .limit(50),
      ])

      if (!active) return
      if (profileResult.error || profileSportsResult.error || inviteesResult.error) {
        setError(
          profileResult.error?.message ??
            profileSportsResult.error?.message ??
            inviteesResult.error?.message ??
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
      if (profileSports.length === 0) {
        setSports([])
        setIsLoading(false)
        return
      }

      const { data: catalog, error: catalogError } = await client
        .from('sports')
        .select('id, name, icon')
        .in('id', profileSports.map((item) => item.sport_id))

      if (!active) return
      if (catalogError) {
        setError(catalogError.message)
        setIsLoading(false)
        return
      }

      const skillBySport = new Map(profileSports.map((item) => [item.sport_id, item.skill]))
      const userSports = (catalog ?? [])
        .map((sport) => ({
          id: sport.id,
          name: sport.name,
          icon: sport.icon,
          skill: skillBySport.get(sport.id) ?? 'Intermediate',
        }))
        .sort((left, right) => left.name.localeCompare(right.name))

      setSports(userSports)
      const initialSport = userSports.find((sport) => sport.name === preselectedSport)
      if (initialSport) {
        setSelectedSport(initialSport)
        setTitle(getSuggestedTitle(initialSport.name, profileSuburb))
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
    notes.length <= 300

  function chooseSport(sport: SportOption) {
    setSelectedSport(sport)
    setSportDetails({})
    if (!titleEdited) setTitle(getSuggestedTitle(sport.name, suburb))
  }

  function updateSuburb(value: string) {
    setSuburb(value)
    if (!titleEdited && selectedSport) setTitle(getSuggestedTitle(selectedSport.name, value))
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

  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > furthestStep) return
    setStep(nextStep)
    setError('')
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

    try {
      const start = new Date(`${date}T${time}`)
      const durationMinutes = Math.round(Number(durationHours) * 60)
      const coverImageUrl = getDefaultActivityHero(selectedSport.name)
      const { data: createdActivity, error: createError } = await client
        .from('activities')
        .insert({
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
          sport_details: sportDetails,
          cover_image_url: coverImageUrl,
        })
        .select('id')
        .single()

      if (createError) throw createError

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
          throw inviteError
        }
      }

      navigate(`/activity/${createdActivity.id}`)
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Unable to post this activity.')
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

  if (error) {
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
          <h1>Choose a sport first</h1>
        </header>
        <p className="text-[var(--text-secondary)]">Add at least one sport to your profile before creating an activity.</p>
        <Button onClick={() => navigate('/onboarding')} size="lg">Update your profile</Button>
      </main>
    )
  }

  const preset = selectedSport ? presetFields[selectedSport.name] ?? [] : []
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
          const isCompleted = stepNumber < step
          const isCurrent = stepNumber === step
          return (
            <button
              key={label}
              type="button"
              className={`wizard-progress-step ${isCompleted ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => goToStep(stepNumber)}
              disabled={stepNumber > furthestStep || stepNumber >= step}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${label}${isCompleted ? ', completed' : isCurrent ? ', current step' : ''}`}
            >
              <span>{isCompleted ? <Check /> : stepNumber}</span>
              <small>{label}</small>
            </button>
          )
        })}
      </nav>
      <p className="wizard-step-count">Step {step} of {steps.length}</p>

      {error && <p className="wizard-error" role="alert">{error}</p>}

      {step === 1 && (
        <section className="wizard-section" aria-labelledby="sport-step-title">
          <div className="wizard-section-heading">
            <h2 id="sport-step-title">What are you keen to do?</h2>
            <p>Choose one of the sports on your profile.</p>
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
                  <small>{sport.skill}</small>
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
            <img src={sportImage} alt={`${selectedSport.name} cover`} />
            <div>
              <span>Activity cover</span>
              <strong>Default {selectedSport.name} image</strong>
            </div>
          </div>

          <div className="create-form">
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

            <div className="wizard-field-grid">
              <label className="field">
                <span>Duration (hours)</span>
                <input type="number" min="0.25" max="24" step="0.25" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} />
              </label>
              <label className="field">
                <span>Suburb</span>
                <input value={suburb} onChange={(event) => updateSuburb(event.target.value)} placeholder="For example, Glenelg" />
              </label>
            </div>

            <label className="field">
              <span>Meeting point</span>
              <input value={meetingPoint} onChange={(event) => setMeetingPoint(event.target.value)} maxLength={200} placeholder="For example, the car park by the jetty" />
            </label>

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
                  {preset.map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      {field.options ? (
                        <select
                          className={sportDetails[field.key] ? '' : 'is-placeholder'}
                          value={sportDetails[field.key] ?? ''}
                          onChange={(event) => setSportDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                        >
                          <option value="">Choose if you know</option>
                          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type ?? 'text'}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={sportDetails[field.key] ?? ''}
                          onChange={(event) => setSportDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                          placeholder={field.placeholder ?? 'Optional'}
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
                  <span className="invite-avatar">{person.first_name.charAt(0).toUpperCase()}</span>
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
              <img src={sportImage} alt="" />
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
              <p><MapPin />{meetingPoint}{suburb ? `, ${suburb}` : ''}</p>
              {Object.entries(sportDetails).filter(([, value]) => value.trim()).map(([key, value]) => (
                <p key={key}>{key.replace(/_/g, ' ')}: {value}</p>
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
          <Button type="button" variant="secondary" onClick={() => goToStep(step - 1)}>
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
