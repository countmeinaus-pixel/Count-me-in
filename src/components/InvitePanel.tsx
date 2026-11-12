import { Check, Link2, MessageCircle, MessagesSquare, Share2 } from 'lucide-react'
import { useState } from 'react'
import {
  canUseShareSheet,
  copyInvite,
  getMessengerUrl,
  getWhatsAppUrl,
  isPhone,
  openShareSheet,
} from '../lib/invite'
import { SidePanel } from './SidePanel'

// Invite a mate: WhatsApp, Messenger (phones only), copy the link, or the device's own share menu.
export function InvitePanel({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function copy() {
    try {
      await copyInvite()
      setCopied(true)
      setError('')
    } catch {
      setError('The link could not be copied. Select it and copy it yourself: ' + window.location.origin)
    }
  }

  return (
    <SidePanel title="Invite a mate" onClose={onClose}>
      <p className="invite-intro">Send him a link to Count Me In.</p>
      <div className="invite-options">
        <a className="invite-option" href={getWhatsAppUrl()} target="_blank" rel="noreferrer">
          <span className="invite-option-icon"><MessageCircle aria-hidden="true" /></span>
          <span><strong>WhatsApp</strong><small>Opens WhatsApp with the message ready</small></span>
        </a>
        {isPhone() && (
          <a className="invite-option" href={getMessengerUrl()}>
            <span className="invite-option-icon"><MessagesSquare aria-hidden="true" /></span>
            <span><strong>Messenger</strong><small>Opens the Messenger app</small></span>
          </a>
        )}
        <button type="button" className="invite-option" onClick={() => void copy()}>
          <span className="invite-option-icon">{copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}</span>
          <span><strong>{copied ? 'Copied' : 'Copy link'}</strong><small>Paste it anywhere, like an Instagram message</small></span>
        </button>
        {canUseShareSheet() && (
          <button type="button" className="invite-option" onClick={() => void openShareSheet()}>
            <span className="invite-option-icon"><Share2 aria-hidden="true" /></span>
            <span><strong>More…</strong><small>Your device’s share menu</small></span>
          </button>
        )}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </SidePanel>
  )
}
