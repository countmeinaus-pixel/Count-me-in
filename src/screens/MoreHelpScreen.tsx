import { ClipboardCopy, Compass, Presentation } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetTour } from '../lib/onboardingFlags'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'

export function MoreHelpScreen() {
  const backToMore = useBackToMore()
  const navigate = useNavigate()
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
      <section className="help-tour-actions" aria-label="Get to know the app">
        <button
          type="button"
          className="button button-secondary button-md"
          onClick={() => {
            resetTour()
            navigate('/', { state: { startTour: true } })
          }}
        >
          <Compass aria-hidden="true" /> Take the app tour again
        </button>
        <button type="button" className="button button-secondary button-md" onClick={() => navigate('/welcome')}>
          <Presentation aria-hidden="true" /> See the welcome slides
        </button>
      </section>
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
