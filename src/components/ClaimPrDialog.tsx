import { ImagePlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parsePrTime, prSports, prTypes } from '../data/prTypes'
import { claimPersonalRecord } from '../lib/personalRecords'

type Props = {
  preferredSports: string[]
  onClose: () => void
  onClaimed: () => void
}

export function ClaimPrDialog({ preferredSports, onClose, onClaimed }: Props) {
  const sports = useMemo(() => {
    const mine = prSports.filter((sport) => preferredSports.includes(sport))
    return [...mine, ...prSports.filter((sport) => !mine.includes(sport))]
  }, [preferredSports])
  const [sport, setSport] = useState(sports[0] ?? '')
  const typesForSport = prTypes.filter((type) => type.sport === sport)
  const [typeKey, setTypeKey] = useState(typesForSport[0]?.key ?? '')
  const type = prTypes.find((item) => item.key === typeKey) ?? null
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  function changeSport(nextSport: string) {
    setSport(nextSport)
    setTypeKey(prTypes.find((item) => item.sport === nextSport)?.key ?? '')
    setValue('')
  }

  async function submit() {
    if (!type) return
    const parsed = type.format === 'time' ? parsePrTime(value) : Number.parseFloat(value.replace(',', '.'))
    if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) {
      setError(type.format === 'time'
        ? 'Enter a time like 24:30 (minutes:seconds) or 1:45:00 (hours:minutes:seconds).'
        : 'Enter a number bigger than 0.')
      return
    }
    if (!photo) {
      setError('Add a photo as proof, for example a watch, app screenshot or the catch.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await claimPersonalRecord({ sport, recordType: type.key, value: parsed, note, photo })
      onClaimed()
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : 'Unable to claim this PR.')
      setIsSaving(false)
    }
  }

  return (
    <div className="report-dialog-backdrop" role="presentation">
      <form
        className="report-dialog claim-pr-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-pr-title"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h2 id="claim-pr-title">Claim a PR</h2>
        <p className="leave-sheet-note">Add a photo as proof. Other members can confirm it; after 3 confirms it gets a verified tick.</p>

        <label className="report-field">
          <span>Sport</span>
          <select value={sport} onChange={(event) => changeSport(event.target.value)}>
            {sports.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="report-field">
          <span>Record</span>
          <select value={typeKey} onChange={(event) => {
            setTypeKey(event.target.value)
            setValue('')
          }}>
            {typesForSport.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
        <label className="report-field">
          <span>
            {type?.format === 'time'
              ? 'Time (h:mm:ss or mm:ss)'
              : `Value${type?.unit ? ` (${type.unit})` : ''}`}
          </span>
          <input
            inputMode={type?.format === 'time' ? 'text' : 'decimal'}
            value={value}
            placeholder={type?.format === 'time' ? 'For example, 24:30' : 'For example, 18'}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </label>
        <div className="report-field">
          <span>Proof photo</span>
          <input
            ref={photoInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            aria-label="Choose a proof photo"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setPhoto(file)
              setPhotoPreview(file ? URL.createObjectURL(file) : null)
            }}
          />
          {photoPreview && <img className="claim-pr-preview" src={photoPreview} alt="Selected proof" />}
          <button type="button" className="button button-secondary button-md" onClick={() => photoInputRef.current?.click()}>
            <ImagePlus aria-hidden="true" /> {photo ? 'Change photo' : 'Add photo'}
          </button>
        </div>
        <label className="report-field">
          <span>Note (optional)</span>
          <textarea rows={2} maxLength={200} value={note} placeholder="Where and how, for example Rapid Bay jetty." onChange={(event) => setNote(event.target.value)} />
        </label>

        {error && <p className="activity-join-error" role="alert">{error}</p>}
        <div className="report-dialog-actions">
          <button type="button" className="button button-secondary button-md" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="button button-primary button-md" disabled={isSaving}>
            {isSaving ? 'Uploading…' : 'Claim PR'}
          </button>
        </div>
      </form>
    </div>
  )
}
