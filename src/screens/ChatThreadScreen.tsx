import { ArrowLeft, Fish, Footprints, Mountain, Send } from "lucide-react"
import { FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  getChatMessages,
  getChatThread,
  markChatRead,
  sendChatMessage,
  type ChatMessage,
} from "../lib/chat"

const icons = {
  fish: Fish,
  mountain: Mountain,
  run: Footprints,
}

export function ChatThreadScreen() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const thread = getChatThread(id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const Icon = thread ? icons[thread.sport] : Fish

  useEffect(() => {
    if (!thread) return
    markChatRead(thread.id)
    setMessages(getChatMessages(thread.id))
  }, [id, thread])

  useEffect(() => {
    const messageList = messageListRef.current
    if (messageList) messageList.scrollTop = messageList.scrollHeight
  }, [messages])

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !thread) return

    const message = sendChatMessage(thread.id, text)
    setMessages((current) => [...current, message])
    setDraft("")
  }

  if (!thread) {
    return (
      <main className="chat-thread-screen chat-thread-missing">
        <h1>Chat not found</h1>
        <p>This chat may have been removed.</p>
        <button
          type="button"
          className="text-action"
          onClick={() => navigate("/chats")}
        >
          Back to chats
        </button>
      </main>
    )
  }

  return (
    <main className="chat-thread-screen">
      <header className="chat-thread-header">
        <button
          type="button"
          className="icon-button small"
          aria-label="Back to chats"
          onClick={() => navigate("/chats")}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="chat-thread-sport-icon">
          <Icon aria-hidden="true" />
        </div>
        <div className="chat-thread-title">
          <strong>{thread.title}</strong>
          <span>{thread.participants.length} members</span>
        </div>
        <div
          className="chat-member-stack"
          aria-label={`Members: ${thread.participants.join(", ")}`}
        >
          {thread.participants.slice(0, 3).map((name) => (
            <span
              className="chat-member-avatar"
              key={name}
              title={name}
              aria-hidden="true"
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      </header>

      <div className="chat-messages" ref={messageListRef} aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-bubble ${
              message.mine ? "mine" : message.type === "system" ? "system" : ""
            }`}
          >
            {!message.mine && message.type !== "system" && (
              <small>{message.sender}</small>
            )}
            <p>{message.text}</p>
            <time>{message.time}</time>
          </div>
        ))}
      </div>

      <form className="message-input" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message the group"
          aria-label="Type a message"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim()}
        >
          <Send aria-hidden="true" />
        </button>
      </form>
    </main>
  )
}
