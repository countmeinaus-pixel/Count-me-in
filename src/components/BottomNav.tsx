import { CalendarDays, ChevronLeft, ChevronRight, Home, MessageCircle, Plus, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { supabase } from '../lib/supabase'

export type Tab = 'home' | 'friends' | 'activities' | 'chats' | 'more'

const items = [
  ['home', 'Home', Home, '/'],
  ['friends', 'Friends', UsersRound, '/friends'],
  ['activities', 'My activities', CalendarDays, '/activities'],
  ['chats', 'Chats', MessageCircle, '/chats'],
] as const

// Phones: a bar at the bottom. Desktop (980px and up): a side nav on the left,
// which can be collapsed to icons only.
export function BottomNav({
  active,
  hasUnreadChats = true,
  chatUnreadError = '',
  collapsed = false,
  onToggleCollapsed,
}: {
  active: Tab | null
  hasUnreadChats?: boolean
  chatUnreadError?: string
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [profilePhoto, setProfilePhoto] = useState<{ name: string; url: string | null }>({
    name: currentUser.name,
    url: currentUser.photoUrl,
  })
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let active = true
    async function loadProfilePhoto() {
      if (!supabase) return

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError?.message === 'Auth session missing!') return
        if (userError) throw userError
        if (!userData.user) return

        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, photo_url')
          .eq('id', userData.user.id)
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Your profile could not be found. Please complete onboarding first.')
        if (active) setProfilePhoto({ name: data.first_name, url: data.photo_url })
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : 'Unable to load your profile photo.')
      }
    }

    void loadProfilePhoto()
    return () => {
      active = false
    }
  }, [])

  return (
    <nav className={`bottom-nav${collapsed ? ' collapsed' : ''}`} aria-label="Main navigation">
      <div className="side-nav-brand">
        <span className="side-nav-logo"><ShieldCheck aria-hidden="true" /></span>
        <span className="side-nav-wordmark">Count Me In</span>
      </div>
      {onToggleCollapsed && (
        <button
          type="button"
          className="side-nav-toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        </button>
      )}
      {items.map(([id, label, Icon, href]) => (
        <button
          key={id}
          type="button"
          data-tour={`nav-${id}`}
          className={active === id ? 'active' : ''}
          onClick={() => navigate(href)}
          aria-label={chatUnreadError && id === 'chats' ? `${label}. ${chatUnreadError}` : label}
          aria-current={active === id ? 'page' : undefined}
        >
          {id === 'chats' && hasUnreadChats && <span className="nav-unread-dot" aria-label="Unread chats" />}
          <Icon />
          <span>{label}</span>
          {active === id && <ChevronRight className="side-nav-active-chevron" aria-hidden="true" />}
        </button>
      ))}
      <span className="side-nav-spacer" aria-hidden="true" />
      <button
        type="button"
        data-tour="nav-more"
        className={active === 'more' ? 'active' : ''}
        onClick={() => navigate('/more', { state: { from: location.pathname } })}
        aria-label={profileError ? `More. Profile details could not be loaded: ${profileError}` : 'More'}
        aria-current={active === 'more' ? 'page' : undefined}
      >
        {profilePhoto.url
          ? <img className="nav-profile-photo" src={profilePhoto.url} alt="" />
          : <span className="nav-profile-initial">{profilePhoto.name[0]?.toUpperCase() ?? '?'}</span>}
        <span>More</span>
      </button>
      <button
        type="button"
        className="side-nav-create"
        onClick={() => navigate('/create')}
        aria-label="Create activity"
      >
        <Plus aria-hidden="true" />
        <span>Create activity</span>
      </button>
    </nav>
  )
}
