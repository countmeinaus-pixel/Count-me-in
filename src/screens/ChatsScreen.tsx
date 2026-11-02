import { Fish, Footprints, Mountain } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/Button"
import { getChatThreads } from "../lib/chat"

const icons = {
  fish: Fish,
  mountain: Mountain,
  run: Footprints,
}

function formatChatTime(timestamp: number) {
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
  const threads = getChatThreads()

  return (
    <main className="screen chats-screen">
      <header className="page-title">
        <p className="eyebrow">Your crew</p>
        <h1>Chats</h1>
      </header>

      {threads.length === 0 ? (
        <div className="empty-state-card compact">
          <div className="empty-state-icon">✦</div>
          <h3>No chats yet</h3>
          <p>No chats yet. Join or create an activity to start one.</p>
          <Button onClick={() => navigate("/")} variant="secondary">
            Find activities
          </Button>
        </div>
      ) : (
        <div className="chat-list">
          {threads.map((chat) => {
            const Icon = icons[chat.sport]

            return (
              <button
                key={chat.id}
                type="button"
                className="chat-row"
                onClick={() => navigate(`/chats/${chat.id}`)}
                aria-label={`${chat.title}${
                  chat.unreadCount
                    ? `, ${chat.unreadCount} unread messages`
                    : ""
                }`}
              >
                <div className="sport-icon">
                  <Icon aria-hidden="true" />
                </div>
                <div className="chat-row-copy">
                  <strong className={chat.unreadCount > 0 ? "unread" : ""}>
                    {chat.title}
                  </strong>
                  <p>{chat.preview}</p>
                </div>
                <div className="chat-meta">
                  <time dateTime={new Date(chat.lastMessageAt).toISOString()}>
                    {formatChatTime(chat.lastMessageAt)}
                  </time>
                  {chat.unreadCount > 0 && (
                    <span
                      className="chat-unread-badge"
                      aria-label={`${chat.unreadCount} unread messages`}
                    >
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
