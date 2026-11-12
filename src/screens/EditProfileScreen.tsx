import { SuburbInput } from '../components/SuburbInput'
import { ArrowLeft, Camera, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'
import { refreshViewerProfile } from '../lib/viewerProfile'
import { useUnsavedChangesWarning } from '../lib/useUnsavedChangesWarning'
import { getMoreOrigin } from '../lib/moreNavigation'
import {
  calculateAgeFromDateOfBirth,
  compressProfilePhoto,
  deleteProfilePhoto,
  getCurrentProfile,
  updateProfileDetails,
  uploadProfilePhoto,
} from '../lib/profile'

type ProfileForm = {
  firstName: string
  dateOfBirth: string
  suburb: string
  bio: string
  photoUrl: string | null
}

function isSameProfile(left: ProfileForm, right: ProfileForm) {
  return left.firstName === right.firstName
    && left.dateOfBirth === right.dateOfBirth
    && left.suburb === right.suburb
    && left.bio === right.bio
    && left.photoUrl === right.photoUrl
}

function getLatestAdultDateOfBirth() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export function EditProfileScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo === '/more' ? '/more' : '/profile'
  const moreOrigin = getMoreOrigin(location.state)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const [userId, setUserId] = useState('')
  const [original, setOriginal] = useState<ProfileForm | null>(null)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const age = useMemo(
    () => calculateAgeFromDateOfBirth(form?.dateOfBirth ?? ''),
    [form?.dateOfBirth],
  )
  const isDirty = !!form && !!original && !isSameProfile(form, original)
  useUnsavedChangesWarning(isDirty && !isSaving)
  const valid = !!form
    && !!form.firstName.trim()
    && !!form.suburb.trim()
    && !!form.dateOfBirth
    && age !== null
    && age >= 18
    && age <= 99
    && form.bio.length <= 150

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        if (!supabase) {
          setError(getSupabaseSetupHint())
          return
        }

        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          navigate('/login', { replace: true })
          return
        }

        const profile = await getCurrentProfile(userData.user.id)
        if (!profile) {
          setError('Your profile could not be found. Please complete onboarding first.')
          return
        }

        if (!active) return
        setUserId(profile.id)
        const initialForm = {
          firstName: profile.firstName,
          dateOfBirth: profile.dateOfBirth ?? '',
          suburb: profile.suburb,
          bio: profile.bio,
          photoUrl: profile.photoUrl,
        }
        setOriginal(initialForm)
        setForm(initialForm)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function updateField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => current ? { ...current, [field]: value } : current)
    setError('')
  }

  async function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your profile photo.')
      return
    }

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setSelectedPhoto(file)
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreviewUrl(previewUrl)
    setForm((current) => current ? { ...current, photoUrl: previewUrl } : current)
    setError('')
  }

  function handleRemovePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
    setSelectedPhoto(null)
    setForm((current) => current ? { ...current, photoUrl: null } : current)
    setError('')
  }

  async function handleSave() {
    if (!form || !valid || !isDirty) return

    setIsSaving(true)
    setError('')

    try {
      let photoUrl = form.photoUrl
      if (selectedPhoto) {
        photoUrl = await uploadProfilePhoto(
          await compressProfilePhoto(selectedPhoto, true),
          userId,
        )
      }

      await updateProfileDetails({
        id: userId,
        firstName: form.firstName.trim(),
        dateOfBirth: form.dateOfBirth,
        suburb: form.suburb.trim(),
        bio: form.bio.trim(),
        photoUrl,
      })

      let statusMessage = 'Profile updated.'
      if (original?.photoUrl && original.photoUrl !== photoUrl) {
        try {
          await deleteProfilePhoto(original.photoUrl, userId)
        } catch {
          statusMessage = 'Profile updated, but the old photo could not be removed from storage.'
        }
      }

      const savedForm = { ...form, photoUrl }
      setOriginal(savedForm)
      setForm(savedForm)
      setSelectedPhoto(null)
      void refreshViewerProfile()
      navigate(returnTo, {
        replace: true,
        state: returnTo === '/more' ? { statusMessage, from: moreOrigin } : { statusMessage },
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <main className="screen edit-profile-page"><p className="edit-form-status">Loading your profile…</p></main>
  }

  if (!form) {
    return (
      <main className="screen edit-profile-page">
        <header className="mates-header">
          <button
            type="button"
            className="icon-button"
            aria-label="Back"
            onClick={() => navigate(returnTo, { replace: true, state: returnTo === '/more' ? { from: moreOrigin } : undefined })}
          >
            <ArrowLeft />
          </button>
          <h1>Edit profile</h1>
        </header>
        <p className="edit-form-error" role="alert">{error || 'Unable to load your profile.'}</p>
      </main>
    )
  }

  const photoSource = form.photoUrl

  return (
    <main className="screen edit-profile-page">
      <header className="edit-page-header">
        <button type="button" className="icon-button" aria-label="Back to profile" onClick={() => navigate('/profile')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">Your details</p>
          <h1>Edit profile</h1>
        </div>
      </header>

      <section className="edit-profile-photo">
        <div className="edit-photo-preview">
          {photoSource
            ? <img src={photoSource} alt="Profile photo preview, centre-cropped to a square" />
            : <span aria-label="Profile photo initials">{form.firstName.trim()[0]?.toUpperCase() ?? '?'}</span>}
        </div>
        <p>Photo is centre-cropped to a square and compressed before upload.</p>
        <div className="edit-photo-actions">
          <button type="button" className="secondary-action" onClick={() => photoInputRef.current?.click()}><ImagePlus />Choose photo</button>
          <button type="button" className="secondary-action" onClick={() => cameraInputRef.current?.click()}><Camera />Take photo</button>
          {photoSource && <button type="button" className="text-action edit-remove-photo" onClick={handleRemovePhoto}><Trash2 />Remove</button>}
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} hidden />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handlePhotoSelect} hidden />
      </section>

      <div className="edit-profile-fields">
        <label className="edit-field">
          <span>Username</span>
          <input
            value={form.firstName}
            maxLength={50}
            onChange={(event) => updateField('firstName', event.target.value)}
            autoComplete="given-name"
          />
        </label>

        <div className="edit-field-row">
          <label className="edit-field">
            <span>Date of birth</span>
            <input
              type="date"
              value={form.dateOfBirth}
              max={getLatestAdultDateOfBirth()}
              onChange={(event) => updateField('dateOfBirth', event.target.value)}
              autoComplete="bday"
              required
            />
          </label>
          <div className="edit-age-field" aria-live="polite">
            <span>Age</span>
            <strong>{age ?? '—'}</strong>
          </div>
        </div>

        <label className="edit-field">
          <span>Suburb</span>
          <SuburbInput value={form.suburb} onChange={(value) => updateField('suburb', value)} ariaLabel="Suburb or town" />
        </label>

        <label className="edit-field">
          <span>Bio <small>Optional · {form.bio.length}/150</small></span>
          <textarea
            value={form.bio}
            maxLength={150}
            rows={4}
            onChange={(event) => updateField('bio', event.target.value)}
          />
        </label>
      </div>

      {error && <p className="edit-form-error" role="alert">{error}</p>}

      <div className="edit-form-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={() => navigate(returnTo, { replace: true, state: returnTo === '/more' ? { from: moreOrigin } : undefined })}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type="button" className="primary-action" onClick={() => void handleSave()} disabled={!valid || !isDirty || isSaving}>
          <Pencil aria-hidden="true" />{isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </main>
  )
}
