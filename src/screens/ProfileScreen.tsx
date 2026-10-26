import { LogOut, MapPin, Pencil, ShieldCheck, Users, Waves } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { getStoredLanguage, getTranslations, setStoredLanguage, type Language } from '../lib/i18n'
import { updateProfilePhoto } from '../lib/profile'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

export function ProfileScreen() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)
  const copy = getTranslations(language)

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      if (!supabase) {
        setStatusMessage(getSupabaseSetupHint())
        return
      }

      setIsUpdatingPhoto(true)
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        navigate('/login')
        return
      }

      const nextPhotoUrl = await updateProfilePhoto(userData.user.id, file)
      setProfilePhoto(nextPhotoUrl)
      setStatusMessage(copy.profileUpdated)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.photoUpdateFailed)
    } finally {
      setIsUpdatingPhoto(false)
      event.target.value = ''
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      navigate('/login')
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatusMessage(error.message)
      return
    }

    navigate('/login')
  }

  return (
    <div className="screen">
      <header className="profile-header">
        <div className="profile-top" />
      </header>

      <div className="profile-identity">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="avatar hero-avatar flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#7fb7a8] bg-[#163430] text-4xl font-bold text-[#e6e2d8]"
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profielfoto" className="h-full w-full object-cover" />
            ) : (
              'J'
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Profielfoto wijzigen"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#7fb7a8] bg-[#0a1621] text-[#7fb7a8] shadow-lg shadow-black/30"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />

        <h1>{currentUser.name}, {currentUser.age}</h1>
        <p><MapPin />{currentUser.suburb}</p>
        <span className="verified"><ShieldCheck />Verified member</span>
      </div>

      <div className="stats-grid">
        <div><strong>7</strong><span>Meetups</span></div>
        <div><strong>2</strong><span>Hosted</span></div>
        <div><strong>5</strong><span>Sports</span></div>
      </div>

      <div className="section-heading compact">
        <h2>Your sports</h2>
        <span>Edit</span>
      </div>

      <div className="sport-list">
        {currentUser.sports.map((sport) => (
          <p key={sport.name}>
            <span className="sport-name">{sport.name}</span>
            <span className="sport-level">{sport.level}</span>
          </p>
        ))}
      </div>

      <div className="section-heading compact">
        <h2>Patches</h2>
        <span>3 of 8</span>
      </div>

      <div className="patch-grid">
        <div><ShieldCheck /><span>First meetup</span></div>
        <div><Users /><span>Regular</span></div>
        <div><Waves /><span>Salt water</span></div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#22384a] bg-[#132433] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[#dfe5ea]">{copy.languageLabel}</span>
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
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-4 rounded-xl border border-[#22384a] bg-[#132433] px-3 py-2 text-sm text-[#dfe5ea]">
          {statusMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 font-medium text-[#e6e2d8]"
      >
        <LogOut className="h-4 w-4" />
        {isUpdatingPhoto ? copy.updatingPhoto : copy.logOut}
      </button>
    </div>
  )
}
