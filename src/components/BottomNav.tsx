import { CalendarDays, Home, MessageCircle, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { supabase } from '../lib/supabase'

export type Tab = 'home' | 'activities' | 'create' | 'chats' | 'more'

const items = [
  ['home', 'Home', Home, '/'],
  ['activities', 'My activities', CalendarDays, '/activities'],
  ['create', 'Create', Plus, '/create'],
  ['chats', 'Chats', MessageCircle, '/chats'],
] as const

export function BottomNav({ active, hasUnreadChats = true }: { active: Tab | null; hasUnreadChats?: boolean }) {
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
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(([id, label, Icon, href]) => (
        <button
          key={id}
          type="button"
          className={`${active === id ? 'active' : ''} ${id === 'create' ? 'create' : ''}`}
          onClick={() => navigate(href)}
          aria-label={label}
          aria-current={active === id ? 'page' : undefined}
        >
          {id === 'chats' && hasUnreadChats && <span className="nav-unread-dot" aria-label="Unread chats" />}
          <Icon />
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
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
    </nav>
  )
}
