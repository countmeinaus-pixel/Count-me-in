import { ArrowLeft, CheckCircle2, Send, ShieldAlert, ShieldCheck } from "lucide-react"
import { ChatSkeleton } from '../components/Skeleton'
import { type FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  acknowledgeStaffMessage,
  getMyStaffMessages,
  isOpenStaffMessage,
  replyToStaffMessage,
  type StaffMessage,
} from "../lib/staffMessages"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

// A warning or message from the Count Me In team. Stays pinned in Chats until
// the member taps "I understand" or replies.
export function StaffMessageScreen({ embedded = false }: { embedded?: boolean }) {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState<StaffMessage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    const all = await getMyStaffMessages()
    setMessage(all.find((item) => item.id === id) ?? null)
  }

  useEffect(() => {
    let active = true
    getMyStaffMessages()
      .then((all) => {
        if (active) setMessage(all.find((item) => item.id === id) ?? null)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this message.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  async function run(action: () => Promise<void>) {
    setIsBusy(true)
    setError("")
    try {
      await action()
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong. Try again.")
    } finally {
      setIsBusy(false)
    }
  }

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!message || !reply.trim()) return
    void run(async () => {
      await replyToStaffMessage(message.id, reply.trim())
      setReply("")
    })
  }

  const back = !embedded && (
    <button type="button" className="icon-button small" aria-label="Back to chats" onClick={() => navigate("/chats")}>
      <ArrowLeft aria-hidden="true" />
    </button>
  )

  if (isLoading) {
    return (
      <main className={`chat-thread-screen ${embedded ? "embedded" : ""}`}>
        <ChatSkeleton label="Loading message" />
      </main>
    )
  }

  if (!message) {
    return (
      <main className={`chat-thread-screen chat-thread-missing ${embedded ? "embedded" : ""}`}>
        <h1>Message unavailable</h1>
        <p>{error || "This message could not be found."}</p>
        {!embedded && (
          <button type="button" className="text-action" onClick={() => navigate("/chats")}>Back to chats</button>
        )}
      </main>
    )
  }

  const isWarning = message.kind === "warning"
  const isOpen = isOpenStaffMessage(message)
  const Icon = isWarning ? ShieldAlert : ShieldCheck

  return (
    <main className={`chat-thread-screen ${embedded ? "embedded" : ""}`}>
      <header className="chat-thread-header">
        {back}
        <span className={`staff-icon ${isWarning ? "warning" : ""}`} aria-hidden="true"><Icon /></span>
        <div className="chat-thread-title staff-thread-title">
          <strong>Count Me In team</strong>
          <span>{isWarning ? "Warning" : "Message"}</span>
        </div>
      </header>

      <div className="chat-messages staff-messages">
        <div className={`staff-bubble ${isWarning ? "warning" : ""}`}>
          {isWarning && <p className="staff-bubble-label"><ShieldAlert aria-hidden="true" /> Warning</p>}
          <p>{message.body}</p>
          <time>{formatDate(message.createdAt)}</time>
        </div>

        {message.reply && (
          <div className="chat-bubble mine">
            <p>{message.reply}</p>
            <time>{formatDate(message.repliedAt)}</time>
          </div>
        )}

        {message.acknowledgedAt && !message.reply && (
          <p className="staff-status" role="status">
            <CheckCircle2 aria-hidden="true" /> You confirmed this on {formatDate(message.acknowledgedAt)}.
          </p>
        )}
      </div>

      {error && <p className="chat-error" role="alert">{error}</p>}

      {isOpen ? (
        <div className="staff-actions">
          <button type="button" className="button button-primary button-md" disabled={isBusy} onClick={() => void run(() => acknowledgeStaffMessage(message.id))}>
            <CheckCircle2 aria-hidden="true" />
            {isWarning ? "I understand and will follow the community guidelines" : "Got it"}
          </button>
          <form className="message-input" onSubmit={handleReply}>
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Or reply to the team"
              aria-label="Reply to the Count Me In team"
              maxLength={1000}
              disabled={isBusy}
            />
            <button type="submit" aria-label="Send reply" disabled={!reply.trim() || isBusy}>
              <Send aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : !message.reply ? (
        <form className="message-input" onSubmit={handleReply}>
          <input
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Reply to the team (optional)"
            aria-label="Reply to the Count Me In team"
            maxLength={1000}
            disabled={isBusy}
          />
          <button type="submit" aria-label="Send reply" disabled={!reply.trim() || isBusy}>
            <Send aria-hidden="true" />
          </button>
        </form>
      ) : (
        <p className="direct-chat-readonly" role="note">Thanks for your reply. The team will get back to you if needed.</p>
      )}
    </main>
  )
}
