import { CalendarDays, Home, MessageCircle, Plus, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export type Tab = 'home' | 'activities' | 'create' | 'chats' | 'profile'

const items = [
  ['home', 'Home', Home, '/'],
  ['activities', 'My activities', CalendarDays, '/activities'],
  ['create', 'Create', Plus, '/create'],
  ['chats', 'Chats', MessageCircle, '/chats'],
  ['profile', 'Profile', User, '/profile'],
] as const

export function BottomNav({ active, hasUnreadChats = true }: { active: Tab | null; hasUnreadChats?: boolean }) {
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {items.map(([id, label, Icon, href]) => (
        <button
          key={id}
          type="button"
          className={`${active === id ? 'active' : ''} ${id === 'create' ? 'create' : ''}`}
          onClick={() => navigate(href)}
        >
          {id === 'chats' && hasUnreadChats && <span className="nav-unread-dot" aria-label="Unread chats" />}
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
