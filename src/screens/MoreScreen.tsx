import { ChevronRight, ShieldCheck, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { currentUser } from "../data/mockData"
import {
  getConfirmedMeetupsForUser,
  getPatchProgressForUser,
  loadSavedMeetupsForUser,
} from "../lib/checkins"
import { getStoredLanguage } from "../lib/i18n"
import { Skeleton } from "../components/Skeleton"
import { getViewerProfileState } from "../lib/viewerProfile"
import { getModerationGroup, logOut, menuGroups, type MenuItem } from "../lib/moreMenu"
import { closeMoreMenuEvent, getMoreOrigin, moreMenuSlideMs } from "../lib/moreNavigation"
import { getCurrentModerationRole } from "../lib/moderation"
import { supabase } from "../lib/supabase"

type MenuProfile = {
  name: string
  suburb: string
  verified: boolean
  photoUrl: string | null
  sports: number
}

export function MoreScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  // Start from your profile if another screen already loaded it.
  const cachedViewer = getViewerProfileState()
  const cachedProfile = cachedViewer.status === "ready" ? cachedViewer.profile : null
  const [profile, setProfile] = useState<MenuProfile>(() =>
    cachedProfile
      ? {
          name: cachedProfile.firstName,
          suburb: cachedProfile.suburb,
          verified: cachedProfile.selfieVerified,
          photoUrl: cachedProfile.photoUrl,
          sports: cachedProfile.sports.length,
        }
      : {
          name: currentUser.name,
          suburb: currentUser.suburb,
          verified: currentUser.verified,
          photoUrl: currentUser.photoUrl,
          sports: currentUser.stats.sports,
        },
  )
  const [profileError, setProfileError] = useState("")
  const [prCount, setPrCount] = useState(0)
  // While the real profile loads, show placeholders instead of the demo user.
  const [isProfileLoading, setIsProfileLoading] = useState(Boolean(supabase) && !cachedProfile)
  const [checkinVersion, setCheckinVersion] = useState(0)
  const [language, setLanguage] = useState(getStoredLanguage())
  const [isStaff, setIsStaff] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    typeof location.state?.statusMessage === "string"
      ? location.state.statusMessage
      : "",
  )
  const closeTo = getMoreOrigin(location.state)
  const meetupStats = useMemo(
    () => getConfirmedMeetupsForUser(profile.name),
    [profile.name, checkinVersion],
  )
  const hostedCount = new Set(
    meetupStats.filter((item) => item.hosted).map((item) => item.activityId),
  ).size
  const patchProgress = useMemo(
    () => getPatchProgressForUser(profile.name),
    [profile.name, checkinVersion],
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
        if (userError?.message === "Auth session missing!") {
          if (active) setIsProfileLoading(false)
          return
        }
        if (userError) throw userError
        if (!userData.user) {
          if (active) setIsProfileLoading(false)
          return
        }

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
        // Claimed personal records; 0 until the PR database update has run.
        void supabase
          .from("personal_records")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userData.user.id)
          .then(({ count, error }) => {
            if (active && !error) setPrCount(count ?? 0)
          })
        if (active) {
          setProfile({
            name: profileResult.data.first_name,
            suburb: profileResult.data.suburb,
            verified: profileResult.data.selfie_verified,
            photoUrl: profileResult.data.photo_url,
            sports: sportsResult.count ?? 0,
          })
          await loadSavedMeetupsForUser(profileResult.data.first_name)
          if (active) {
            setCheckinVersion((version) => version + 1)
            setIsProfileLoading(false)
          }
        }
      } catch (error) {
        if (active) setIsProfileLoading(false)
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
        if (active) {
          setIsStaff(role === "admin" || role === "moderator")
          setIsAdmin(role === "admin")
        }
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

  // Closing slides the panel out first, at the same speed as opening.
  const [isClosing, setIsClosing] = useState(false)
  const closeMenu = useCallback((to: string = closeTo) => {
    if (isClosing) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(to)
      return
    }
    setIsClosing(true)
    window.setTimeout(() => navigate(to), moreMenuSlideMs)
  }, [closeTo, isClosing, navigate])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu()
    }
    // The bottom nav asks the panel to close (More again, or another tab).
    function handleCloseRequest(event: Event) {
      const to = event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : closeTo
      closeMenu(to)
    }
    window.addEventListener("keydown", handleEscape)
    window.addEventListener(closeMoreMenuEvent, handleCloseRequest)
    return () => {
      window.removeEventListener("keydown", handleEscape)
      window.removeEventListener(closeMoreMenuEvent, handleCloseRequest)
    }
  }, [closeMenu, closeTo])

  async function handleLogOut() {
    const error = await logOut(() => navigate("/login", { replace: true }))
    if (error) setStatusMessage(error)
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
      item.href === "/profile/patches" ||
      item.href === "/profile/records"
    ) {
      navigate(item.href, { state: { returnTo: "/more", from: closeTo } })
      return
    }
    navigate(item.href, { state: { from: closeTo } })
  }

  return (
    <main
      className={`screen more-menu-screen${isClosing ? " is-closing" : ""}`}
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
          closeMenu()
        }
      }}
    >
      <header className="more-menu-header">
        <h1>More</h1>
        <button
          type="button"
          className="icon-button"
          aria-label="Close More menu"
          onClick={() => closeMenu()}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <button
        type="button"
        className={`more-profile-card ${isProfileLoading ? "is-loading" : ""}`}
        aria-busy={isProfileLoading}
        onClick={() =>
          navigate("/profile", { state: { returnTo: "/more", from: closeTo } })
        }
      >
        <span className="more-profile-avatar">
          {isProfileLoading ? null : profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" />
          ) : (
            <span>{profile.name[0]?.toUpperCase() ?? "?"}</span>
          )}
          {!isProfileLoading && profile.verified && (
            <span className="more-verified-badge">
              <ShieldCheck aria-label="Verified member" />
            </span>
          )}
        </span>
        <span className="more-profile-main">
          <strong>{isProfileLoading ? <Skeleton width={120} height={20} /> : profile.name}</strong>
          <small>{isProfileLoading ? <Skeleton width={160} height={12} /> : profile.suburb}</small>
        </span>
        <ChevronRight aria-hidden="true" className="more-profile-chevron" />
        <span className="more-profile-stats">
          <span>
            <strong>{isProfileLoading ? <Skeleton width={28} height={22} /> : meetupStats.length}</strong>
            <small>Meetups</small>
          </span>
          <span>
            <strong>{isProfileLoading ? <Skeleton width={28} height={22} /> : hostedCount}</strong>
            <small>Hosted</small>
          </span>
          <span>
            <strong>{isProfileLoading ? <Skeleton width={28} height={22} /> : profile.sports}</strong>
            <small>Sports</small>
          </span>
          <span>
            <strong>{isProfileLoading ? <Skeleton width={28} height={22} /> : prCount}</strong>
            <small>PRs</small>
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

      {(isStaff ? [...menuGroups, getModerationGroup(isAdmin)] : menuGroups).map((group) => (
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
                  ? isProfileLoading
                    ? ""
                    : `${earnedPatches} of ${patchesTotal}`
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
