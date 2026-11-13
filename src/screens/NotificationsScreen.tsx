import { ArrowLeft, CalendarDays, CheckCircle2, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { getPendingInvites, respondToActivityInvite } from '../lib/activityParticipation'
import { getNotifications, markNotificationsRead } from '../lib/notifications'
import { getMyFriendships, respondToFriendRequest } from '../lib/friendships'
import { getProfilePath } from '../lib/profile'

type Notification = {
  id: string
  title: string
  message: string
  time: string
  href: string
  unread: boolean
  icon: typeof CalendarDays
  actor?: { name: string; photoUrl: string | null }
  inviteActivityId?: string
  friendRequestId?: string // open friend request: show Accept / Decline
  isDemo?: boolean
}

const demoNotifications: Notification[] = [
  {
    id: 'request-accepted',
    title: 'Your request was accepted',
    message: 'Matt accepted your request for Freediving at Port Noarlunga reef.',
    time: '10 min ago',
    href: '/activity/1',
    unread: true,
    icon: CheckCircle2,
    isDemo: true,
  },
  {
    id: 'new-message',
    title: 'New message from Matt',
    message: 'Viz looked decent yesterday. See you at the car park.',
    time: '1 hour ago',
    href: '/chats',
    unread: true,
    icon: MessageCircle,
    isDemo: true,
  },
  {
    id: 'new-activity',
    title: 'New activity near you',
    message: 'Hamish posted a hike from Waterfall Gully to Mount Lofty.',
    time: 'Yesterday',
    href: '/activity/2',
    unread: false,
    icon: CalendarDays,
    isDemo: true,
  },
]

const titles = {
  participant_left: 'Someone can’t make it',
  invite: 'You’re invited',
  invite_accepted: 'Invitation accepted',
  invite_declined: 'Invitation declined',
  activity_cancelled: 'Activity cancelled',
  pr_confirmed: 'PR confirmed',
  pr_flagged: 'PR flagged',
  pr_verified: 'PR verified',
  friend_request: 'Friend request',
  friend_accepted: 'New friend',
  activity_approved: 'Activity approved',
  activity_rejected: 'Activity not approved',
  sport_suggested: 'New sport suggested',
  role_changed: 'Your role changed',
  profile_updated: 'Profile updated',
  staff_message: 'From the Count Me In team',
  staff_message_reply: 'Reply to your team message',
} as const

function formatRelativeTime(value: string) {
  const minutes = Math.round((Date.now() - Date.parse(value)) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function NotificationsScreen() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const unreadNotifications = notifications.filter((notification) => notification.unread)
  const earlierNotifications = notifications.filter((notification) => !notification.unread)

  useEffect(() => {
    let active = true
    Promise.all([getNotifications(), getPendingInvites().catch(() => []), getMyFriendships().catch(() => null)])
      .then(([saved, invites, friendships]) => {
        if (!active) return
        if (!saved) {
          setNotifications(demoNotifications)
          return
        }
        const openInviteIds = new Set(invites.map((invite) => invite.id))
        const openFriendRequests = new Map((friendships?.incoming ?? []).map((request) => [request.member.id, request.requestId]))
        setNotifications(saved.map((item) => ({
          id: item.id,
          title: item.type === 'participant_left' && item.actorName ? `${item.actorName} can’t make it` : item.type === 'staff_message_reply' && item.actorName ? `${item.actorName} replied` : titles[item.type],
          message: item.message ? `${item.body} “${item.message}”` : item.body,
          time: formatRelativeTime(item.createdAt),
          href: item.type === 'staff_message'
            ? '/chats'
            : item.type === 'staff_message_reply' && item.actorId
            ? `/more/moderation/members/${item.actorId}/message`
            : (item.type === 'friend_request' || item.type === 'friend_accepted') && item.actorId
            ? getProfilePath({ id: item.actorId, name: item.actorName ?? 'member' })
            : item.type === 'pr_confirmed' || item.type === 'pr_flagged' || item.type === 'pr_verified'
            ? '/profile/records'
            : item.activityId ? `/activity/${item.activityId}` : '/activities',
          unread: item.unread,
          icon: item.type === 'invite' ? CalendarDays : CheckCircle2,
          actor: item.actorName ? { name: item.actorName, photoUrl: item.actorPhotoUrl } : undefined,
          inviteActivityId: item.type === 'invite' && item.activityId && openInviteIds.has(item.activityId)
            ? item.activityId
            : undefined,
          friendRequestId: item.type === 'friend_request' && item.actorId
            ? openFriendRequests.get(item.actorId)
            : undefined,
        })))
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function openNotification(notification: Notification) {
    setNotifications((current) => current.map((item) =>
      item.id === notification.id ? { ...item, unread: false } : item,
    ))
    if (!notification.isDemo && notification.unread) void markNotificationsRead(notification.id).catch(() => undefined)
    navigate(notification.href)
  }

  function markAllAsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })))
    if (!notifications.some((item) => item.isDemo)) {
      void markNotificationsRead().catch((markError: unknown) => {
        setError(markError instanceof Error ? markError.message : 'Unable to mark notifications as read.')
      })
    }
  }

  async function answerInvite(notification: Notification, response: 'accepted' | 'declined') {
    if (!notification.inviteActivityId) return
    setRespondingTo(notification.id)
    setError('')
    try {
      await respondToActivityInvite(notification.inviteActivityId, response)
      setNotifications((current) => current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              unread: false,
              inviteActivityId: undefined,
              message: response === 'accepted' ? `${item.message} You’re going.` : `${item.message} You said not this time.`,
            }
          : item,
      ))
      if (response === 'accepted') navigate(`/activity/${notification.inviteActivityId}`)
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : 'Unable to answer this invitation.')
    } finally {
      setRespondingTo(null)
    }
  }

  async function answerFriendRequest(notification: Notification, accept: boolean) {
    if (!notification.friendRequestId) return
    setRespondingTo(notification.id)
    setError('')
    try {
      await respondToFriendRequest(notification.friendRequestId, accept)
      setNotifications((current) => current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              unread: false,
              friendRequestId: undefined,
              message: accept ? `${item.message} You're now friends.` : `${item.message} You declined.`,
            }
          : item,
      ))
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : 'Unable to answer this friend request.')
    } finally {
      setRespondingTo(null)
    }
  }

  function renderNotification(notification: Notification) {
    const Icon = notification.icon

    return (
      <article key={notification.id} className={`notification-row ${notification.unread ? 'unread' : ''}`}>
        <button type="button" className="notification-open" onClick={() => openNotification(notification)}>
          {notification.actor
            ? <Avatar name={notification.actor.name} photoUrl={notification.actor.photoUrl} size={48} className="notification-avatar" />
            : <span className="notification-icon"><Icon /></span>}
          <span className="notification-copy">
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
            <time>{notification.time}</time>
          </span>
          {notification.unread ? <span className="notification-unread-dot" aria-label="Unread" /> : <span />}
        </button>
        {notification.inviteActivityId && (
          <div className="notification-actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={respondingTo !== null}
              onClick={() => void answerInvite(notification, 'declined')}
            >
              Not this time
            </Button>
            <Button
              size="sm"
              disabled={respondingTo !== null}
              onClick={() => void answerInvite(notification, 'accepted')}
            >
              Count me in
            </Button>
          </div>
        )}
        {notification.friendRequestId && (
          <div className="notification-actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={respondingTo !== null}
              onClick={() => void answerFriendRequest(notification, false)}
            >
              Decline
            </Button>
            <Button
              size="sm"
              disabled={respondingTo !== null}
              onClick={() => void answerFriendRequest(notification, true)}
            >
              Accept
            </Button>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="screen notifications-screen">
      <header className="topbar notifications-topbar">
        <button type="button" className="icon-button" aria-label="Back to home" onClick={() => navigate('/')}>
          <ArrowLeft />
        </button>
        <h1>Notifications</h1>
        <button
          type="button"
          className="text-action"
          onClick={markAllAsRead}
          disabled={unreadNotifications.length === 0}
        >
          Mark all read
        </button>
      </header>

      {error && <p className="wizard-error" role="alert">{error}</p>}

      {isLoading ? (
        <p className="notification-empty" role="status">Loading notifications…</p>
      ) : (
        <>
          {unreadNotifications.length > 0 && (
            <section className="notification-group" aria-labelledby="new-notifications-heading">
              <h2 id="new-notifications-heading">New</h2>
              <div>{unreadNotifications.map(renderNotification)}</div>
            </section>
          )}

          <section className="notification-group" aria-labelledby="earlier-notifications-heading">
            <h2 id="earlier-notifications-heading">Earlier</h2>
            {earlierNotifications.length > 0 ? (
              <div>{earlierNotifications.map(renderNotification)}</div>
            ) : (
              <p className="notification-empty">You’re all caught up.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
