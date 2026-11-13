import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { directChatPath, openDirectChat } from '../lib/directChats'
import { friendsChangedEvent, getFriendStatus } from '../lib/friendships'

// Chat icon at the top of a friend's profile: opens (or starts) your private chat.
// Only shown when you are friends.
export function FriendChatButton({ profileId, name }: { profileId: string; name: string }) {
  const navigate = useNavigate()
  const [isFriend, setIsFriend] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let active = true
    function load() {
      getFriendStatus(profileId)
        .then((result) => {
          if (active) setIsFriend(result?.status === 'friends')
        })
        .catch(() => {
          if (active) setIsFriend(false)
        })
    }
    load()
    window.addEventListener(friendsChangedEvent, load)
    return () => {
      active = false
      window.removeEventListener(friendsChangedEvent, load)
    }
  }, [profileId])

  if (!isFriend) return null

  return (
    <button
      type="button"
      className="icon-button profile-chat-button"
      aria-label={`Chat with ${name}`}
      title={`Chat with ${name}`}
      disabled={isBusy}
      onClick={() => {
        setIsBusy(true)
        openDirectChat(profileId)
          .then((chatId) => navigate(directChatPath(chatId)))
          .catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Unable to open the chat.'))
          .finally(() => setIsBusy(false))
      }}
    >
      <MessageCircle aria-hidden="true" />
    </button>
  )
}
