import { ArrowLeft, Fish, Footprints, Mountain, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { chatMessagesByThread, chatThreads, getChatMessages, sendChatMessage } from '../lib/chat'

const icons = {
  fish: Fish,
  mountain: Mountain,
  run: Footprints,
}

export function ChatsScreen() {
  const navigate = useNavigate()
  const [selectedThreadId, setSelectedThreadId] = useState(chatThreads[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const [messagesByThread, setMessagesByThread] = useState(chatMessagesByThread)

  const selectedThread = useMemo(
    () => chatThreads.find((thread) => thread.id === selectedThreadId) ?? chatThreads[0],
    [selectedThreadId],
  )

  const selectedMessages = messagesByThread[selectedThreadId] ?? getChatMessages(selectedThreadId)

  function handleSend() {
    if (!draft.trim() || !selectedThreadId) return

    const newMessage = sendChatMessage(selectedThreadId, draft.trim())
    setMessagesByThread((current) => ({
      ...current,
      [selectedThreadId]: [...(current[selectedThreadId] ?? []), newMessage],
    }))
    setDraft('')
  }

  return (
    <div className="screen chats-screen">
      <header className="page-title">
        <p className="eyebrow">Your crew</p>
        <h1>Chats</h1>
      </header>

      {chatThreads.length === 0 ? (
        <div className="empty-state-card compact">
          <div className="empty-state-icon">✦</div>
          <h3>No group chats yet</h3>
          <p>Join or host an activity to start chatting with the crew.</p>
          <Button onClick={() => navigate('/')} variant="secondary">Back to home</Button>
        </div>
      ) : (
      <div className="chat-layout">
        <div className="chat-list">
          {chatThreads.map((chat) => {
            const Icon = icons[chat.sport as keyof typeof icons] ?? Fish
            const isSelected = chat.id === selectedThreadId

            return (
              <button
                key={chat.id}
                type="button"
                className={`chat-row ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedThreadId(chat.id)}
              >
                <div className="sport-icon"><Icon /></div>
                <div className="grow">
                  <strong>{chat.title}</strong>
                  <p>{chat.preview}</p>
                </div>
                <div className="chat-meta">
                  <span>{chat.time}</span>
                  {chat.unread && <i />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="chat-thread">
          {selectedThread && (
            <>
              <div className="chat-thread-header">
                <button type="button" className="icon-button small" aria-label="Back to list" onClick={() => setSelectedThreadId(chatThreads[0].id)}>
                  <ArrowLeft />
                </button>
                <div>
                  <strong>{selectedThread.title}</strong>
                  <span>{selectedThread.participants.join(', ')}</span>
                </div>
              </div>

              <div className="chat-messages">
                {selectedMessages.map((message) => (
                  <div key={message.id} className={`chat-bubble ${message.mine ? 'mine' : message.type === 'system' ? 'system' : ''}`}>
                    {!message.mine && message.type !== 'system' && <small>{message.sender}</small>}
                    <p>{message.text}</p>
                    <time>{message.time}</time>
                  </div>
                ))}
              </div>

              <div className="message-input">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Message the group"
                  aria-label="Type a message"
                />
                <button type="button" onClick={handleSend} aria-label="Send message">
                  <Send />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
