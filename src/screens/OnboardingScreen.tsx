import { Camera, Check, ChevronRight, Pencil, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredLanguage, getTranslations, setStoredLanguage, type Language } from '../lib/i18n'
import { compressProfilePhoto, saveProfile, uploadProfilePhoto, type SkillLevel } from '../lib/profile'
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
  'Open activity',
]

function calculateAgeFromDateOfBirth(dateOfBirth: string) {
  if (!dateOfBirth) return null

  const birthDate = new Date(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  if (!hasBirthdayPassed) {
    age -= 1
  }

  return age
}

const availabilityOptions = ['Weekday mornings', 'Weekday evenings', 'Saturdays', 'Sundays', 'Flexible']
const skillOptions: SkillLevel[] = ['Beginner', 'Intermediate', 'Experienced']
const suburbOptions = [
  'Adelaide',
  'North Adelaide',
  'South Adelaide',
  'Glenelg',
  'Henley Beach',
  'Noarlunga',
  'Port Noarlunga',
  'Port Adelaide',
  'Morphett Vale',
  'Marion',
  'Unley',
  'Mawson Lakes',
  'Mount Barker',
  'Prospect',
  'Modbury',
  'Blackwood',
  'Happy Valley',
  'Seaford',
  'Aldinga',
  'Norwood',
  'West Beach',
]

export function OnboardingScreen() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const copy = getTranslations(language)

  const [firstName, setFirstName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [suburb, setSuburb] = useState('')
  const [bio, setBio] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [sportSkills, setSportSkills] = useState<Record<string, SkillLevel>>({})
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const calculatedAge = useMemo(() => calculateAgeFromDateOfBirth(dateOfBirth), [dateOfBirth])

  useEffect(() => {
    async function ensureSession() {
      if (!supabase) {
        setError(getSupabaseSetupHint())
        return
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !sessionData.user) {
        navigate('/login')
      }
    }

    ensureSession()
  }, [navigate])

  const canSubmit = useMemo(() => {
    const age = calculateAgeFromDateOfBirth(dateOfBirth)
    return !!firstName.trim() && !!suburb.trim() && typeof age === 'number' && age >= 18 && age <= 99 && selectedSports.length > 0 && selectedAvailability.length > 0
  }, [dateOfBirth, firstName, selectedAvailability.length, selectedSports.length, suburb])

  function toggleSport(sport: string) {
    setSelectedSports((current) => {
      if (current.includes(sport)) {
        const next = current.filter((item) => item !== sport)
        setSportSkills((skills) => {
          const nextSkills = { ...skills }
          delete nextSkills[sport]
          return nextSkills
        })
        return next
      }

      setSportSkills((skills) => ({ ...skills, [sport]: skills[sport] ?? 'Intermediate' }))
      return [...current, sport]
    })
  }

  function toggleAvailability(slot: string) {
    setSelectedAvailability((current) => current.includes(slot)
      ? current.filter((item) => item !== slot)
      : [...current, slot])
  }

  async function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const compressed = await compressProfilePhoto(file)
      setPhotoFile(compressed)
      setPhotoPreview(URL.createObjectURL(compressed))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : copy.photoUpdateFailed)
    }
  }

  async function handleSubmit() {
    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }

    const ageValue = calculateAgeFromDateOfBirth(dateOfBirth)
    if (!canSubmit || typeof ageValue !== 'number' || ageValue < 18 || ageValue > 99) {
      setError(copy.invalidDateOfBirth)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        navigate('/login')
        return
      }

      const compressedPhoto = photoFile ? await compressProfilePhoto(photoFile) : null
      const photoUrl = compressedPhoto ? await uploadProfilePhoto(compressedPhoto, userData.user.id) : undefined

      await saveProfile({
        id: userData.user.id,
        email: userData.user.email ?? '',
        firstName: firstName.trim(),
        age: ageValue,
        suburb: suburb.trim(),
        bio: bio.trim(),
        photoUrl,
        sports: selectedSports.map((sport) => ({
          sport,
          skill: sportSkills[sport] ?? 'Intermediate',
        })),
        availability: selectedAvailability,
      })

      navigate('/')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.saveFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1621] px-5 py-8 text-[#e6e2d8]">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7fb7a8]">{copy.profileLabel}</p>
            <h1 className="text-3xl font-bold text-white">{copy.pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 rounded-full border border-[#22384a] bg-[#0a1621] p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  setStoredLanguage('en')
                }}
                className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-[#163430] text-[#dff4ef]' : 'text-[#9fb3c2]'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('nl')
                  setStoredLanguage('nl')
                }}
                className={`rounded-full px-2 py-1 ${language === 'nl' ? 'bg-[#163430] text-[#dff4ef]' : 'text-[#9fb3c2]'}`}
              >
                NL
              </button>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#163430] text-[#7fb7a8]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-[#22384a] bg-[#132433] p-5 shadow-2xl shadow-black/20">
          <p className="text-xs uppercase tracking-[0.18em] text-[#9fb3c2]">{copy.requiredNote}</p>

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#7fb7a8] bg-[#163430] text-[#dff4ef]"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Profielfoto preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-[#7fb7a8]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label="Profielfoto wijzigen"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#7fb7a8] bg-[#0a1621] text-[#7fb7a8] shadow-lg shadow-black/30"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>

            <input ref={inputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            <p className="text-sm text-[#9fb3c2]">{copy.uploadPhoto} ({copy.optional})</p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-[#dfe5ea]">
              {copy.firstName} *
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                placeholder={copy.firstNamePlaceholder}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm text-[#dfe5ea]">
                {copy.dateOfBirth} *
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                  placeholder={copy.dateOfBirthPlaceholder}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </label>

              <div className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-sm text-[#dfe5ea]">
                <div className="text-[#9fb3c2]">{copy.ageLabel}</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {typeof calculatedAge === 'number' ? calculatedAge : '--'}
                </div>
              </div>
            </div>

            <label className="grid gap-2 text-sm text-[#dfe5ea]">
              {copy.suburb} *
              <input
                value={suburb}
                onChange={(event) => setSuburb(event.target.value)}
                list="suburb-options"
                className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                placeholder={copy.suburbPlaceholder}
              />
              <datalist id="suburb-options">
                {suburbOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="grid gap-2 text-sm text-[#dfe5ea]">
              {copy.bio}
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, 150))}
                rows={3}
                className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                placeholder={copy.bioPlaceholder}
              />
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#7fb7a8]">{copy.sports} *</p>
            <div className="flex flex-wrap gap-2">
              {sportOptions.map((sport) => {
                const isSelected = selectedSports.includes(sport)
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'border-[#7fb7a8] bg-[#163430] text-[#dff4ef]'
                        : 'border-[#22384a] bg-[#0a1621] text-[#dfe5ea]'
                    }`}
                  >
                    {isSelected ? <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" />{sport}</span> : sport}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedSports.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#7fb7a8]">{copy.level}</p>
              {selectedSports.map((sport) => (
                <div key={sport} className="rounded-2xl border border-[#22384a] bg-[#0a1621] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-white">{sport}</span>
                    <span className="text-xs uppercase tracking-[0.1em] text-[#9fb3c2]">{sportSkills[sport] ?? 'Intermediate'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSportSkills((skills) => ({ ...skills, [sport]: level }))}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          sportSkills[sport] === level
                            ? 'border-[#7fb7a8] bg-[#163430] text-[#dff4ef]'
                            : 'border-[#22384a] bg-[#132433] text-[#dfe5ea]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#7fb7a8]">{copy.availability} *</p>
            <div className="flex flex-wrap gap-2">
              {availabilityOptions.map((slot) => {
                const isSelected = selectedAvailability.includes(slot)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleAvailability(slot)}
                    className={`rounded-full border px-3 py-2 text-sm ${
                      isSelected
                        ? 'border-[#7fb7a8] bg-[#163430] text-[#dff4ef]'
                        : 'border-[#22384a] bg-[#0a1621] text-[#dfe5ea]'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-[#f0645a]/40 bg-[#2f1413] px-3 py-2 text-sm text-[#ffc4c0]">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6b2c] px-4 py-3 font-semibold text-[#1a0d05] transition hover:bg-[#ff8250] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? copy.saving : copy.saveProfile}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
