import { ArrowLeft, Ban, CheckCircle2, Clock3, MessageSquareReply, Send, ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { adminGetProfile, getCurrentModerationRole, type AdminProfile } from '../lib/moderation'
import { getProfilePath } from '../lib/profile'
import {
  getStaffMessagesForMember,
  revokeStaffMessage,
  sendStaffMessage,
  type SentStaffMessage,
  type StaffMessageKind,
} from '../lib/staffMessages'

// Ready-made texts an admin can start from and adjust.
const templates: Array<{ label: string; kind: StaffMessageKind; text: string }> = [
  {
    label: 'Respect',
    kind: 'warning',
    text: 'We received reports about how you spoke to other members. Count Me In is about respect: no insults, harassment or put-downs. Please keep it friendly, or your account may be suspended.',
  },
  {
    label: 'No-shows',
    kind: 'warning',
    text: 'You signed up for activities and didn’t turn up without letting the host know. Please use “Can’t make it” if your plans change, so others can take your spot.',
  },
  {
    label: 'Spam or selling',
    kind: 'warning',
    text: 'Count Me In is for finding activity partners, not for advertising or selling. Please remove promotional content and don’t message members about it again.',
  },
  {
    label: 'Profile',
    kind: 'message',
    text: 'Hi, we noticed something on your profile that doesn’t meet our community guidelines. Could you update it? Let us know if you need help.',
  },
]

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Admin only: send a member a warning or a message from the Count Me In team,
// and see earlier ones with their status and reply.
export function SendStaffMessageScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState<AdminProfile | null>(null)
  const [history, setHistory] = useState<SentStaffMessage[]>([])
  const [kind, setKind] = useState<StaffMessageKind>('warning')
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [isRevoking, setIsRevoking] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if ((await getCurrentModerationRole()) !== 'admin') {
          if (active) setError('Only admins can send team messages.')
          return
        }
        const [found, sent] = await Promise.all([adminGetProfile(id), getStaffMessagesForMember(id)])
        if (!active) return
        if (!found) setError('This member could not be found.')
        setMember(found)
        setHistory(sent)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this member.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  async function send() {
    if (!member || !body.trim()) return
    setIsSending(true)
    setError('')
    setNotice('')
    try {
      await sendStaffMessage(member.id, kind, body.trim())
      setBody('')
      setNotice(`${kind === 'warning' ? 'Warning' : 'Message'} sent. It’s pinned at the top of ${member.firstName}’s chats until he responds.`)
      setHistory(await getStaffMessagesForMember(member.id))
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send.')
    } finally {
      setIsSending(false)
    }
  }

  async function revoke(messageId: string) {
    if (!member) return
    setIsRevoking(true)
    setError('')
    setNotice('')
    try {
      await revokeStaffMessage(messageId, revokeReason.trim())
      setRevokingId(null)
      setRevokeReason('')
      setNotice(`Revoked. It’s gone from ${member.firstName}’s chats and he has been told it was withdrawn.`)
      setHistory(await getStaffMessagesForMember(member.id))
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke.')
    } finally {
      setIsRevoking(false)
    }
  }

  const header = (
    <header className="edit-page-header">
      <button
        type="button"
        className="icon-button"
        aria-label="Back"
        onClick={() => (member ? navigate(getProfilePath({ id: member.id, name: member.firstName })) : navigate(-1))}
      >
        <ArrowLeft />
      </button>
      <div>
        <p className="eyebrow">Admin</p>
        <h1>Warning or message</h1>
      </div>
    </header>
  )

  if (isLoading) return <main className="screen edit-profile-page">{header}<p className="more-settings-note">Loading…</p></main>
  if (!member) return <main className="screen edit-profile-page">{header}<p className="edit-form-error" role="alert">{error || 'Unable to load this member.'}</p></main>

  return (
    <main className="screen edit-profile-page">
      {header}

      <div className="staff-member">
        <Avatar name={member.firstName} photoUrl={member.photoUrl} size={48} />
        <span>
          <strong>{member.firstName}</strong>
          <small>{member.suburb}</small>
        </span>
      </div>

      <p className="admin-edit-notice" role="note">
        <ShieldCheck aria-hidden="true" />
        <span>
          {member.firstName} sees this from <strong>Count Me In team</strong>, not your name. It stays pinned at the top of his chats until he
          taps “I understand” or replies. He also gets a notification.
        </span>
      </p>

      <div className="chat-tabs staff-kind" role="radiogroup" aria-label="Type">
        {(['warning', 'message'] as const).map((option) => (
          <button key={option} type="button" role="radio" aria-checked={kind === option} className={kind === option ? 'selected' : ''} onClick={() => setKind(option)}>
            {option === 'warning' ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {option === 'warning' ? 'Warning' : 'Message'}
          </button>
        ))}
      </div>

      <div className="staff-templates" aria-label="Start from a template">
        {templates.map((template) => (
          <button
            key={template.label}
            type="button"
            className="chip"
            onClick={() => {
              setKind(template.kind)
              setBody(template.text)
            }}
          >
            {template.label}
          </button>
        ))}
      </div>

      <label className="edit-field">
        <span>{kind === 'warning' ? 'Warning' : 'Message'} <small>{body.length}/1000</small></span>
        <textarea value={body} maxLength={1000} rows={6} onChange={(event) => setBody(event.target.value)} placeholder="Write what happened and what you expect from him." />
      </label>

      {error && <p className="edit-form-error" role="alert">{error}</p>}
      {notice && <p className="admin-edit-saved" role="status">{notice}</p>}

      <button type="button" className={`button button-md staff-send ${kind === 'warning' ? 'button-destructive' : 'button-primary'}`} disabled={!body.trim() || isSending} onClick={() => void send()}>
        <Send aria-hidden="true" /> {isSending ? 'Sending…' : kind === 'warning' ? 'Send warning' : 'Send message'}
      </button>

      <h2 className="more-settings-subtitle staff-history-title">Earlier ({history.length})</h2>
      {history.length === 0 ? (
        <p className="more-settings-note">No warnings or messages sent to {member.firstName} yet.</p>
      ) : (
        <div className="staff-history">
          {history.map((item) => (
            <article key={item.id} className={`staff-history-item ${item.kind === 'warning' ? 'warning' : ''} ${item.revokedAt ? 'revoked' : ''}`}>
              <header>
                <strong>{item.kind === 'warning' ? 'Warning' : 'Message'}</strong>
                <small>{formatDate(item.createdAt)} · by {item.senderName}</small>
              </header>
              <p>{item.body}</p>
              {item.revokedAt ? (
                <p className="staff-history-status revoked">
                  <Ban aria-hidden="true" /> Revoked {formatDate(item.revokedAt)} by {item.revokedByName}{item.revokeReason ? `: “${item.revokeReason}”` : ''}
                </p>
              ) : item.reply ? (
                <p className="staff-history-status"><MessageSquareReply aria-hidden="true" /> Replied {formatDate(item.repliedAt)}: “{item.reply}”</p>
              ) : item.acknowledgedAt ? (
                <p className="staff-history-status"><CheckCircle2 aria-hidden="true" /> Confirmed {formatDate(item.acknowledgedAt)}</p>
              ) : (
                <p className="staff-history-status pending"><Clock3 aria-hidden="true" /> Waiting for {member.firstName}</p>
              )}
              {!item.revokedAt && (
                revokingId === item.id ? (
                  <div className="staff-revoke">
                    <label className="edit-field">
                      <span>Why are you revoking it? <small>Optional · shown to {member.firstName} · {revokeReason.length}/280</small></span>
                      <input
                        value={revokeReason}
                        maxLength={280}
                        placeholder="For example: Sent to the wrong member, sorry."
                        onChange={(event) => setRevokeReason(event.target.value)}
                      />
                    </label>
                    <div className="photo-crop-actions">
                      <button type="button" className="button button-secondary button-sm" disabled={isRevoking} onClick={() => { setRevokingId(null); setRevokeReason('') }}>
                        Keep it
                      </button>
                      <button type="button" className="button button-destructive button-sm" disabled={isRevoking} onClick={() => void revoke(item.id)}>
                        {isRevoking ? 'Revoking…' : `Revoke ${item.kind}`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="text-action staff-revoke-button" onClick={() => { setRevokingId(item.id); setRevokeReason('') }}>
                    <Undo2 aria-hidden="true" /> Revoke
                  </button>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
