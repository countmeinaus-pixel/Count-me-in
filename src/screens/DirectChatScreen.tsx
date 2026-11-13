import { ArrowLeft, MoreVertical, Send } from "lucide-react"
import { ChatMessageBody } from '../components/ChatActivityCard'
import { type FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Avatar } from "../components/Avatar"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { getChatHides, hideChat, hideKey } from "../lib/chatManagement"
import type { ChatMessage } from "../lib/chat"
import {
  canSendDirectMessage,
  getDirectChat,
  getDirectMessages,
  markDirectChatRead,
  sendDirectMessage,
  type DirectChat,
} from "../lib/directChats"
import { getProfilePath } from "../lib/profile"
import { supabase } from "../lib/supabase"

// A private 1-on-1 chat with a friend. Same look as the activity group chats.
export function DirectChatScreen({ embedded = false }: { embedded?: boolean }) {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [chat, setChat] = useState<DirectChat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [canSend, setCanSend] = useState(true)
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // After "Delete chat", only messages sent later are shown to you.
  const [hiddenAt, setHiddenAt] = useState(0)
  const visibleMessages = messages.filter((message) => !message.createdAt || Date.parse(message.createdAt) > hiddenAt)

  useEffect(() => {
    let active = true
    async function load() {
      setIsLoading(true)
      setError("")
      setChat(null)
      setMessages([])
      try {
        const found = await getDirectChat(id)
        if (!found) {
          if (active) setError("This chat is unavailable.")
          return
        }
        const [loaded, allowed, hides] = await Promise.all([
          getDirectMessages(id, found.friendName, found.friendPhotoUrl),
          canSendDirectMessage(id),
          getChatHides(),
        ])
        if (active) setHiddenAt(hides.get(hideKey("direct", id)) ?? 0)
        await markDirectChatRead(id)
        if (active) {
          setChat(found)
          setMessages(loaded)
          setCanSend(allowed)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this chat.")
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages])

  // New messages appear live.
  useEffect(() => {
    if (!chat || !supabase) return
    const channel = supabase
      .channel(`direct-chat-${chat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `chat_id=eq.${chat.id}` },
        () => {
          void getDirectMessages(chat.id, chat.friendName, chat.friendPhotoUrl)
            .then((updated) => {
              setMessages(updated)
              if (document.visibilityState === "visible") return markDirectChatRead(chat.id)
            })
            .catch((refreshError: unknown) => {
              setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh messages.")
            })
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Live chat connection was interrupted. New messages may not appear until you reopen the chat.")
        }
      })
    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [chat])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !chat || isSending) return
    setIsSending(true)
    setError("")
    try {
      await sendDirectMessage(chat.id, text)
      setMessages(await getDirectMessages(chat.id, chat.friendName, chat.friendPhotoUrl))
      await markDirectChatRead(chat.id)
      setDraft("")
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send your message.")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <main className={`chat-thread-screen chat-thread-missing ${embedded ? "embedded" : ""}`}>
        <p>Loading chat…</p>
      </main>
    )
  }

  if (!chat) {
    return (
      <main className={`chat-thread-screen chat-thread-missing ${embedded ? "embedded" : ""}`}>
        <h1>Chat unavailable</h1>
        <p>{error || "This chat may have been removed."}</p>
        {!embedded && (
          <button type="button" className="text-action" onClick={() => navigate("/chats")}>
            Back to chats
          </button>
        )}
      </main>
    )
  }

  const openProfile = () => navigate(getProfilePath({ id: chat.friendId, name: chat.friendName }))

  return (
    <main className={`chat-thread-screen ${embedded ? "embedded" : ""}`}>
      <header className="chat-thread-header">
        {!embedded && (
          <button type="button" className="icon-button small" aria-label="Back to chats" onClick={() => navigate("/chats")}>
            <ArrowLeft aria-hidden="true" />
          </button>
        )}
        <button type="button" className="direct-chat-avatar" aria-label={`View ${chat.friendName}'s profile`} onClick={openProfile}>
          <Avatar name={chat.friendName} photoUrl={chat.friendPhotoUrl} size={36} />
        </button>
        <button type="button" className="chat-thread-title" onClick={openProfile}>
          <strong>{chat.friendName}</strong>
          <span>Friend</span>
        </button>
        <div className="chat-menu-wrap">
          <button type="button" className="icon-button small" aria-label="Chat options" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <MoreVertical aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="friend-menu chat-menu" role="menu" onClick={() => setMenuOpen(false)}>
              <button type="button" role="menuitem" onClick={openProfile}>View profile</button>
              <button type="button" role="menuitem" className="danger" onClick={() => setConfirmDelete(true)}>Delete chat</button>
            </div>
          )}
        </div>
      </header>

      {error && <p className="chat-error" role="alert">{error}</p>}

      <div className="chat-messages" ref={messageListRef} aria-live="polite">
        {visibleMessages.length === 0 && (
          <p className="direct-chat-empty">Say g’day to {chat.friendName}. Only the two of you can see this chat.</p>
        )}
        {visibleMessages.map((message) => {
          const bubble = (
            <div key={message.id} className={`chat-bubble ${message.mine ? "mine" : ""}`}>
              <ChatMessageBody text={message.text} />
              <time>{message.time}</time>
            </div>
          )
          if (message.mine) return bubble
          return (
            <div key={message.id} className="chat-message-theirs">
              <Avatar name={message.sender} photoUrl={message.senderPhotoUrl} size={32} />
              {bubble}
            </div>
          )
        })}
      </div>

      {canSend ? (
        <form className="message-input" onSubmit={(event) => void handleSend(event)}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${chat.friendName}`}
            aria-label="Type a message"
            maxLength={2000}
            disabled={isSending}
          />
          <button type="submit" aria-label="Send message" disabled={!draft.trim() || isSending}>
            <Send aria-hidden="true" />
          </button>
        </form>
      ) : (
        <p className="direct-chat-readonly" role="note">
          You can only message friends. Add {chat.friendName} as a friend again to keep chatting.
        </p>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this chat?"
          confirmLabel="Delete chat"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await hideChat("direct", chat.id)
            setConfirmDelete(false)
            navigate("/chats")
          }}
        >
          <p>The messages are deleted for you. {chat.friendName} keeps his copy. If one of you sends a new message, the chat comes back with only the new messages.</p>
        </ConfirmDialog>
      )}
    </main>
  )
}
