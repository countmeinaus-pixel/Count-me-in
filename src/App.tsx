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
import { MatesScreen } from './screens/MatesScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PasswordResetScreen } from './screens/PasswordResetScreen'
import { PatchesScreen } from './screens/PatchesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { SportProfileScreen } from './screens/SportProfileScreen'

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
            ? 'profile'
            : 'home'

  const showNav = !['/login', '/onboarding', '/reset-password', '/profile/edit', '/profile/sports/edit'].includes(path)

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
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
