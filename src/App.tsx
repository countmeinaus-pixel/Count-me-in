import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav, type Tab } from './components/BottomNav'
import { ActivityDetailScreen } from './screens/ActivityDetailScreen'
import { ChatsScreen } from './screens/ChatsScreen'
import { CreateActivityScreen } from './screens/CreateActivityScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MyActivitiesScreen } from './screens/MyActivitiesScreen'
import { ProfileScreen } from './screens/ProfileScreen'

function AppShell() {
  const location = useLocation()
  const path = location.pathname

  const activeTab: Tab = path === '/activities'
    ? 'activities'
    : path === '/create'
      ? 'create'
      : path === '/chats'
        ? 'chats'
        : path === '/profile'
          ? 'profile'
          : 'home'

  const showNav = !['/onboarding'].includes(path)

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/activity/:id" element={<ActivityDetailScreen />} />
        <Route path="/activities" element={<MyActivitiesScreen />} />
        <Route path="/create" element={<CreateActivityScreen />} />
        <Route path="/chats" element={<ChatsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Routes>
      {showNav && <BottomNav active={activeTab} />}
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
