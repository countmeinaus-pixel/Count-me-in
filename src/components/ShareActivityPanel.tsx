import { Link2, MessageCircle, Share2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activityShareMessage } from '../lib/activityLinks'
import { getChatThreadsForViewer, sendSavedChatMessage } from '../lib/chat'
import { directChatPath, getDirectChatsForViewer, sendDirectMessage } from '../lib/directChats'
import { SidePanel } from './SidePanel'

type ChatTarget = { key: string; kind: 'group' | 'direct'; id: string; title: string; photoUrl: string | null; lastMessageAt: number }

// Share an activity: send it as a card into one of your chats, or share the
// link outside the app (WhatsApp etc.).
export function ShareActivityPanel({
  activityId,
  activityTitle,
  onShareOutside,
  onClose,
}: {
  activityId: string
  activityTitle: string
  onShareOutside: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatTarget[] | null>(null)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      getChatThreadsForViewer().catch(() => []),
      getDirectChatsForViewer().catch(() => []),
    ]).then(([groups, directs]) => {
      if (!active) return
      setChats([
        ...groups.filter((chat) => !chat.closedAt).map((chat) => ({
          key: `group-${chat.id}`, kind: 'group' as const, id: chat.id, title: chat.title, photoUrl: null, lastMessageAt: chat.lastMessageAt,
        })),
        ...directs.map((chat) => ({
          key: `direct-${chat.id}`, kind: 'direct' as const, id: chat.id, title: chat.friendName, photoUrl: chat.friendPhotoUrl, lastMessageAt: chat.lastMessageAt,
        })),
      ].sort((left, right) => right.lastMessageAt - left.lastMessageAt))
    })
    return () => { active = false }
  }, [])

  async function sendTo(chat: ChatTarget) {
    setSendingTo(chat.key)
    setError('')
    try {
      const message = activityShareMessage(activityId)
      if (chat.kind === 'group') await sendSavedChatMessage(chat.id, message)
      else await sendDirectMessage(chat.id, message)
      navigate(chat.kind === 'group' ? `/chats/${chat.id}` : directChatPath(chat.id))
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to share this activity.')
      setSendingTo(null)
    }
  }

  return (
    <SidePanel title="Share activity" onClose={onClose}>
      <p className="invite-intro">Send “{activityTitle}” to a chat. It shows as a card your mates can tap.</p>
      <div className="invite-options">
        {chats === null && <p className="more-settings-note" role="status">Loading your chats…</p>}
        {chats?.length === 0 && <p className="more-settings-note">No chats yet. Join an activity or add a friend to start one.</p>}
        {chats?.map((chat) => (
          <button key={chat.key} type="button" className="invite-option" disabled={sendingTo !== null} onClick={() => void sendTo(chat)}>
            <span className="invite-option-icon">
              {chat.photoUrl
                ? <img src={chat.photoUrl} alt="" className="share-chat-photo" />
                : chat.kind === 'group' ? <Users aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
            </span>
            <span>
              <strong>{chat.title}</strong>
              <small>{sendingTo === chat.key ? 'Sending…' : chat.kind === 'group' ? 'Group chat' : 'Friend'}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="invite-options">
        <button type="button" className="invite-option" onClick={() => { onClose(); onShareOutside() }}>
          <span className="invite-option-icon">{'share' in navigator ? <Share2 aria-hidden="true" /> : <Link2 aria-hidden="true" />}</span>
          <span><strong>Share outside the app</strong><small>WhatsApp, Messenger or copy the link</small></span>
        </button>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </SidePanel>
  )
}
