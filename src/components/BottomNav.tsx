import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Home, MessageCircle, Plus, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { getCurrentModerationRole } from '../lib/moderation'
import { logOut, moderationGroup, sideNavGroups, type MenuItem } from '../lib/moreMenu'
import { supabase } from '../lib/supabase'
import { useMediaQuery } from '../lib/useMediaQuery'

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
  const isSideNav = useMediaQuery('(min-width: 980px)')
  const [isStaff, setIsStaff] = useState(false)
  const groups = isStaff ? [...sideNavGroups, moderationGroup] : sideNavGroups
  // Side nav groups: the one holding the current page starts open.
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    groups.filter((group) => group.items.some((item) => item.href === location.pathname)).map((group) => group.title),
  )

  useEffect(() => {
    let active = true
    void getCurrentModerationRole()
      .then((role) => {
        if (active) setIsStaff(role === 'admin' || role === 'moderator')
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  // Open the group of the page you navigate to.
  const currentGroup = groups.find((group) => group.items.some((item) => item.href === location.pathname))?.title
  useEffect(() => {
    if (currentGroup) setOpenGroups((current) => (current.includes(currentGroup) ? current : [...current, currentGroup]))
  }, [currentGroup])

  function toggleGroup(title: string) {
    setOpenGroups((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    )
  }

  function openMenuItem(item: MenuItem) {
    if (item.action === 'logout') {
      void logOut(() => navigate('/login', { replace: true })).then((error) => {
        if (error) setProfileError(error)
      })
      return
    }
    if (item.href) navigate(item.href)
  }

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
      {/* Desktop only: the More menu as groups that fold open. */}
      <div className="side-nav-groups">
        {groups.map((group) => {
          const isOpen = openGroups.includes(group.title)
          const listId = `side-nav-${group.title.toLowerCase()}`
          return (
            <div className="side-nav-group" key={group.title}>
              <button
                type="button"
                className="side-nav-group-toggle"
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => toggleGroup(group.title)}
              >
                <span>{group.title}</span>
                <ChevronDown aria-hidden="true" className={isOpen ? 'open' : ''} />
              </button>
              {isOpen && (
                <div className="side-nav-group-items" id={listId}>
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    const isCurrent = item.href === location.pathname
                    return (
                      <button
                        type="button"
                        key={item.label}
                        className={`side-nav-item${isCurrent ? ' current' : ''}${item.action === 'logout' ? ' destructive' : ''}`}
                        aria-current={isCurrent ? 'page' : undefined}
                        onClick={() => openMenuItem(item)}
                      >
                        <ItemIcon aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <span className="side-nav-spacer" aria-hidden="true" />
      {/* Phones: More opens the menu page. Desktop: your name opens your profile. */}
      <button
        type="button"
        data-tour="nav-more"
        className={active === 'more' ? 'active' : ''}
        onClick={() =>
          isSideNav ? navigate('/profile') : navigate('/more', { state: { from: location.pathname } })
        }
        aria-label={profileError
          ? `${isSideNav ? 'Your profile' : 'More'}. ${profileError}`
          : isSideNav ? `Your profile, ${profilePhoto.name}` : 'More'}
        aria-current={active === 'more' ? 'page' : undefined}
      >
        {profilePhoto.url
          ? <img className="nav-profile-photo" src={profilePhoto.url} alt="" />
          : <span className="nav-profile-initial">{profilePhoto.name[0]?.toUpperCase() ?? '?'}</span>}
        <span>{isSideNav ? profilePhoto.name : 'More'}</span>
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
