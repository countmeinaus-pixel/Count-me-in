import { CalendarDays, Home, MessageCircle, Plus, User } from 'lucide-react'

export type Tab = 'home' | 'activities' | 'create' | 'chats' | 'profile'

const items = [
  ['home', 'Home', Home],
  ['activities', 'My activities', CalendarDays],
  ['create', 'Create', Plus],
  ['chats', 'Chats', MessageCircle],
  ['profile', 'Profile', User],
] as const

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {items.map(([id, label, Icon]) => (
        <button key={id} className={`${active === id ? 'active' : ''} ${id === 'create' ? 'create' : ''}`} onClick={() => onChange(id)}>
          <Icon /><span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
