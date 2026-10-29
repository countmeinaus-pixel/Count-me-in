import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav, type Tab } from './components/BottomNav'
import { ActivityDetailScreen } from './screens/ActivityDetailScreen'
import { AuthScreen } from './screens/AuthScreen'
import { ChatsScreen } from './screens/ChatsScreen'
import { CreateActivityScreen } from './screens/CreateActivityScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MyActivitiesScreen } from './screens/MyActivitiesScreen'
import { MatesScreen } from './screens/MatesScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PasswordResetScreen } from './screens/PasswordResetScreen'
import { ProfileScreen } from './screens/ProfileScreen'

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
          : path === '/profile'
            ? 'profile'
            : 'home'

  const showNav = !['/login', '/onboarding', '/reset-password'].includes(path)

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/reset-password" element={<PasswordResetScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/activity/:id" element={<ActivityDetailScreen />} />
        <Route path="/activities" element={<MyActivitiesScreen />} />
        <Route path="/mates" element={<MatesScreen />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route path="/create" element={<CreateActivityScreen />} />
        <Route path="/chats" element={<ChatsScreen />} />
        <Route path="/profile/:name?" element={<ProfileScreen />} />
      </Routes>
      {showNav && <BottomNav active={activeTab} hasUnreadChats />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
