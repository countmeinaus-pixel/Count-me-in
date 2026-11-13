import { useEffect, useState } from "react"
import { ListSkeleton } from '../components/Skeleton'
import { previewWithActivityLinks } from "../lib/activityLinks"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Avatar } from "../components/Avatar"
import { Button } from "../components/Button"
import { SportIcon } from "../components/SportIcon"
import { getChatThreadsForViewer, type ChatThread } from "../lib/chat"
import { directChatPath, getDirectChatsForViewer, type DirectChat } from "../lib/directChats"
import { getChatHides, hideKey } from "../lib/chatManagement"
import { useMediaQuery, wideChatLayoutQuery } from "../lib/useMediaQuery"
import { ChatThreadScreen } from "./ChatThreadScreen"
import { DirectChatScreen } from "./DirectChatScreen"
import { StaffMessageScreen } from "./StaffMessageScreen"
import { getMyStaffMessages, isOpenStaffMessage, staffMessagePath, type StaffMessage } from "../lib/staffMessages"
import { ShieldAlert, ShieldCheck } from "lucide-react"

type ChatTab = "all" | "activities" | "friends"
const tabLabels: Record<ChatTab, string> = { all: "All", activities: "Activities", friends: "Friends" }

// One row in the list: an activity group chat or a private chat with a friend.
type ChatRow = {
  key: string
  kind: "activity" | "friend" | "team"
  id: string
  path: string
  title: string
  preview: string
  lastMessageAt: number
  unreadCount: number
  sport?: string
  photoUrl?: string | null
}

function activityRow(chat: ChatThread): ChatRow {
  return {
    key: `activity-${chat.id}`, kind: "activity", id: chat.id, path: `/chats/${chat.id}`,
    title: chat.title, preview: chat.preview, lastMessageAt: chat.lastMessageAt, unreadCount: chat.unreadCount, sport: chat.sport,
  }
}

function friendRow(chat: DirectChat): ChatRow {
  return {
    key: `friend-${chat.id}`, kind: "friend", id: chat.id, path: directChatPath(chat.id),
    title: chat.friendName, preview: chat.preview, lastMessageAt: chat.lastMessageAt, unreadCount: chat.unreadCount, photoUrl: chat.friendPhotoUrl,
  }
}

function teamRow(message: StaffMessage): ChatRow {
  const isOpen = isOpenStaffMessage(message)
  return {
    key: `team-${message.id}`, kind: "team", id: message.id, path: staffMessagePath(message.id),
    title: "Count Me In team",
    preview: message.kind === "warning" ? `Warning: ${message.body}` : message.body, lastMessageAt: Date.parse(message.repliedAt ?? message.acknowledgedAt ?? message.createdAt),
    unreadCount: isOpen ? 1 : 0, sport: message.kind,
  }
}

const tabStorageKey = "count-me-in-chat-tab-v1"
function readSavedTab(): ChatTab {
  try {
    const saved = window.sessionStorage.getItem(tabStorageKey)
    return saved === "activities" || saved === "friends" ? saved : "all"
  } catch {
    return "all"
  }
}

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

// Phone: the list, or one chat full screen. Wide screens: list on the left, open chat on the right.
export function ChatsScreen() {
  const navigate = useNavigate()
  const { id: openChatId } = useParams()
  const pathname = useLocation().pathname
  const isDirectOpen = pathname.startsWith("/chats/dm/")
  const isTeamOpen = pathname.startsWith("/chats/team/")
  const isWide = useMediaQuery(wideChatLayoutQuery)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [directChats, setDirectChats] = useState<DirectChat[]>([])
  const [staffMessages, setStaffMessages] = useState<StaffMessage[]>([])
  const [tab, setTab] = useState<ChatTab>(readSavedTab)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  function chooseTab(next: ChatTab) {
    setTab(next)
    try {
      window.sessionStorage.setItem(tabStorageKey, next)
    } catch {
      // Remembering the tab is only a convenience.
    }
  }

  useEffect(() => {
    let active = true
    async function loadThreads() {
      try {
        const [groupChats, privateChats, teamMessages, hides] = await Promise.all([
          getChatThreadsForViewer(),
          getDirectChatsForViewer(),
          getMyStaffMessages().catch(() => []),
          getChatHides(),
        ])
        // Chats you removed from your list stay away until there is a newer message.
        const isVisible = (key: string, lastMessageAt: number) => lastMessageAt > (hides.get(key) ?? 0)
        if (active) {
          setThreads(groupChats.filter((chat) => isVisible(hideKey("activity", chat.id), chat.lastMessageAt)))
          setDirectChats(privateChats.filter((chat) => isVisible(hideKey("direct", chat.id), chat.lastMessageAt)))
          setStaffMessages(teamMessages)
        }
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

  if (openChatId && !isWide) return isTeamOpen ? <StaffMessageScreen /> : isDirectOpen ? <DirectChatScreen /> : <ChatThreadScreen />

  const rowsByTab: Record<ChatTab, ChatRow[]> = {
    activities: threads.map(activityRow),
    friends: directChats.map(friendRow),
    all: [...threads.map(activityRow), ...directChats.map(friendRow), ...staffMessages.filter((message) => !isOpenStaffMessage(message)).map(teamRow)]
      .sort((left, right) => right.lastMessageAt - left.lastMessageAt),
  }
  // Open team messages stay pinned at the top of every tab until handled.
  const pinned = staffMessages.filter(isOpenStaffMessage).map(teamRow)
  const rows = [...pinned, ...rowsByTab[tab]]
  const unreadIn = (key: ChatTab) => rowsByTab[key].filter((row) => row.unreadCount > 0).length
  const openKey = openChatId ? `${isTeamOpen ? "team" : isDirectOpen ? "friend" : "activity"}-${openChatId}` : null

  const emptyState =
    tab === "friends" ? (
      <div className="empty-state-card compact">
        <div className="empty-state-icon">✦</div>
        <h3>No private chats yet</h3>
        <p>Open a friend’s profile and tap Message to start a chat. Only friends can message each other.</p>
        <Button onClick={() => navigate("/friends")} variant="secondary">See your friends</Button>
      </div>
    ) : (
      <div className="empty-state-card compact">
        <div className="empty-state-icon">✦</div>
        <h3>No chats yet</h3>
        <p>When a host accepts your request, your activity group chat appears here. Chats with friends show up here too.</p>
        <Button onClick={() => navigate("/")} variant="secondary">Find activities</Button>
      </div>
    )

  const chatList = (
    <>
      <div className="chat-tabs" role="tablist" aria-label="Chats">
        {(Object.keys(tabLabels) as ChatTab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "selected" : ""}
            onClick={() => chooseTab(key)}
          >
            {tabLabels[key]}
            {unreadIn(key) > 0 && <span className="chat-tab-dot" aria-label={`${unreadIn(key)} unread`} />}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} label="Loading your chats" />
      ) : error ? (
        <p className="wizard-error" role="alert">{error}</p>
      ) : rows.length === 0 ? (
        emptyState
      ) : (
        <div className="chat-list" role="tabpanel">
          {rows.map((chat) => (
            <button
              key={chat.key}
              type="button"
              className={`chat-row ${chat.key === openKey ? "active" : ""} ${chat.kind === "team" && chat.unreadCount > 0 ? `chat-row-pinned ${chat.sport === "warning" ? "warning" : ""}` : ""}`}
              aria-current={chat.key === openKey ? "true" : undefined}
              onClick={() => navigate(chat.path)}
              aria-label={`${chat.kind === "friend" ? "Chat with " : ""}${chat.title}${chat.unreadCount ? `, ${chat.unreadCount} unread messages` : ""}`}
            >
              {chat.kind === "team" ? (
                <span className={`staff-icon ${chat.sport === "warning" ? "warning" : ""}`} aria-hidden="true">
                  {chat.sport === "warning" ? <ShieldAlert /> : <ShieldCheck />}
                </span>
              ) : chat.kind === "activity" ? (
                <div className="sport-icon">
                  <SportIcon sport={chat.sport ?? ""} />
                </div>
              ) : (
                <Avatar name={chat.title} photoUrl={chat.photoUrl} size={48} className="chat-row-avatar" />
              )}
              <div className="chat-row-copy">
                <strong className={chat.unreadCount > 0 ? "unread" : ""}>
                  {chat.title}
                </strong>
                <p>{previewWithActivityLinks(chat.preview)}</p>
              </div>
              <div className="chat-meta">
                <time dateTime={chat.lastMessageAt ? new Date(chat.lastMessageAt).toISOString() : undefined}>
                  {formatChatTime(chat.lastMessageAt)}
                </time>
                {chat.kind === "team" && chat.unreadCount > 0 ? (
                  <span className="chat-pinned-label">Action needed</span>
                ) : chat.unreadCount > 0 && (
                  <span className="chat-unread-badge" aria-label={`${chat.unreadCount} unread messages`}>
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )

  return (
    <main className={`screen chats-screen ${isWide ? "chats-split-screen" : ""}`}>
      <header className="page-title">
        <p className="eyebrow">Your crew</p>
        <h1>Chats</h1>
      </header>

      {isWide ? (
        <div className="chats-split">
          <aside className="chats-split-list" aria-label="Your chats">
            {chatList}
          </aside>
          <section className="chats-split-thread">
            {openChatId ? (
              isTeamOpen ? <StaffMessageScreen key={`team-${openChatId}`} embedded /> : isDirectOpen ? <DirectChatScreen key={`dm-${openChatId}`} embedded /> : <ChatThreadScreen key={openChatId} embedded />
            ) : (
              <div className="chats-split-empty">
                <h3>Pick a chat</h3>
                <p>Choose a chat on the left to read and reply.</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        chatList
      )}
    </main>
  )
}
