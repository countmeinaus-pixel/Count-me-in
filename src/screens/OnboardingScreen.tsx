import { CalendarDays, Camera, Check, QrCode, ShieldCheck, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClaimPrDialog } from '../components/ClaimPrDialog'
import { FlowLayout } from '../components/FlowLayout'
import { PatchIcon } from '../components/PatchIcon'
import { SportIcon } from '../components/SportIcon'
import { adelaideSuburbs } from '../data/adelaideSuburbs'
import {
  calculateAgeFromDateOfBirth,
  compressProfilePhoto,
  saveProfile,
  uploadProfilePhoto,
  type SkillLevel,
} from '../lib/profile'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

const sportOptions = [
  'Running',
  'Hiking',
  'Spearfishing',
  'Kitesurfing',
  'Surfing',
  'Swimming',
  'Gym',
  'Mountain biking',
  'Road cycling',
  'SUP / kayak',
  'Scuba diving',
  'Climbing / bouldering',
]
const availabilityOptions = ['Weekday mornings', 'Weekday evenings', 'Saturdays', 'Sundays', 'Flexible']
const skillOptions: SkillLevel[] = ['Beginner', 'Intermediate', 'Experienced']

// One question per screen. Name, date of birth and suburb are required; the
// rest can be skipped and filled in later from the profile.
type Step = 'name' | 'birthday' | 'suburb' | 'sports' | 'levels' | 'availability' | 'patches' | 'record'
const steps: Step[] = ['name', 'birthday', 'suburb', 'sports', 'levels', 'availability', 'patches', 'record']

export function OnboardingScreen() {
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [bio, setBio] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [suburb, setSuburb] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [sportSkills, setSportSkills] = useState<Record<string, SkillLevel>>({})
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [checkError, setCheckError] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [checkAttempt, setCheckAttempt] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [prClaimed, setPrClaimed] = useState(false)
  const age = useMemo(() => calculateAgeFromDateOfBirth(dateOfBirth), [dateOfBirth])
  const step = steps[stepIndex]

  useEffect(() => {
    let active = true
    async function ensureSession() {
      if (!supabase) {
        setCheckError(getSupabaseSetupHint())
        setIsChecking(false)
        return
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !sessionData.user) {
        navigate('/login')
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', sessionData.user.id)
        .maybeSingle()
      if (!active) return
      if (profileError) {
        setCheckError(profileError.message)
        setIsChecking(false)
        return
      }
      if (profile?.onboarding_complete) {
        navigate('/', { replace: true })
        return
      }
      setIsChecking(false)
    }
    void ensureSession()
    return () => {
      active = false
    }
  }, [navigate, checkAttempt])

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  if (isChecking || checkError) {
    return (
      <main className="screen onboarding-check-screen">
        {isChecking ? (
          <p role="status">Checking your profile…</p>
        ) : (
          <>
            <p className="wizard-error" role="alert">{checkError}</p>
            <button type="button" className="button button-secondary" onClick={() => {
              setCheckError('')
              setIsChecking(true)
              setCheckAttempt((attempt) => attempt + 1)
            }}>
              Try again
            </button>
          </>
        )}
      </main>
    )
  }

  function goTo(index: number) {
    setError('')
    setStepIndex(Math.max(0, Math.min(steps.length - 1, index)))
  }

  function nextIndexAfter(index: number) {
    // No sports chosen: there are no levels to set.
    const next = index + 1
    return steps[next] === 'levels' && selectedSports.length === 0 ? next + 1 : next
  }

  function previousIndexBefore(index: number) {
    const previous = index - 1
    return steps[previous] === 'levels' && selectedSports.length === 0 ? previous - 1 : previous
  }

  function toggleSport(sport: string) {
    setSelectedSports((current) => {
      if (current.includes(sport)) return current.filter((item) => item !== sport)
      setSportSkills((skills) => ({ ...skills, [sport]: skills[sport] ?? 'Intermediate' }))
      return [...current, sport]
    })
  }

  async function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressProfilePhoto(file)
      setPhotoFile(compressed)
      setPhotoPreview(URL.createObjectURL(compressed))
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Unable to use this photo.')
    }
  }

  // Saves the profile once the profile questions are done (or skipped).
  async function saveAndContinue(skipRest: boolean) {
    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }
    if (typeof age !== 'number' || age < 18 || age > 99) {
      setError('Enter a valid date of birth. You need to be 18 or older.')
      goTo(steps.indexOf('birthday'))
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        navigate('/login')
        return
      }
      const photoUrl = photoFile ? await uploadProfilePhoto(photoFile, userData.user.id) : undefined
      await saveProfile({
        id: userData.user.id,
        email: userData.user.email ?? '',
        firstName: firstName.trim(),
        age,
        dateOfBirth,
        suburb: suburb.trim(),
        bio: bio.trim(),
        photoUrl,
        sports: selectedSports.map((sport) => ({ sport, skill: sportSkills[sport] ?? 'Intermediate' })),
        availability: selectedAvailability,
      })
      setProfileSaved(true)
      if (skipRest) finish()
      else goTo(steps.indexOf('patches'))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  function finish() {
    navigate('/', { replace: true })
  }

  const progress = (stepIndex + 1) / steps.length
  const onBack = stepIndex > 0 && !(profileSaved && stepIndex <= steps.indexOf('patches'))
    ? () => goTo(previousIndexBefore(stepIndex))
    : undefined
  const errorBox = error ? <p className="flow-error" role="alert">{error}</p> : null

  if (step === 'name') {
    return (
      <FlowLayout
        progress={progress}
        align="start"
        title={<>Welcome! <em>What should the crew call you?</em></>}
        subtitle="Your first name and photo show on your profile and your activities."
        primaryLabel="Continue"
        primaryDisabled={!firstName.trim()}
        onPrimary={() => goTo(nextIndexAfter(stepIndex))}
      >
        <button type="button" className="onboarding-photo" onClick={() => photoInputRef.current?.click()} aria-label={photoPreview ? 'Change profile photo' : 'Add a profile photo'}>
          {photoPreview ? <img src={photoPreview} alt="" /> : <Camera aria-hidden="true" />}
        </button>
        <input ref={photoInputRef} className="sr-only" type="file" accept="image/*" onChange={handlePhotoSelect} aria-label="Choose a profile photo" />
        <p className="flow-hint" style={{ textAlign: 'center' }}>Profile photo (optional)</p>
        <label className="flow-field">
          <span>First name</span>
          <input value={firstName} maxLength={40} autoComplete="given-name" onChange={(event) => setFirstName(event.target.value)} placeholder="For example, Matt" />
        </label>
        <label className="flow-field">
          <span>Short bio (optional)</span>
          <textarea rows={2} value={bio} maxLength={150} onChange={(event) => setBio(event.target.value)} placeholder="Keen diver, slow runner, always up for a coffee after." />
        </label>
        {errorBox}
      </FlowLayout>
    )
  }

  if (step === 'birthday') {
    const tooYoung = typeof age === 'number' && age < 18
    return (
      <FlowLayout
        progress={progress}
        align="start"
        title={<>When's your <em>birthday</em>?</>}
        subtitle="We only show your age, never your date of birth. Count Me In is for men aged 18 and over."
        onBack={onBack}
        primaryLabel="Continue"
        primaryDisabled={typeof age !== 'number' || age < 18 || age > 99}
        onPrimary={() => goTo(nextIndexAfter(stepIndex))}
      >
        <label className="flow-field">
          <span>Date of birth</span>
          <input type="date" value={dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDateOfBirth(event.target.value)} />
        </label>
        {typeof age === 'number' && !tooYoung && <p className="flow-hint">You're {age}.</p>}
        {tooYoung && <p className="flow-error" role="alert">You need to be 18 or older to join.</p>}
        {errorBox}
      </FlowLayout>
    )
  }

  if (step === 'suburb') {
    return (
      <FlowLayout
        progress={progress}
        align="start"
        title={<>Where are you <em>based</em>?</>}
        subtitle="We use your suburb to show activities and people nearby."
        onBack={onBack}
        primaryLabel="Continue"
        primaryDisabled={!suburb.trim()}
        onPrimary={() => goTo(nextIndexAfter(stepIndex))}
      >
        <label className="flow-field">
          <span>Suburb</span>
          <input value={suburb} list="onboarding-suburbs" autoComplete="address-level2" onChange={(event) => setSuburb(event.target.value)} placeholder="For example, Brighton" />
          <datalist id="onboarding-suburbs">
            {adelaideSuburbs.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        {errorBox}
      </FlowLayout>
    )
  }

  if (step === 'sports') {
    return (
      <FlowLayout
        progress={progress}
        align="start"
        title={<>What are you <em>into</em>?</>}
        subtitle="Pick as many as you like. Your home feed shows these sports first."
        onBack={onBack}
        onSkip={() => goTo(steps.indexOf('availability'))}
        primaryLabel={selectedSports.length ? `Continue (${selectedSports.length})` : 'Continue'}
        onPrimary={() => goTo(nextIndexAfter(stepIndex))}
      >
        <div className="sport-tile-grid">
          {sportOptions.map((sport) => {
            const selected = selectedSports.includes(sport)
            return (
              <button
                key={sport}
                type="button"
                className={`sport-tile ${selected ? 'selected' : ''}`}
                aria-pressed={selected}
                onClick={() => toggleSport(sport)}
              >
                {selected && <span className="sport-tile-check"><Check aria-hidden="true" /></span>}
                <SportIcon sport={sport} className="sport-tile-icon" />
                {sport}
              </button>
            )
          })}
        </div>
      </FlowLayout>
    )
  }

  if (step === 'levels') {
    return (
      <FlowLayout
        progress={progress}
        align="start"
        title={<>How <em>experienced</em> are you?</>}
        subtitle="So people know what to expect. You can change this any time."
        onBack={onBack}
        onSkip={() => goTo(nextIndexAfter(stepIndex))}
        primaryLabel="Continue"
        onPrimary={() => goTo(nextIndexAfter(stepIndex))}
      >
        {selectedSports.map((sport) => (
          <div className="level-card" key={sport}>
            <span className="level-card-title"><SportIcon sport={sport} />{sport}</span>
            <div className="choice-chips">
              {skillOptions.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`choice-chip ${sportSkills[sport] === level ? 'selected' : ''}`}
                  aria-pressed={sportSkills[sport] === level}
                  onClick={() => setSportSkills((skills) => ({ ...skills, [sport]: level }))}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        ))}
      </FlowLayout>
    )
  }

  if (step === 'availability') {
    return (
      <FlowLayout
        progress={progress}
        align="start"
        title={<>When are you <em>usually free</em>?</>}
        subtitle="This helps us suggest plans that fit your week."
        onBack={onBack}
        onSkip={() => void saveAndContinue(false)}
        primaryLabel={isSaving ? 'Saving your profile…' : 'Save and continue'}
        primaryDisabled={isSaving}
        onPrimary={() => void saveAndContinue(false)}
      >
        <div className="choice-chips">
          {availabilityOptions.map((slot) => {
            const selected = selectedAvailability.includes(slot)
            return (
              <button
                key={slot}
                type="button"
                className={`choice-chip ${selected ? 'selected' : ''}`}
                aria-pressed={selected}
                onClick={() => setSelectedAvailability((current) => selected ? current.filter((item) => item !== slot) : [...current, slot])}
              >
                {slot}
              </button>
            )
          })}
        </div>
        {errorBox}
      </FlowLayout>
    )
  }

  if (step === 'patches') {
    return (
      <FlowLayout
        progress={progress}
        title={<>Show up and <em>earn patches</em></>}
        onSkip={finish}
        primaryLabel="Continue"
        onPrimary={() => goTo(steps.indexOf('record'))}
      >
        <div className="flow-showcase">
          <div className="showcase-patches" aria-hidden="true">
            <span className="showcase-patch"><PatchIcon name="shield" />First meetup</span>
            <span className="showcase-patch"><PatchIcon name="fish" />Reef rookie</span>
            <span className="showcase-patch"><PatchIcon name="sunrise" />First light</span>
            <span className="showcase-patch"><PatchIcon name="users" />Crew</span>
          </div>
          <div className="flow-bullets">
            <p className="flow-bullet"><QrCode aria-hidden="true" /><span><strong>Check in with a QR scan</strong> when you meet up. Each confirmed meetup counts towards your patches.</span></p>
            <p className="flow-bullet"><ShieldCheck aria-hidden="true" /><span><strong>Over 240 patches</strong>, with 20 for every sport: from your first session to legend status.</span></p>
            <p className="flow-bullet"><CalendarDays aria-hidden="true" /><span><strong>Join challenges</strong> like the monthly grind or weekend warrior. Reach the goal in time for a limited patch.</span></p>
          </div>
        </div>
        <p className="flow-hint" style={{ textAlign: 'center' }}>Find them all under More, then Patches.</p>
      </FlowLayout>
    )
  }

  return (
    <>
      <FlowLayout
        progress={progress}
        title={<>Got a <em>personal record</em>?</>}
        subtitle="Claim it with a photo as proof. Once 3 members confirm it, it gets a verified tick on your profile."
        onSkip={finish}
        skipLabel="Later"
        primaryLabel={prClaimed ? 'Start exploring' : 'Claim a PR'}
        onPrimary={() => (prClaimed ? finish() : setClaimOpen(true))}
        footerNote={!prClaimed ? (
          <button type="button" className="flow-skip" onClick={finish}>Not now, start exploring</button>
        ) : null}
      >
        <div className="flow-showcase">
          <div className="showcase-row">
            <Trophy aria-hidden="true" />
            <span className="grow">
              <strong>{prClaimed ? 'PR claimed!' : 'Deepest dive, fastest 10 km, heaviest deadlift'}</strong>
              <small>{prClaimed ? 'Members can now confirm it.' : 'Pick your sport and record type.'}</small>
            </span>
          </div>
        </div>
      </FlowLayout>
      {claimOpen && (
        <ClaimPrDialog
          preferredSports={selectedSports}
          onClose={() => setClaimOpen(false)}
          onClaimed={() => {
            setClaimOpen(false)
            setPrClaimed(true)
          }}
        />
      )}
    </>
  )
}
