import { createBrowserRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { BottomNav, type Tab } from './components/BottomNav'
import { ActivityDetailScreen } from './screens/ActivityDetailScreen'
import { AuthScreen } from './screens/AuthScreen'
import { ChatsScreen } from './screens/ChatsScreen'
import { CreateActivityScreen } from './screens/CreateActivityScreen'
import { EditProfileScreen } from './screens/EditProfileScreen'
import { EditSportsScreen } from './screens/EditSportsScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MyActivitiesScreen } from './screens/MyActivitiesScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { NotificationSettingsScreen } from './screens/NotificationSettingsScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PasswordResetScreen } from './screens/PasswordResetScreen'
import { PatchesScreen } from './screens/PatchesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { MoreAboutScreen } from './screens/MoreAboutScreen'
import { MoreHelpScreen } from './screens/MoreHelpScreen'
import { MoreScreen } from './screens/MoreScreen'
import { MySportsScreen } from './screens/MySportsScreen'
import { LanguageSettingsScreen } from './screens/LanguageSettingsScreen'
import { PrivacySettingsScreen } from './screens/PrivacySettingsScreen'
import { SportProfileScreen } from './screens/SportProfileScreen'
import { MatesScreen } from './screens/MatesScreen'

function AppShell() {
  const location = useLocation()
  const path = location.pathname

  const activeTab: Tab | null = path === '/notifications'
    ? null
    : path === '/activities'
      ? 'activities'
      : path === '/create'
        ? 'create'
        : path === '/chats'
          ? 'chats'
          : path.startsWith('/profile')
            ? 'more'
            : 'home'

  const showNav = !['/login', '/onboarding', '/reset-password', '/profile/edit', '/profile/sports/edit'].includes(path)
    && !path.startsWith('/more')

  return (
    <>
      <Outlet />
      {showNav && <BottomNav active={activeTab} hasUnreadChats />}
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomeScreen /> },
      { path: '/login', element: <AuthScreen /> },
      { path: '/reset-password', element: <PasswordResetScreen /> },
      { path: '/onboarding', element: <OnboardingScreen /> },
      { path: '/activity/:id', element: <ActivityDetailScreen /> },
      { path: '/activities', element: <MyActivitiesScreen /> },
      { path: '/mates', element: <MatesScreen /> },
      { path: '/notifications', element: <NotificationsScreen /> },
      { path: '/create', element: <CreateActivityScreen /> },
      { path: '/chats', element: <ChatsScreen /> },
      { path: '/profile/:name?', element: <ProfileScreen /> },
      { path: '/profile/edit', element: <EditProfileScreen /> },
      { path: '/profile/sports/edit', element: <EditSportsScreen /> },
      { path: '/profile/sports/:sport', element: <SportProfileScreen /> },
      { path: '/profile/:name/sports/:sport', element: <SportProfileScreen /> },
      { path: '/profile/patches', element: <PatchesScreen /> },
      { path: '/more', element: <MoreScreen /> },
      { path: '/more/crew', element: <MatesScreen fromMore /> },
      { path: '/more/friends', element: <MatesScreen friendsOnly fromMore /> },
      { path: '/more/sports', element: <MySportsScreen /> },
      { path: '/more/notifications', element: <NotificationSettingsScreen /> },
      { path: '/more/privacy', element: <PrivacySettingsScreen /> },
      { path: '/more/language', element: <LanguageSettingsScreen /> },
      { path: '/more/about', element: <MoreAboutScreen /> },
      { path: '/more/help', element: <MoreHelpScreen /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
