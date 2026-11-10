import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useLocation,
} from "react-router-dom"
import { useEffect, useState } from "react"
import { BottomNav, type Tab } from "./components/BottomNav"
import { ActivityDetailScreen } from "./screens/ActivityDetailScreen"
import { EditActivityScreen } from "./screens/EditActivityScreen"
import { AuthScreen } from "./screens/AuthScreen"
import { useMediaQuery, wideChatLayoutQuery } from "./lib/useMediaQuery"
import { ChatsScreen } from "./screens/ChatsScreen"
import { CreateActivityScreen } from "./screens/CreateActivityScreen"
import { EditProfileScreen } from "./screens/EditProfileScreen"
import { EditSportsScreen } from "./screens/EditSportsScreen"
import { HomeScreen } from "./screens/HomeScreen"
import { MyActivitiesScreen } from "./screens/MyActivitiesScreen"
import { NotificationsScreen } from "./screens/NotificationsScreen"
import { NotificationSettingsScreen } from "./screens/NotificationSettingsScreen"
import { OnboardingScreen } from "./screens/OnboardingScreen"
import { PasswordResetScreen } from "./screens/PasswordResetScreen"
import { PatchesScreen } from "./screens/PatchesScreen"
import { PersonalRecordsScreen } from "./screens/PersonalRecordsScreen"
import { ProfileScreen } from "./screens/ProfileScreen"
import { MoreAboutScreen } from "./screens/MoreAboutScreen"
import { MoreHelpScreen } from "./screens/MoreHelpScreen"
import { MoreScreen } from "./screens/MoreScreen"
import { MySportsScreen } from "./screens/MySportsScreen"
import { LanguageSettingsScreen } from "./screens/LanguageSettingsScreen"
import { PrivacySettingsScreen } from "./screens/PrivacySettingsScreen"
import { SportProfileScreen } from "./screens/SportProfileScreen"
import { MatesScreen } from "./screens/MatesScreen"
import { getUnreadChatThreadCount, hasUnreadChatThreads } from "./lib/chat"
import { ModerationScreen } from "./screens/ModerationScreen"

function AppShell() {
  const location = useLocation()
  const path = location.pathname
  const isWideChatLayout = useMediaQuery(wideChatLayoutQuery)
  const [hasUnreadChats, setHasUnreadChats] = useState(hasUnreadChatThreads())
  const [chatUnreadError, setChatUnreadError] = useState("")

  useEffect(() => {
    let active = true
    const refreshUnreadChats = () => {
      void getUnreadChatThreadCount()
        .then((count) => {
          if (active) {
            setHasUnreadChats(count > 0)
            setChatUnreadError("")
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setChatUnreadError(error instanceof Error ? error.message : "Unread chat status could not be checked.")
          }
        })
    }

    refreshUnreadChats()
    window.addEventListener("count-me-in-chat-unread-changed", refreshUnreadChats)
    return () => {
      active = false
      window.removeEventListener("count-me-in-chat-unread-changed", refreshUnreadChats)
    }
  }, [path])

  const activeTab: Tab | null =
    path === "/notifications"
      ? null
      : path === "/activities" || path === "/create"
        ? "activities"
        : path === "/friends" || path === "/mates"
          ? "friends"
          : path.startsWith("/chats")
            ? "chats"
            : path.startsWith("/profile")
              ? "more"
              : "home"

  const showNav =
    ![
      "/login",
      "/onboarding",
      "/reset-password",
      "/profile/edit",
      "/profile/sports/edit",
    ].includes(path) &&
    !/^\/activity\/[^/]+\/edit$/.test(path) &&
    !path.startsWith("/more") &&
    !(path.startsWith("/chats/") && path !== "/chats" && !isWideChatLayout)

  return (
    <>
      {/* New screens open at the top; Back returns to where you were.
          Switching chats keeps the same scroll position. */}
      <ScrollRestoration
        getKey={(location) =>
          location.pathname.startsWith("/chats") ? "/chats" : location.key
        }
      />
      <Outlet />
      {showNav && (
        <BottomNav active={activeTab} hasUnreadChats={hasUnreadChats} chatUnreadError={chatUnreadError} />
      )}
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomeScreen /> },
      { path: "/login", element: <AuthScreen /> },
      { path: "/reset-password", element: <PasswordResetScreen /> },
      { path: "/onboarding", element: <OnboardingScreen /> },
      { path: "/activity/:id", element: <ActivityDetailScreen /> },
      { path: "/activity/:id/edit", element: <EditActivityScreen /> },
      { path: "/activities", element: <MyActivitiesScreen /> },
      { path: "/friends", element: <MatesScreen /> },
      { path: "/mates", element: <MatesScreen /> },
      { path: "/notifications", element: <NotificationsScreen /> },
      { path: "/create", element: <CreateActivityScreen /> },
      { path: "/chats", element: <ChatsScreen /> },
      { path: "/chats/:id", element: <ChatsScreen /> },
      { path: "/profile/:name?", element: <ProfileScreen /> },
      { path: "/profile/edit", element: <EditProfileScreen /> },
      { path: "/profile/sports/edit", element: <EditSportsScreen /> },
      { path: "/profile/sports/:sport", element: <SportProfileScreen /> },
      { path: "/profile/:name/sports/:sport", element: <SportProfileScreen /> },
      { path: "/profile/patches", element: <PatchesScreen /> },
      { path: "/profile/records", element: <PersonalRecordsScreen /> },
      { path: "/more", element: <MoreScreen /> },
      { path: "/more/crew", element: <MatesScreen fromMore /> },
      { path: "/more/friends", element: <MatesScreen fromMore /> },
      { path: "/more/sports", element: <MySportsScreen /> },
      { path: "/more/notifications", element: <NotificationSettingsScreen /> },
      { path: "/more/privacy", element: <PrivacySettingsScreen /> },
      { path: "/more/language", element: <LanguageSettingsScreen /> },
      { path: "/more/about", element: <MoreAboutScreen /> },
      { path: "/more/help", element: <MoreHelpScreen /> },
      { path: "/more/moderation", element: <ModerationScreen /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
