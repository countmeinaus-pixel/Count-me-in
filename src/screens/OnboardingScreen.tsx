import { Camera, Check, ChevronRight, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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

const availabilityOptions = ['Weekday mornings', 'Weekday evenings', 'Saturdays', 'Sundays', 'Flexible']
const skillOptions: SkillLevel[] = ['Beginner', 'Intermediate', 'Experienced']

export function OnboardingScreen() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState('')
  const [suburb, setSuburb] = useState('')
  const [bio, setBio] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [sportSkills, setSportSkills] = useState<Record<string, SkillLevel>>({})
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    return !!firstName.trim() && !!suburb.trim() && Number(age) >= 18 && selectedSports.length > 0 && selectedAvailability.length > 0 && !!photoFile
  }, [age, firstName, photoFile, selectedAvailability.length, selectedSports.length, suburb])

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
      setError(uploadError instanceof Error ? uploadError.message : 'Foto kon niet worden verkleind.')
    }
  }

  async function handleSubmit() {
    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }

    if (!canSubmit) {
      setError('Vul eerst je profiel, sportniveau, beschikbaarheid en foto in.')
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
        age: Number(age),
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
      setError(submitError instanceof Error ? submitError.message : 'Opslaan is niet gelukt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1621] px-5 py-8 text-[#e6e2d8]">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7fb7a8]">Profile</p>
            <h1 className="text-3xl font-bold text-white">Je profiel</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#163430] text-[#7fb7a8]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-[#22384a] bg-[#132433] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col items-center gap-3">
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

            <input ref={inputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            <p className="text-sm text-[#9fb3c2]">Upload je profielfoto</p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-[#dfe5ea]">
              Voornaam
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                placeholder="Jai"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm text-[#dfe5ea]">
                Leeftijd
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                  placeholder="37"
                />
              </label>

              <label className="grid gap-2 text-sm text-[#dfe5ea]">
                Woonplaats
                <input
                  value={suburb}
                  onChange={(event) => setSuburb(event.target.value)}
                  className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                  placeholder="Port Noarlunga"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-[#dfe5ea]">
              Bio
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, 150))}
                rows={3}
                className="rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base text-white outline-none focus:border-[#7fb7a8]"
                placeholder="Ik ga het liefst vroeg in de ochtend of aan het einde van de week sporten."
              />
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#7fb7a8]">Sporten</p>
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
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#7fb7a8]">Niveau</p>
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
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#7fb7a8]">Beschikbaarheid</p>
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
            {isSubmitting ? 'Opslaan...' : 'Profiel opslaan'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
