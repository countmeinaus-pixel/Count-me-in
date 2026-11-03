import {
  Bell,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  Languages,
  LogOut,
  ShieldCheck,
  ShieldUser,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { currentUser } from "../data/mockData"
import {
  getConfirmedMeetupsForUser,
  getPatchProgressForUser,
} from "../lib/checkins"
import { getStoredLanguage } from "../lib/i18n"
import { getMoreOrigin } from "../lib/moreNavigation"
import { getCurrentModerationRole } from "../lib/moderation"
import { supabase } from "../lib/supabase"

type MenuProfile = {
  name: string
  suburb: string
  verified: boolean
  photoUrl: string | null
  sports: number
}

type MenuItem = {
  label: string
  href?: string
  icon: LucideIcon
  trailing?: string
  action?: "logout"
}

const menuGroups: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: "You",
    items: [
      { label: "Profile", href: "/profile", icon: UserRound },
      { label: "Edit profile", href: "/profile/edit", icon: UserRound },
      { label: "My sports", href: "/more/sports", icon: Dumbbell },
      { label: "Patches", href: "/profile/patches", icon: ShieldCheck },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Find your crew", href: "/more/crew", icon: UsersRound },
      { label: "Friends", href: "/more/friends", icon: UsersRound },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Notification settings",
        href: "/more/notifications",
        icon: Bell,
      },
      { label: "Privacy and safety", href: "/more/privacy", icon: ShieldUser },
      { label: "Language", href: "/more/language", icon: Languages },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "About Count Me In", href: "/more/about", icon: CircleHelp },
      { label: "Help and feedback", href: "/more/help", icon: CircleHelp },
      { label: "Log out", icon: LogOut, action: "logout" },
    ],
  },
]

export function MoreScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const [profile, setProfile] = useState<MenuProfile>({
    name: currentUser.name,
    suburb: currentUser.suburb,
    verified: currentUser.verified,
    photoUrl: currentUser.photoUrl,
    sports: currentUser.stats.sports,
  })
  const [profileError, setProfileError] = useState("")
  const [language, setLanguage] = useState(getStoredLanguage())
  const [isStaff, setIsStaff] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    typeof location.state?.statusMessage === "string"
      ? location.state.statusMessage
      : "",
  )
  const closeTo = getMoreOrigin(location.state)
  const meetupStats = useMemo(
    () => getConfirmedMeetupsForUser(profile.name),
    [profile.name],
  )
  const hostedCount = new Set(
    meetupStats.filter((item) => item.hosted).map((item) => item.activityId),
  ).size
  const patchProgress = useMemo(
    () => getPatchProgressForUser(profile.name),
    [profile.name],
  )
  const earnedPatches = patchProgress.filter((patch) => patch.earned).length
  const patchesTotal = patchProgress.length

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!supabase) return
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser()
        if (userError?.message === "Auth session missing!") return
        if (userError) throw userError
        if (!userData.user) return

        const [profileResult, sportsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("first_name, suburb, photo_url, selfie_verified")
            .eq("id", userData.user.id)
            .maybeSingle(),
          supabase
            .from("profile_sports")
            .select("sport_id", { count: "exact", head: true })
            .eq("profile_id", userData.user.id),
        ])
        if (profileResult.error) throw profileResult.error
        if (sportsResult.error) throw sportsResult.error
        if (!profileResult.data)
          throw new Error(
            "Your profile could not be found. Please complete onboarding first.",
          )
        if (active) {
          setProfile({
            name: profileResult.data.first_name,
            suburb: profileResult.data.suburb,
            verified: profileResult.data.selfie_verified,
            photoUrl: profileResult.data.photo_url,
            sports: sportsResult.count ?? 0,
          })
        }
      } catch (error) {
        if (active)
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load your profile details.",
          )
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void getCurrentModerationRole()
      .then((role) => {
        if (active) setIsStaff(role === "admin" || role === "moderator")
      })
      .catch((error: unknown) => {
        if (active)
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to verify your role.",
          )
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") navigate(closeTo)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [closeTo, navigate])

  async function handleLogOut() {
    if (!window.confirm("Log out of Count Me In?")) return
    if (!supabase) {
      navigate("/login", { replace: true })
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatusMessage(error.message)
      return
    }

    navigate("/login", { replace: true })
  }

  function openMenuItem(item: MenuItem) {
    if (item.action === "logout") {
      void handleLogOut()
      return
    }
    if (!item.href) return

    if (item.href === "/profile") {
      navigate(item.href, { state: { returnTo: "/more", from: closeTo } })
      return
    }

    if (
      item.href === "/profile/edit" ||
      item.href === "/profile/sports/edit" ||
      item.href === "/profile/patches"
    ) {
      navigate(item.href, { state: { returnTo: "/more", from: closeTo } })
      return
    }
    navigate(item.href, { state: { from: closeTo } })
  }

  return (
    <main
      className="screen more-menu-screen"
      aria-label="More menu"
      onTouchStart={(event) => {
        const touch = event.touches[0]
        touchStart.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        const touch = event.changedTouches[0]
        touchStart.current = null
        if (
          start &&
          touch.clientX - start.x > 90 &&
          Math.abs(touch.clientY - start.y) < 70
        ) {
          navigate(closeTo)
        }
      }}
    >
      <header className="more-menu-header">
        <h1>More</h1>
        <button
          type="button"
          className="icon-button"
          aria-label="Close More menu"
          onClick={() => navigate(closeTo)}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <button
        type="button"
        className="more-profile-card"
        onClick={() =>
          navigate("/profile", { state: { returnTo: "/more", from: closeTo } })
        }
      >
        <span className="more-profile-avatar">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" />
          ) : (
            <span>{profile.name[0]?.toUpperCase() ?? "?"}</span>
          )}
          {profile.verified && (
            <span className="more-verified-badge">
              <ShieldCheck aria-label="Verified member" />
            </span>
          )}
        </span>
        <span className="more-profile-main">
          <strong>{profile.name}</strong>
          <small>{profile.suburb}</small>
        </span>
        <ChevronRight aria-hidden="true" className="more-profile-chevron" />
        <span className="more-profile-stats">
          <span>
            <strong>{meetupStats.length}</strong>
            <small>Confirmed meetups</small>
          </span>
          <span>
            <strong>{hostedCount}</strong>
            <small>Hosted</small>
          </span>
          <span>
            <strong>{profile.sports}</strong>
            <small>Sports</small>
          </span>
        </span>
      </button>

      {profileError && (
        <p className="more-status-message" role="status">
          {profileError}
        </p>
      )}
      {statusMessage && (
        <p className="more-status-message" role="status">
          {statusMessage}
        </p>
      )}

      {(isStaff
        ? [
            ...menuGroups,
            {
              title: "Moderation",
              items: [
                {
                  label: "Reports",
                  href: "/more/moderation",
                  icon: ShieldUser,
                },
              ],
            },
          ]
        : menuGroups
      ).map((group) => (
        <section
          className="more-menu-group"
          key={group.title}
          aria-labelledby={`more-${group.title.toLowerCase()}-heading`}
        >
          <h2 id={`more-${group.title.toLowerCase()}-heading`}>
            {group.title}
          </h2>
          <div className="more-menu-list">
            {group.items.map((item) => {
              const Icon = item.icon
              const trailing =
                item.label === "Patches"
                  ? `${earnedPatches} of ${patchesTotal}`
                  : item.label === "Language"
                    ? language.toUpperCase()
                    : item.trailing
              return (
                <button
                  type="button"
                  className={`more-menu-row ${
                    item.action === "logout" ? "destructive" : ""
                  }`}
                  key={item.label}
                  onClick={() => openMenuItem(item)}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  {trailing && <small>{trailing}</small>}
                  <ChevronRight
                    aria-hidden="true"
                    className="more-menu-chevron"
                  />
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}
