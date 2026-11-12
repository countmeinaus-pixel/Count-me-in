import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Home, MessageCircle, Plus, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { getCurrentModerationRole } from '../lib/moderation'
import { getMoreOrigin, requestCloseMoreMenu } from '../lib/moreNavigation'
import { logOut, moderationGroup, sideNavGroups, sideNavMainItems, type MenuItem } from '../lib/moreMenu'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useViewerProfile } from '../lib/viewerProfile'

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
  // Your own profile, shared with the other screens so the photo never flashes.
  const viewer = useViewerProfile()
  const viewerProfile = viewer.status === 'ready' ? viewer.profile : null
  const isViewerLoading = viewer.status === 'loading'
  const profilePhoto = {
    name: viewerProfile?.firstName ?? currentUser.name,
    url: viewerProfile ? viewerProfile.photoUrl : currentUser.photoUrl,
  }
  const [logOutError, setLogOutError] = useState('')
  const profileError = logOutError || (viewer.status === 'ready' ? viewer.error : '')
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
        if (error) setLogOutError(error)
      })
      return
    }
    if (item.href) navigate(item.href)
  }


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
          onClick={() => (location.pathname === '/more' && !isSideNav ? requestCloseMoreMenu(href) : navigate(href))}
          aria-label={chatUnreadError && id === 'chats' ? `${label}. ${chatUnreadError}` : label}
          aria-current={active === id ? 'page' : undefined}
        >
          {id === 'chats' && hasUnreadChats && <span className="nav-unread-dot" aria-label="Unread chats" />}
          <Icon />
          <span>{label}</span>
          {active === id && <ChevronRight className="side-nav-active-chevron" aria-hidden="true" />}
        </button>
      ))}
      {/* Desktop only: Patches and Personal records as main links. */}
      {isSideNav && sideNavMainItems.map(({ label, href, icon: Icon }) => {
        const isActive = location.pathname === href
        return (
          <button
            key={href}
            type="button"
            className={isActive ? 'active' : ''}
            onClick={() => href && navigate(href)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
            {isActive && <ChevronRight className="side-nav-active-chevron" aria-hidden="true" />}
          </button>
        )
      })}
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
        onClick={() => {
          if (isSideNav) navigate('/profile')
          // Phone: More opens the panel, tapping it again closes the panel.
          else if (location.pathname === '/more') requestCloseMoreMenu(getMoreOrigin(location.state))
          else navigate('/more', { state: { from: location.pathname } })
        }}
        aria-label={profileError
          ? `${isSideNav ? 'Your profile' : 'More'}. ${profileError}`
          : isSideNav ? `Your profile, ${profilePhoto.name}` : 'More'}
        aria-current={active === 'more' ? 'page' : undefined}
      >
        {isViewerLoading
          ? <span className="nav-profile-initial skeleton" />
          : profilePhoto.url
            ? <img className="nav-profile-photo" src={profilePhoto.url} alt="" />
            : <span className="nav-profile-initial">{profilePhoto.name[0]?.toUpperCase() ?? '?'}</span>}
        <span>{isSideNav ? (isViewerLoading ? '' : profilePhoto.name) : 'More'}</span>
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
