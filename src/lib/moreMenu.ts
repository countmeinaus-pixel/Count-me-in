import {
  Award,
  Bell,
  Dumbbell,
  Flag,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Trophy,
  UserPlus,
  UserRound,
  UserRoundPen,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from './supabase'

// The More menu: a page on phones, groups in the side nav on desktop.

export type MenuItem = {
  label: string
  href?: string
  icon: LucideIcon
  trailing?: string
  action?: 'logout'
}

export type MenuGroup = { title: string; items: MenuItem[] }

export const menuGroups: MenuGroup[] = [
  {
    title: 'You',
    items: [
      { label: 'Profile', href: '/profile', icon: UserRound },
      { label: 'Edit profile', href: '/profile/edit', icon: UserRoundPen },
      { label: 'My sports', href: '/more/sports', icon: Dumbbell },
      { label: 'Patches', href: '/profile/patches', icon: Award },
      { label: 'Personal records', href: '/profile/records', icon: Trophy },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Find new crew', href: '/more/crew', icon: Search },
      { label: 'Friend requests', href: '/more/requests', icon: UserPlus },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Notification settings', href: '/more/notifications', icon: Bell },
      { label: 'Location', href: '/more/location', icon: MapPin },
      { label: 'Privacy and safety', href: '/more/privacy', icon: LockKeyhole },
      { label: 'Language', href: '/more/language', icon: Languages },
    ],
  },
  {
    title: 'Other',
    items: [
      // The shield is the Count Me In logo.
      { label: 'About Count Me In', href: '/more/about', icon: ShieldCheck },
      { label: 'Help and feedback', href: '/more/help', icon: MessageCircleQuestion },
      { label: 'Log out', icon: LogOut, action: 'logout' },
    ],
  },
]

// Only for admins and moderators.
export const moderationGroup: MenuGroup = {
  title: 'Moderation',
  items: [{ label: 'Reports', href: '/more/moderation', icon: Flag }],
}

// Side nav: "Other" sits inside Settings to keep the list short.
// Desktop has room: Patches and Personal records sit with the main links (under Chats).
const mainLinkHrefs = ['/profile/patches', '/profile/records']
export const sideNavMainItems: MenuItem[] = menuGroups[0].items.filter((item) => mainLinkHrefs.includes(item.href ?? ''))

export const sideNavGroups: MenuGroup[] = [
  { ...menuGroups[0], items: menuGroups[0].items.filter((item) => !mainLinkHrefs.includes(item.href ?? '')) },
  menuGroups[1],
  { title: 'Settings', items: [...menuGroups[2].items, ...menuGroups[3].items] },
]

// Asks first; returns an error message, or null when signed out (or cancelled).
export async function logOut(onSignedOut: () => void): Promise<string | null> {
  if (!window.confirm('Log out of Count Me In?')) return null
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) return error.message
  }
  onSignedOut()
  return null
}
