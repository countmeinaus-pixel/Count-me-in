import { ArrowLeft, Lock, MoreVertical, Send, UserMinus } from "lucide-react"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Avatar } from "../components/Avatar"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { deleteActivityChat, hideChat, removeActivityMember, setActivityChatClosed } from "../lib/chatManagement"
import { SportIcon } from "../components/SportIcon"
import {
  getChatMessages,
  getChatThread,
  getChatThreadForViewer,
  getSavedChatMessages,
  markChatRead,
  markSavedChatRead,
  sendChatMessage,
  sendSavedChatMessage,
  type ChatMessage,
  type ChatThread,
} from "../lib/chat"
import { supabase } from "../lib/supabase"

export function ChatThreadScreen({ embedded = false }: { embedded?: boolean }) {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const messageListRef = useRef<HTMLDivElement | null>(null)
  // Chat menu (top right) and the warning pop-ups it opens.
  const [menuOpen, setMenuOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [confirm, setConfirm] = useState<
    | { kind: "remove"; userId: string; name: string }
    | { kind: "close" }
    | { kind: "delete" }
    | { kind: "hide" }
    | null
  >(null)

  async function reloadThread() {
    const updated = await getChatThreadForViewer(id)
    if (updated) {
      setThread(updated)
      setMessages(await getSavedChatMessages(id))
    }
  }

  useEffect(() => {
    let active = true
    async function loadThread() {
      setIsLoading(true)
      setError("")
      setThread(null)
      setMessages([])

      const demoThread = getChatThread(id)
      if (demoThread) {
        markChatRead(id)
        if (active) {
          setThread(demoThread)
          setMessages(getChatMessages(id))
          setIsDemo(true)
          setIsLoading(false)
        }
        return
      }

      try {
        const savedThread = await getChatThreadForViewer(id)
        if (!savedThread) {
          if (active) setError("This chat is unavailable or you are not an accepted member.")
          return
        }
        const savedMessages = await getSavedChatMessages(id)
        await markSavedChatRead(id)
        if (active) {
          setThread(savedThread)
          setMessages(savedMessages)
          setIsDemo(false)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this chat.")
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadThread()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    const messageList = messageListRef.current
    if (messageList) messageList.scrollTop = messageList.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!thread || isDemo || !supabase) return

    const channel = supabase
      .channel(`activity-chat-${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_chat_messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        () => {
          void getSavedChatMessages(thread.id)
            .then((updatedMessages) => {
              setMessages(updatedMessages)
              if (document.visibilityState === "visible") {
                return markSavedChatRead(thread.id)
              }
            })
            .catch((refreshError: unknown) => {
              setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh chat messages.")
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
  }, [thread, isDemo])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !thread || isSending) return

    setIsSending(true)
    setError("")
    try {
      if (isDemo) {
        const message = sendChatMessage(thread.id, text)
        setMessages((current) => [...current, message])
      } else {
        await sendSavedChatMessage(thread.id, text)
        setMessages(await getSavedChatMessages(thread.id))
        await markSavedChatRead(thread.id)
      }
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
        <p>Loading group chat…</p>
      </main>
    )
  }

  if (!thread) {
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

  return (
    <main className={`chat-thread-screen ${embedded ? "embedded" : ""}`}>
      <header className="chat-thread-header">
        {!embedded && (
          <button
            type="button"
            className="icon-button small"
            aria-label="Back to chats"
            onClick={() => navigate("/chats")}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="chat-thread-sport-icon"
          aria-label="View activity"
          onClick={() => thread.activityId && navigate(`/activity/${thread.activityId}`)}
          disabled={!thread.activityId}
        >
          <SportIcon sport={thread.sport} />
        </button>
        <button
          type="button"
          className="chat-thread-title"
          onClick={() => thread.activityId && navigate(`/activity/${thread.activityId}`)}
          disabled={!thread.activityId}
        >
          <strong>{thread.title}</strong>
          <span>{thread.participants.length} members</span>
        </button>
        <div className="chat-member-stack" aria-label={`Members: ${thread.participants.join(", ")}`}>
          {thread.participants.slice(0, 3).map((name, index) => (
            <Avatar
              key={`${name}-${index}`}
              name={name}
              photoUrl={thread.participantPhotos?.[index]}
              size={28}
              className="chat-member-avatar"
            />
          ))}
        </div>
        {!isDemo && (
          <div className="chat-menu-wrap">
            <button
              type="button"
              className="icon-button small"
              aria-label="Chat options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="friend-menu chat-menu" role="menu" onClick={() => setMenuOpen(false)}>
                <button type="button" role="menuitem" onClick={() => setMembersOpen(true)}>
                  Members ({thread.participants.length})
                </button>
                {thread.viewerIsHost && (
                  <button type="button" role="menuitem" onClick={() => setConfirm({ kind: "close" })}>
                    {thread.closedAt ? "Reopen chat" : "Close chat"}
                  </button>
                )}
                {thread.viewerIsHost && (
                  <button type="button" role="menuitem" className="danger" onClick={() => setConfirm({ kind: "delete" })}>
                    Delete chat for everyone
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => setConfirm({ kind: "hide" })}>
                  Remove from my chats
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {isDemo && <p className="chat-demo-notice" role="note">Demo chat — messages are only stored in this browser.</p>}
      {error && <p className="chat-error" role="alert">{error}</p>}

      <div className="chat-messages" ref={messageListRef} aria-live="polite">
        {messages.map((message) => {
          const bubble = (
            <div
              key={message.id}
              className={`chat-bubble ${message.mine ? "mine" : message.type === "system" ? "system" : ""}`}
            >
              {!message.mine && message.type !== "system" && <small>{message.sender}</small>}
              <p>{message.text}</p>
              <time>{message.time}</time>
            </div>
          )
          if (message.mine || message.type === "system") return bubble
          return (
            <div key={message.id} className="chat-message-theirs">
              <Avatar name={message.sender} photoUrl={message.senderPhotoUrl} size={32} />
              {bubble}
            </div>
          )
        })}
      </div>

{thread.closedAt ? (
        <p className="direct-chat-readonly chat-closed-note" role="note">
          <Lock aria-hidden="true" /> The host closed this chat.
          {thread.viewerIsHost && (
            <button type="button" className="text-action" onClick={() => setConfirm({ kind: "close" })}>Reopen</button>
          )}
        </p>
      ) : (
            <form className="message-input" onSubmit={(event) => void handleSend(event)}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message the group"
          aria-label="Type a message"
          maxLength={2000}
          disabled={isSending}
        />
        <button type="submit" aria-label="Send message" disabled={!draft.trim() || isSending}>
          <Send aria-hidden="true" />
        </button>
      </form>
      )}

      {membersOpen && (
        <div className="report-dialog-backdrop" role="presentation" onClick={() => setMembersOpen(false)}>
          <section className="report-dialog chat-members-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-members-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="chat-members-title">Members</h2>
            <div className="team-list">
              {thread.participants.map((name, index) => {
                const memberId = thread.participantIds?.[index]
                const isHost = memberId === thread.hostId
                return (
                  <div className="team-row" key={memberId ?? `${name}-${index}`}>
                    <Avatar name={name} photoUrl={thread.participantPhotos?.[index]} size={36} />
                    <span className="grow">
                      <strong>{name}</strong>
                      <small>{isHost ? "Host" : "Going"}</small>
                    </span>
                    {thread.viewerIsHost && !isHost && memberId && (
                      <button
                        type="button"
                        className="button button-destructive button-sm"
                        onClick={() => {
                          setMembersOpen(false)
                          setConfirm({ kind: "remove", userId: memberId, name })
                        }}
                      >
                        <UserMinus aria-hidden="true" /> Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="button button-secondary button-md" onClick={() => setMembersOpen(false)}>Close</button>
          </section>
        </div>
      )}

      {confirm?.kind === "remove" && thread.activityId && (
        <ConfirmDialog
          title={`Remove ${confirm.name}?`}
          confirmLabel="Remove"
          destructive
          inputLabel="Reason for him"
          inputPlaceholder="For example: Sorry mate, the group is full."
          onCancel={() => setConfirm(null)}
          onConfirm={async (reason) => {
            await removeActivityMember(thread.activityId!, confirm.userId, reason)
            setConfirm(null)
            await reloadThread()
          }}
        >
          <p>{confirm.name} is no longer going to this activity and leaves this chat. His spot opens up and he gets a notification.</p>
        </ConfirmDialog>
      )}
      {confirm?.kind === "close" && (
        <ConfirmDialog
          title={thread.closedAt ? "Reopen this chat?" : "Close this chat?"}
          confirmLabel={thread.closedAt ? "Reopen chat" : "Close chat"}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await setActivityChatClosed(thread.id, !thread.closedAt)
            setConfirm(null)
            await reloadThread()
          }}
        >
          <p>{thread.closedAt
            ? "Everyone can send messages again."
            : "Nobody can send new messages, but everyone can still read the chat. You can reopen it later."}</p>
        </ConfirmDialog>
      )}
      {confirm?.kind === "delete" && (
        <ConfirmDialog
          title="Delete this chat for everyone?"
          confirmLabel="Delete chat"
          destructive
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await deleteActivityChat(thread.id)
            setConfirm(null)
            navigate("/chats")
          }}
        >
          <p>All messages are deleted for every member. This can’t be undone. The activity itself stays; a new chat starts when someone else joins.</p>
        </ConfirmDialog>
      )}
      {confirm?.kind === "hide" && (
        <ConfirmDialog
          title="Remove from your chats?"
          confirmLabel="Remove"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await hideChat("activity", thread.id)
            setConfirm(null)
            navigate("/chats")
          }}
        >
          <p>The chat disappears from your list. You stay in the activity, and the chat comes back when someone sends a new message.</p>
        </ConfirmDialog>
      )}
    </main>
  )
}
