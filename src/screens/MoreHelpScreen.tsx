import { ClipboardCopy } from 'lucide-react'
import { useState } from 'react'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'

export function MoreHelpScreen() {
  const backToMore = useBackToMore()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function copyFeedback() {
    const feedback = [subject.trim(), message.trim()].filter(Boolean).join('\n\n')
    if (!feedback) {
      setError('Add a subject or message first.')
      setStatus('')
      return
    }

    try {
      await navigator.clipboard.writeText(feedback)
      setStatus('Feedback copied. Paste it into an email or message to send it.')
      setError('')
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy feedback on this device.')
      setStatus('')
    }
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Help and feedback" onBack={backToMore} />
      <p className="more-settings-intro">Share an idea, ask a question or let us know if something isn’t working.</p>
      <label className="more-feedback-field">
        <span>Subject</span>
        <input value={subject} maxLength={100} onChange={(event) => setSubject(event.target.value)} />
      </label>
      <label className="more-feedback-field">
        <span>Message</span>
        <textarea value={message} rows={6} maxLength={1000} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <p className="more-settings-note">Feedback isn’t sent from this prototype yet. Copy it, then paste it into your email or messages.</p>
      {status && <p className="more-status-message" role="status">{status}</p>}
      {error && <p className="more-status-message error" role="alert">{error}</p>}
      <button type="button" className="primary-action more-feedback-copy" onClick={() => void copyFeedback()}>
        <ClipboardCopy aria-hidden="true" />Copy feedback
      </button>
    </main>
  )
}
