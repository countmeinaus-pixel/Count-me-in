import { Check, UserCheck, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  friendsChangedEvent,
  getFriendStatus,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendStatus,
} from '../lib/friendships'

// Add friend / Requested / Accept + Decline / Friends, on someone's profile.
export function FriendButton({ profileId, name }: { profileId: string; name: string }) {
  const [status, setStatus] = useState<FriendStatus | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    function load() {
      getFriendStatus(profileId)
        .then((result) => {
          if (!active || !result) return
          setStatus(result.status)
          setRequestId(result.requestId)
        })
        .catch((loadError: unknown) => {
          if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load friendship.')
        })
    }
    load()
    window.addEventListener(friendsChangedEvent, load)
    return () => {
      active = false
      window.removeEventListener(friendsChangedEvent, load)
    }
  }, [profileId])

  async function run(action: () => Promise<unknown>) {
    setIsBusy(true)
    setError('')
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong. Try again.')
    } finally {
      setIsBusy(false)
    }
  }

  if (status === null && !error) return null

  return (
    <div className="friend-button">
      {status === 'none' && (
        <button type="button" className="button button-primary button-md" disabled={isBusy} onClick={() => void run(() => sendFriendRequest(profileId))}>
          <UserPlus aria-hidden="true" /> Add friend
        </button>
      )}
      {status === 'outgoing' && (
        <button
          type="button"
          className="button button-secondary button-md"
          disabled={isBusy}
          onClick={() => {
            if (window.confirm(`Cancel your friend request to ${name}?`)) void run(() => removeFriend(profileId))
          }}
        >
          <Check aria-hidden="true" /> Requested
        </button>
      )}
      {status === 'incoming' && requestId && (
        <>
          <p className="friend-button-note">{name} wants to be friends</p>
          <div className="friend-button-row">
            <button type="button" className="button button-secondary button-md" disabled={isBusy} onClick={() => void run(() => respondToFriendRequest(requestId, false))}>
              <X aria-hidden="true" /> Decline
            </button>
            <button type="button" className="button button-primary button-md" disabled={isBusy} onClick={() => void run(() => respondToFriendRequest(requestId, true))}>
              <Check aria-hidden="true" /> Accept
            </button>
          </div>
        </>
      )}
      {status === 'friends' && (
        <button
          type="button"
          className="button button-secondary button-md"
          disabled={isBusy}
          onClick={() => {
            if (window.confirm(`Remove ${name} from your friends?`)) void run(() => removeFriend(profileId))
          }}
        >
          <UserCheck aria-hidden="true" /> Friends
        </button>
      )}
      {error && <p className="activity-join-error" role="alert">{error}</p>}
    </div>
  )
}
