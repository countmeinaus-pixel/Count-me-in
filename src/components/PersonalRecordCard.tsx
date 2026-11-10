import { BadgeCheck, Flag, ThumbsUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatPrValue } from '../data/prTypes'
import {
  deletePersonalRecord,
  prVerifyThreshold,
  voteOnPersonalRecord,
  type PersonalRecord,
} from '../lib/personalRecords'
import { Avatar } from './Avatar'

type Props = {
  record: PersonalRecord
  showOwner?: boolean
  onChanged: () => void
  onOpenOwner?: () => void
}

export function PersonalRecordCard({ record, showOwner = false, onChanged, onOpenOwner }: Props) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [photoOpen, setPhotoOpen] = useState(false)
  const verified = record.confirmCount >= prVerifyThreshold
  const hidden = record.flagCount >= prVerifyThreshold
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
    <article className={`pr-card ${verified ? 'verified' : ''}`}>
      <button
        type="button"
        className="pr-card-photo"
        onClick={() => setPhotoOpen(true)}
        aria-label={`View proof photo for ${label}`}
      >
        <img src={record.photoUrl} alt="" loading="lazy" />
      </button>
      <div className="pr-card-body">
        {showOwner && (
          <button type="button" className="pr-card-owner" onClick={onOpenOwner}>
            <Avatar name={record.ownerName} photoUrl={record.ownerPhotoUrl} size={32} />
            <span>{record.ownerName}</span>
          </button>
        )}
        <p className="eyebrow">{record.sport}</p>
        <strong className="pr-card-label">{label}</strong>
        <span className="pr-card-value">{formatPrValue(record.type, record.value)}</span>
        {record.note && <p className="pr-card-note">{record.note}</p>}
        <span className={`pr-card-status ${verified ? 'verified' : ''}`}>
          {hidden
            ? 'Hidden: flagged by 3 members, waiting for a moderator'
            : verified
              ? <><BadgeCheck aria-hidden="true" /> Verified by {record.confirmCount} members</>
              : `${record.confirmCount} of ${prVerifyThreshold} confirms`}
        </span>

        {record.viewerIsOwner ? (
          <button
            type="button"
            className="pr-card-delete"
            disabled={isBusy}
            onClick={() => {
              if (window.confirm('Remove this PR? Its confirms will be lost.')) {
                void run(() => deletePersonalRecord(record))
              }
            }}
          >
            <Trash2 aria-hidden="true" /> Remove
          </button>
        ) : (
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

      {photoOpen && (
        <div className="pr-photo-viewer" role="dialog" aria-modal="true" aria-label={`Proof photo for ${label}`} onClick={() => setPhotoOpen(false)}>
          <img src={record.photoUrl} alt={`Proof for ${record.ownerName}'s ${label}`} />
          <button type="button" className="button button-secondary button-md" onClick={() => setPhotoOpen(false)}>Close</button>
        </div>
      )}
    </article>
  )
}
