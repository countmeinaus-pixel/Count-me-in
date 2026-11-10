import { BadgeCheck, Flag, ImageIcon, ShieldCheck, ThumbsUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatPrValue } from '../data/prTypes'
import {
  deletePersonalRecord,
  isRecordVerified,
  prVerifyThreshold,
  removePersonalRecordById,
  staffVerifyRecord,
  voteOnPersonalRecord,
  type PersonalRecord,
} from '../lib/personalRecords'
import { Avatar } from './Avatar'

type Props = {
  record: PersonalRecord
  showOwner?: boolean
  onChanged: () => void
  onOpenOwner?: () => void
  // Admins and moderators: verify or remove instead of confirm and flag.
  staffMode?: boolean
}

export function PersonalRecordCard({ record, showOwner = false, onChanged, onOpenOwner, staffMode = false }: Props) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [photoOpen, setPhotoOpen] = useState(false)
  const verified = isRecordVerified(record)
  const hidden = record.flagCount >= prVerifyThreshold && !record.staffVerified
  const label = record.type?.label ?? record.recordType

  async function run(action: () => Promise<void>) {
    setIsBusy(true)
    setError('')
    try {
      await action()
      onChanged()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong. Try again.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <article className={`pr-card ${verified ? 'pr-card-verified' : ''}`}>
      <div className="pr-card-body">
        {showOwner && (
          <button type="button" className="pr-card-owner" onClick={onOpenOwner}>
            <Avatar name={record.ownerName} photoUrl={record.ownerPhotoUrl} size={32} />
            <span>{record.ownerName}</span>
          </button>
        )}
        {record.viewerIsOwner && !staffMode && (
          <button
            type="button"
            className="pr-card-delete"
            aria-label={`Remove ${label} PR`}
            title="Remove"
            disabled={isBusy}
            onClick={() => {
              if (window.confirm('Remove this PR? Its confirms will be lost.')) {
                void run(() => deletePersonalRecord(record))
              }
            }}
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
        <p className="eyebrow">{record.sport}</p>
        <strong className="pr-card-label">{label}</strong>
        <span className="pr-card-value">
          {formatPrValue(record.type, record.value)}
          {verified && !hidden && (
            <BadgeCheck
              className="pr-card-verified-icon"
              role="img"
              aria-label={record.staffVerified ? 'Verified by a moderator' : `Verified by ${record.confirmCount} members`}
            >
              <title>{record.staffVerified ? 'Verified by a moderator' : `Verified by ${record.confirmCount} members`}</title>
            </BadgeCheck>
          )}
        </span>
        {record.note && <p className="pr-card-note">{record.note}</p>}
        {(hidden || !verified) && (
          <span className="pr-card-status">
            {hidden
              ? 'Hidden: flagged by 3 members, waiting for a moderator'
              : `${record.confirmCount} of ${prVerifyThreshold} confirms${record.flagCount > 0 ? ` · ${record.flagCount} ${record.flagCount === 1 ? 'flag' : 'flags'}` : ''}`}
          </span>
        )}
        {record.photoUrl && !verified && (
          <button type="button" className="pr-card-proof" onClick={() => setPhotoOpen(true)}>
            <ImageIcon aria-hidden="true" /> View proof
          </button>
        )}

        {staffMode ? (
          <div className="pr-card-actions">
            <button
              type="button"
              className="pr-vote active"
              disabled={isBusy}
              onClick={() => void run(() => staffVerifyRecord(record.id))}
            >
              <ShieldCheck aria-hidden="true" /> Verify
            </button>
            <button
              type="button"
              className="pr-vote flag"
              disabled={isBusy}
              onClick={() => {
                if (window.confirm(`Remove ${record.ownerName}'s PR and its proof photo for good?`)) {
                  void run(() => removePersonalRecordById(record.id))
                }
              }}
            >
              <Trash2 aria-hidden="true" /> Remove
            </button>
          </div>
        ) : record.viewerIsOwner || (verified && !hidden) ? null : (
          // Verified PRs need no more confirms or flags.
          <div className="pr-card-actions">
            <button
              type="button"
              className={`pr-vote ${record.viewerVote === 'confirm' ? 'active' : ''}`}
              aria-pressed={record.viewerVote === 'confirm'}
              disabled={isBusy}
              onClick={() => void run(() => voteOnPersonalRecord(record.id, record.viewerVote === 'confirm' ? null : 'confirm'))}
            >
              <ThumbsUp aria-hidden="true" /> {record.viewerVote === 'confirm' ? 'Confirmed' : 'Confirm'}
            </button>
            <button
              type="button"
              className={`pr-vote flag ${record.viewerVote === 'flag' ? 'active' : ''}`}
              aria-pressed={record.viewerVote === 'flag'}
              disabled={isBusy}
              onClick={() => void run(() => voteOnPersonalRecord(record.id, record.viewerVote === 'flag' ? null : 'flag'))}
            >
              <Flag aria-hidden="true" /> {record.viewerVote === 'flag' ? 'Flagged' : 'Flag'}
            </button>
          </div>
        )}
        {error && <p className="activity-join-error" role="alert">{error}</p>}
      </div>

      {photoOpen && record.photoUrl && (
        <div className="pr-photo-viewer" role="dialog" aria-modal="true" aria-label={`Proof photo for ${label}`} onClick={() => setPhotoOpen(false)}>
          <img src={record.photoUrl} alt={`Proof for ${record.ownerName}'s ${label}`} />
          <button type="button" className="button button-secondary button-md" onClick={() => setPhotoOpen(false)}>Close</button>
        </div>
      )}
    </article>
  )
}
