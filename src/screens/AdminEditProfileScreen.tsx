import { ArrowLeft, Camera, ImagePlus, ShieldCheck } from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { PhotoCropDialog } from '../components/PhotoCropDialog'
import { SuburbInput } from '../components/SuburbInput'
import { adminGetProfile, adminUpdateProfile, getCurrentModerationRole, type AdminProfile } from '../lib/moderation'
import { calculateAgeFromDateOfBirth, getProfilePath } from '../lib/profile'

type Form = { firstName: string; dateOfBirth: string; suburb: string; bio: string; removePhoto: boolean; note: string }

// Admin only: fix a member's profile to help with an issue. The member gets a
// notification listing what was changed, plus the optional note.
export function AdminEditProfileScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  // A new photo for the member: chosen, then moved and zoomed in PhotoCropDialog.
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null)
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => {
    if (newPhotoUrl) URL.revokeObjectURL(newPhotoUrl)
  }, [newPhotoUrl])

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the profile photo.')
      return
    }
    setError('')
    setPhotoToCrop(file)
  }

  function handlePhotoCropped(cropped: File) {
    setPhotoToCrop(null)
    setNewPhoto(cropped)
    setNewPhotoUrl(URL.createObjectURL(cropped))
    setForm((current) => (current ? { ...current, removePhoto: false } : current))
    setSaved(false)
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const role = await getCurrentModerationRole()
        if (role !== 'admin') {
          if (active) setError('Only admins can edit member profiles.')
          return
        }
        const found = await adminGetProfile(id)
        if (!active) return
        if (!found) {
          setError('This member could not be found.')
          return
        }
        setProfile(found)
        setForm({ firstName: found.firstName, dateOfBirth: found.dateOfBirth, suburb: found.suburb, bio: found.bio, removePhoto: false, note: '' })
      } catch (loadError) {
        const message = typeof loadError === 'object' && loadError !== null && 'message' in loadError
          ? String((loadError as { message: unknown }).message)
          : ''
        if (active) setError(message || 'Unable to load this profile.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  const age = useMemo(() => calculateAgeFromDateOfBirth(form?.dateOfBirth ?? ''), [form?.dateOfBirth])
  const isDirty = !!form && !!profile && (
    form.firstName.trim() !== profile.firstName ||
    form.dateOfBirth !== profile.dateOfBirth ||
    form.suburb.trim() !== profile.suburb ||
    form.bio.trim() !== profile.bio ||
    form.removePhoto ||
    newPhoto !== null
  )
  const valid = !!form && !!form.firstName.trim() && !!form.suburb.trim() && age !== null && age >= 18 && age <= 99 && form.bio.length <= 150

  function update<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current))
    setSaved(false)
  }

  function backToProfile() {
    if (profile) navigate(getProfilePath({ id: profile.id, name: profile.firstName }))
    else navigate(-1)
  }

  async function save() {
    if (!form || !profile) return
    setIsSaving(true)
    setError('')
    try {
      const savedPhotoUrl = await adminUpdateProfile({
        userId: profile.id,
        firstName: form.firstName.trim(),
        dateOfBirth: form.dateOfBirth,
        suburb: form.suburb.trim(),
        bio: form.bio.trim(),
        removePhoto: form.removePhoto,
        note: form.note.trim(),
        newPhoto,
      })
      const photoUrl = savedPhotoUrl ?? (form.removePhoto ? null : profile.photoUrl)
      const updated = { ...profile, firstName: form.firstName.trim(), dateOfBirth: form.dateOfBirth, suburb: form.suburb.trim(), bio: form.bio.trim(), photoUrl }
      setNewPhoto(null)
      setNewPhotoUrl(null)
      setProfile(updated)
      setForm({ ...form, removePhoto: false, note: '' })
      setSaved(true)
    } catch (saveError) {
      // Database errors are plain objects with a message, not Error instances.
      const message = typeof saveError === 'object' && saveError !== null && 'message' in saveError
        ? String((saveError as { message: unknown }).message)
        : ''
      setError(message || 'Unable to save the changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const header = (
    <header className="edit-page-header">
      <button type="button" className="icon-button" aria-label="Back" onClick={backToProfile}>
        <ArrowLeft />
      </button>
      <div>
        <p className="eyebrow">Admin</p>
        <h1>Edit member profile</h1>
      </div>
    </header>
  )

  if (isLoading) {
    return <main className="screen edit-profile-page">{header}<p className="more-settings-note">Loading profile…</p></main>
  }

  if (!form || !profile) {
    return <main className="screen edit-profile-page">{header}<p className="edit-form-error" role="alert">{error || 'Unable to load this profile.'}</p></main>
  }

  return (
    <main className="screen edit-profile-page">
      {header}

      <p className="admin-edit-notice" role="note">
        <ShieldCheck aria-hidden="true" />
        <span>
          You’re editing <strong>{profile.firstName}</strong>’s profile{profile.email ? ` (${profile.email})` : ''}. Only change what he asked for help
          with. He gets a notification listing what you changed.
        </span>
      </p>

      <section className="admin-edit-photo">
        <Avatar name={form.firstName || profile.firstName} photoUrl={newPhotoUrl ?? (form.removePhoto ? null : profile.photoUrl)} size={96} />
        <div className="edit-photo-actions">
          <button type="button" className="secondary-action" onClick={() => photoInputRef.current?.click()}><ImagePlus />Choose photo</button>
          <button type="button" className="secondary-action" onClick={() => cameraInputRef.current?.click()}><Camera />Take photo</button>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} hidden />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} hidden />
        {newPhoto ? (
          <button type="button" className="text-action" onClick={() => { setNewPhoto(null); setNewPhotoUrl(null) }}>Undo new photo</button>
        ) : profile.photoUrl && (
          <label className="admin-edit-check">
            <input type="checkbox" checked={form.removePhoto} onChange={(event) => update('removePhoto', event.target.checked)} />
            <span>Remove profile photo</span>
          </label>
        )}
        {photoToCrop && (
          <PhotoCropDialog file={photoToCrop} onCancel={() => setPhotoToCrop(null)} onDone={handlePhotoCropped} />
        )}
      </section>

      <div className="edit-profile-fields">
        <label className="edit-field">
          <span>Username</span>
          <input value={form.firstName} maxLength={40} onChange={(event) => update('firstName', event.target.value)} />
        </label>

        <div className="edit-field-row">
          <label className="edit-field">
            <span>Date of birth</span>
            <input type="date" value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} required />
          </label>
          <div className="edit-age-field" aria-live="polite">
            <span>Age</span>
            <strong>{age ?? '—'}</strong>
          </div>
        </div>

        <label className="edit-field">
          <span>Location</span>
          <SuburbInput value={form.suburb} onChange={(value) => update('suburb', value)} ariaLabel="Location: suburb or town" />
        </label>

        <label className="edit-field">
          <span>Bio <small>Optional · {form.bio.length}/150</small></span>
          <textarea value={form.bio} maxLength={150} rows={3} onChange={(event) => update('bio', event.target.value)} />
        </label>

        <label className="edit-field">
          <span>Note to member <small>Optional · shown in his notification · {form.note.length}/280</small></span>
          <textarea
            value={form.note}
            maxLength={280}
            rows={2}
            placeholder="For example: Fixed your date of birth as you asked."
            onChange={(event) => update('note', event.target.value)}
          />
        </label>
      </div>

      {error && <p className="edit-form-error" role="alert">{error}</p>}
      {saved && <p className="admin-edit-saved" role="status">Saved. {profile.firstName} has been notified.</p>}

      <div className="edit-form-actions">
        <button type="button" className="secondary-action" onClick={backToProfile} disabled={isSaving}>
          {saved ? 'Back to profile' : 'Cancel'}
        </button>
        <button type="button" className="primary-action" onClick={() => void save()} disabled={!valid || !isDirty || isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </main>
  )
}
