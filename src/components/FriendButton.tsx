import { Check, Clock3, UserCheck, UserPlus, X } from 'lucide-react'
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
        <button
          type="button"
          className="button button-primary button-md"
          disabled={isBusy}
          onClick={() => void run(async () => {
            const result = await sendFriendRequest(profileId)
            // Show the new state straight away (he may have asked you first).
            setStatus(result === 'accepted' ? 'friends' : 'outgoing')
          })}
        >
          <UserPlus aria-hidden="true" /> {isBusy ? 'Sending…' : 'Add friend'}
        </button>
      )}
      {status === 'outgoing' && (
        <>
          <button
            type="button"
            className="button button-secondary button-md friend-button-pending"
            disabled={isBusy}
            aria-describedby="friend-pending-note"
            onClick={() => {
              if (window.confirm(`Cancel your friend request to ${name}?`)) {
                void run(async () => {
                  await removeFriend(profileId)
                  setStatus('none')
                })
              }
            }}
          >
            <Clock3 aria-hidden="true" /> Request sent
          </button>
          <p className="friend-button-note" id="friend-pending-note">Waiting for {name} to accept · Tap to cancel</p>
        </>
      )}
      {status === 'incoming' && requestId && (
        <>
          <p className="friend-button-note">{name} wants to be friends</p>
          <div className="friend-button-row">
            <button type="button" className="button button-secondary button-md" disabled={isBusy} onClick={() => void run(async () => {
              await respondToFriendRequest(requestId, false)
              setStatus('none')
            })}>
              <X aria-hidden="true" /> Decline
            </button>
            <button type="button" className="button button-primary button-md" disabled={isBusy} onClick={() => void run(async () => {
              await respondToFriendRequest(requestId, true)
              setStatus('friends')
            })}>
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
            if (window.confirm(`Remove ${name} from your friends?`)) {
              void run(async () => {
                await removeFriend(profileId)
                setStatus('none')
              })
            }
          }}
        >
          <UserCheck aria-hidden="true" /> Friends
        </button>
      )}
      {error && <p className="activity-join-error" role="alert">{error}</p>}
    </div>
  )
}
