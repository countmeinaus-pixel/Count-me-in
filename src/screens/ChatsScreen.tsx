import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/Button"
import { SportIcon } from "../components/SportIcon"
import { getChatThreadsForViewer, type ChatThread } from "../lib/chat"

function formatChatTime(timestamp: number) {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    })
  }
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("en-AU", { weekday: "short" })
  }
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

export function ChatsScreen() {
  const navigate = useNavigate()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    async function loadThreads() {
      try {
        const result = await getChatThreadsForViewer()
        if (active) setThreads(result)
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your chats.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadThreads()
    const refresh = () => void loadThreads()
    window.addEventListener("count-me-in-chat-unread-changed", refresh)
    return () => {
      active = false
      window.removeEventListener("count-me-in-chat-unread-changed", refresh)
    }
  }, [])

  return (
    <main className="screen chats-screen">
      <header className="page-title">
        <p className="eyebrow">Your crew</p>
        <h1>Chats</h1>
      </header>

      {isLoading ? (
        <p className="text-[var(--text-secondary)]">Loading your chats…</p>
      ) : error ? (
        <p className="wizard-error" role="alert">{error}</p>
      ) : threads.length === 0 ? (
        <div className="empty-state-card compact">
          <div className="empty-state-icon">✦</div>
          <h3>No chats yet</h3>
          <p>When a host accepts your request, your activity group chat will appear here.</p>
          <Button onClick={() => navigate("/")} variant="secondary">
            Find activities
          </Button>
        </div>
      ) : (
        <div className="chat-list">
          {threads.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className="chat-row"
              onClick={() => navigate(`/chats/${chat.id}`)}
              aria-label={`${chat.title}${chat.unreadCount ? `, ${chat.unreadCount} unread messages` : ""}`}
            >
              <div className="sport-icon">
                <SportIcon sport={chat.sport} />
              </div>
              <div className="chat-row-copy">
                <strong className={chat.unreadCount > 0 ? "unread" : ""}>
                  {chat.title}
                </strong>
                <p>{chat.preview}</p>
              </div>
              <div className="chat-meta">
                <time dateTime={chat.lastMessageAt ? new Date(chat.lastMessageAt).toISOString() : undefined}>
                  {formatChatTime(chat.lastMessageAt)}
                </time>
                {chat.unreadCount > 0 && (
                  <span className="chat-unread-badge" aria-label={`${chat.unreadCount} unread messages`}>
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
