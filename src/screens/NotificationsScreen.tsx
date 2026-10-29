import { ArrowLeft, CalendarDays, CheckCircle2, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Notification = {
  id: string
  title: string
  message: string
  time: string
  href: string
  unread: boolean
  icon: typeof CalendarDays
}

const initialNotifications: Notification[] = [
  {
    id: 'request-accepted',
    title: 'Your request was accepted',
    message: 'Matt accepted your request for Spearfishing at Port Noarlunga reef.',
    time: '10 min ago',
    href: '/activity/1',
    unread: true,
    icon: CheckCircle2,
  },
  {
    id: 'new-message',
    title: 'New message from Matt',
    message: 'Viz looked decent yesterday. See you at the car park.',
    time: '1 hour ago',
    href: '/chats',
    unread: true,
    icon: MessageCircle,
  },
  {
    id: 'new-activity',
    title: 'New activity near you',
    message: 'Hamish posted a hike from Waterfall Gully to Mount Lofty.',
    time: 'Yesterday',
    href: '/activity/2',
    unread: false,
    icon: CalendarDays,
  },
  {
    id: 'activity-reminder',
    title: 'Your activity is coming up',
    message: 'Spearfishing at Port Noarlunga reef · Sat 22 Feb at 7:00 am.',
    time: 'Yesterday',
    href: '/activity/1',
    unread: false,
    icon: CalendarDays,
  },
]

export function NotificationsScreen() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadNotifications = notifications.filter((notification) => notification.unread)
  const earlierNotifications = notifications.filter((notification) => !notification.unread)

  function openNotification(notification: Notification) {
    setNotifications((current) => current.map((item) =>
      item.id === notification.id ? { ...item, unread: false } : item,
    ))
    navigate(notification.href)
  }

  function markAllAsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })))
  }

  function renderNotification(notification: Notification) {
    const Icon = notification.icon

    return (
      <button
        key={notification.id}
        type="button"
        className={`notification-row ${notification.unread ? 'unread' : ''}`}
        onClick={() => openNotification(notification)}
      >
        <span className="notification-icon"><Icon /></span>
        <span className="notification-copy">
          <strong>{notification.title}</strong>
          <p>{notification.message}</p>
          <time>{notification.time}</time>
        </span>
        {notification.unread && <span className="notification-unread-dot" aria-label="Unread" />}
      </button>
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
    </div>
  )
}