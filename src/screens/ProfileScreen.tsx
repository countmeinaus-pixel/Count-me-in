import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Settings2,
  } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { ActivityCard, type ActivityCardData } from "../components/ActivityCard"
import { Avatar } from "../components/Avatar"
import { PersonalRecordCard } from "../components/PersonalRecordCard"
import { ProfileSkeleton } from "../components/Skeleton"
import { getViewerProfileState } from "../lib/viewerProfile"
import {
  getPersonalRecordsForProfile,
  type PersonalRecord,
} from "../lib/personalRecords"
import { MateCard } from "../components/MateCard"
import { FriendButton } from "../components/FriendButton"
import { friendsChangedEvent, getFriendsOf, removeFriend } from "../lib/friendships"
import { PatchIcon } from "../components/PatchIcon"
import { ReportDialog } from "../components/ReportDialog"
import { SportIcon } from "../components/SportIcon"
import {
  activities as demoActivities,
  communityMembers,
  currentUser,
  type CommunityMember,
} from "../data/mockData"
import {
  getConfirmedMeetupsForUser,
  getConfirmedMeetupsForUserAndSport,
  getPatchProgressForUser,
  getLollipopChartForUser,
  loadSavedMeetupsForUser,
} from "../lib/checkins"
import {
  getCommunityProfileById,
  getCommunityProfileByName,
  getCurrentProfile,
  getProfileIdFromKey,
  getProfilePath,
  type CurrentProfile,
} from "../lib/profile"
import { supabase } from "../lib/supabase"
import {
  getProfileActivities,
  type FeedActivity,
} from "../lib/activityParticipation"
import { addBlockedUser, getBlockedUsers } from "../lib/localPreferences"
import {
  blockProfile,
  getBlockedProfiles,
  resolveProfileIdByName,
} from "../lib/moderation"
import { getMoreOrigin } from "../lib/moreNavigation"
import { friendNames } from "../lib/friends"
import { useContentWidth } from "../lib/useMediaQuery"

const initialFriends = friendNames.map((name) => ({ name }))

export function ProfileScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name: profileParam } = useParams()
  // Your own profile starts from the shared copy, so it doesn't flash the demo user.
  const [savedProfile, setSavedProfile] = useState<CurrentProfile | null>(() => {
    const viewer = getViewerProfileState()
    return viewer.status === "ready" ? viewer.profile : null
  })
  const [remoteProfile, setRemoteProfile] = useState<CommunityMember | null>(
    null,
  )
  const [profileLoadError, setProfileLoadError] = useState("")
  const [checkinVersion, setCheckinVersion] = useState(0)
  const [statusMessage, setStatusMessage] = useState(
    typeof location.state?.statusMessage === "string"
      ? location.state.statusMessage
      : "",
  )
  const returnToMore = location.state?.returnTo === "/more"
  const moreOrigin = getMoreOrigin(location.state)
  const [friends, setFriends] = useState(initialFriends)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [openFriendMenu, setOpenFriendMenu] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{
    id: string
    label: string
  } | null>(null)

  const profileKey = decodeURIComponent(profileParam ?? "")
  const linkedProfileId = getProfileIdFromKey(profileKey)
  const openedById = linkedProfileId !== null
  // Your own account id, to tell your profile apart from someone with the same name.
  const [viewerId, setViewerId] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setViewerId(data.user?.id ?? null)
    })
    return () => {
      active = false
    }
  }, [])
  const isCurrentUser =
    !profileParam ||
    (openedById ? linkedProfileId === viewerId : profileKey === currentUser.name)
  // While your own profile loads, show a loading state instead of the demo user.
  const [isOwnProfileLoading, setIsOwnProfileLoading] = useState(Boolean(supabase) && !savedProfile)
  const [profileActivities, setProfileActivities] = useState<{
    upcoming: ActivityCardData[]
    latest: ActivityCardData | null
  } | null>(null)
  const [profileActivitiesError, setProfileActivitiesError] = useState("")

  // For a profile link with an account id: still loading, or no such member.
  const [remoteLookupDone, setRemoteLookupDone] = useState(false)
  useEffect(() => {
    setRemoteProfile(null)
    setRemoteLookupDone(false)
    if (
      isCurrentUser ||
      (!openedById && communityMembers.some((member) => member.name === profileKey))
    )
      return

    let active = true
    ;(linkedProfileId ? getCommunityProfileById(linkedProfileId) : getCommunityProfileByName(profileKey))
      .then((member) => {
        if (active) setRemoteProfile(member)
      })
      .catch((error: unknown) => {
        if (active)
          setProfileLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load this profile.",
          )
      })
      .finally(() => {
        if (active) setRemoteLookupDone(true)
      })
    return () => {
      active = false
    }
  }, [isCurrentUser, linkedProfileId, openedById, profileKey])

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!isCurrentUser || !supabase) {
        setIsOwnProfileLoading(false)
        return
      }

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser()
        if (userError?.message === "Auth session missing!") return
        if (userError) throw userError
        if (!userData.user) return
        const profileData = await getCurrentProfile(userData.user.id)
        if (active && profileData) {
          setSavedProfile(profileData)
          await loadSavedMeetupsForUser(profileData.firstName)
          if (active) setCheckinVersion((version) => version + 1)
        }
      } catch (error) {
        if (active)
          setProfileLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load your profile.",
          )
      } finally {
        if (active) setIsOwnProfileLoading(false)
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [isCurrentUser])

  useEffect(() => {
    let active = true
    async function loadBlockedMembers() {
      try {
        setBlockedUsers(getBlockedUsers())
        const remoteBlocks = await getBlockedProfiles()
        if (active)
          setBlockedUsers((current) => [
            ...new Set([...current, ...remoteBlocks.map((item) => item.name)]),
          ])
      } catch (error) {
        if (active)
          setProfileLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load blocked members.",
          )
      }
    }
    void loadBlockedMembers()
    return () => {
      active = false
    }
  }, [])

  const profile =
    isCurrentUser && savedProfile
      ? {
          name: savedProfile.firstName,
          age: savedProfile.age,
          suburb: savedProfile.suburb,
          verified: savedProfile.selfieVerified,
          photoUrl: savedProfile.photoUrl,
          sports: savedProfile.sports.map((sport) => ({
            name: sport.name,
            level: sport.skill,
            meetups: getConfirmedMeetupsForUserAndSport(
              savedProfile.firstName,
              sport.name,
            ).length,
          })),
          stats: {
            meetups: currentUser.stats.meetups,
            hosted: currentUser.stats.hosted,
            sports: savedProfile.sports.length,
          },
        }
      : isCurrentUser
        ? currentUser
        : ((openedById
            ? undefined
            : communityMembers.find((member) => member.name === profileKey)) ??
          remoteProfile ?? {
            // Never show an account id as a name while the profile loads.
            name: openedById ? "" : profileKey || currentUser.name,
            age: 31,
            suburb: "Adelaide",
            verified: true,
            photoUrl: null,
            sports: [
              { name: "Running", level: "Intermediate", meetups: 0 },
              { name: "Hiking", level: "Beginner", meetups: 0 },
            ],
            stats: { meetups: 4, hosted: 1, sports: 2 },
          })
  const profileId = isCurrentUser ? savedProfile?.id : remoteProfile?.id
  const [realFriends, setRealFriends] = useState<CommunityMember[] | null>(null)
  useEffect(() => {
    if (!profileId) {
      setRealFriends(null)
      return
    }
    let active = true
    function load() {
      if (!profileId) return
      getFriendsOf(profileId)
        .then((members) => {
          if (active) setRealFriends(members)
        })
        .catch(() => undefined)
    }
    load()
    window.addEventListener(friendsChangedEvent, load)
    return () => {
      active = false
      window.removeEventListener(friendsChangedEvent, load)
    }
  }, [profileId])
  const profileName = profile.name

  useEffect(() => {
    const toCard = ({ viewerJoinStatus, ...activity }: FeedActivity) => ({
      ...activity,
      joinStatus: viewerJoinStatus ?? undefined,
    })

    if (!profileId) {
      // Demo profiles: use the demo activities they host or go to.
      const now = Date.now()
      const theirs = demoActivities.filter(
        (activity) =>
          activity.host === profileName ||
          activity.attendees.includes(profileName),
      )
      setProfileActivities({
        upcoming: theirs.filter((activity) => activity.startsAt.getTime() >= now),
        latest:
          theirs
            .filter((activity) => activity.startsAt.getTime() < now)
            .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0] ??
          null,
      })
      return
    }

    let active = true
    setProfileActivities(null)
    setProfileActivitiesError("")
    getProfileActivities(profileId)
      .then((result) => {
        if (!active) return
        setProfileActivities({
          upcoming: result.upcoming.map(toCard),
          latest: result.latest ? toCard(result.latest) : null,
        })
      })
      .catch((error: unknown) => {
        if (active)
          setProfileActivitiesError(
            error instanceof Error
              ? error.message
              : "Unable to load this member's activities.",
          )
      })
    return () => {
      active = false
    }
  }, [profileId, profileName])

  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[] | null>(null)
  const [personalRecordsError, setPersonalRecordsError] = useState("")
  const [recordsVersion, setRecordsVersion] = useState(0)
  const [showAllRecords, setShowAllRecords] = useState(false)
  // A preview grid: 2 by 2 on phones, 5 in a row on wider screens.
  // Column counts match the @container app rules in index.css.
  const contentWidth = useContentWidth()
  const recordsPreviewCount = contentWidth >= 768 ? 5 : 4

  useEffect(() => {
    if (!profileId) {
      setPersonalRecords(null)
      return
    }
    let active = true
    setPersonalRecordsError("")
    getPersonalRecordsForProfile(profileId)
      .then((records) => {
        if (active) setPersonalRecords(records)
      })
      .catch((error: unknown) => {
        if (active)
          setPersonalRecordsError(
            error instanceof Error ? error.message : "Unable to load personal records.",
          )
      })
    return () => {
      active = false
    }
  }, [profileId, recordsVersion])

  const confirmedMeetups = useMemo(
    () => getConfirmedMeetupsForUser(profile.name),
    [profile.name, checkinVersion],
  )
  const profileMeetups = savedProfile
    ? confirmedMeetups.length
    : confirmedMeetups.length > 0
      ? confirmedMeetups.length
      : profile.stats.meetups
  const hostedActivities = savedProfile
    ? new Set(
        confirmedMeetups
          .filter((entry) => entry.hosted)
          .map((entry) => entry.activityId),
      ).size
    : confirmedMeetups.length > 0
      ? new Set(
          confirmedMeetups
            .filter((entry) => entry.hosted)
            .map((entry) => entry.activityId),
        ).size
      : profile.stats.hosted
  const sportCount = profile.stats.sports
  // Signed in: real friends (accepted friend requests). Otherwise demo friends.
  const friendMembers = realFriends ?? friends.flatMap((friend) => communityMembers.find((person) => person.name === friend.name) ?? [])
  const visibleFriends = friendMembers.filter(
    (friend) => !blockedUsers.includes(friend.name) && friend.name !== profile.name,
  )
  // Up to 3 rows of friends: 4, 3 or 2 a row depending on the content width.
  const friendsPreviewCount = (contentWidth >= 1200 ? 4 : contentWidth >= 760 ? 3 : 2) * 3
  const patchList = useMemo(
    () => getPatchProgressForUser(profile.name),
    [profile.name, checkinVersion],
  )
  const earnedPatches = patchList.filter((patch) => patch.earned)
  // At most 6 rows of patches (6, 4 or 3 a row); the last tile becomes "+N".
  const patchesPreviewCount = (contentWidth >= 1200 ? 6 : contentWidth >= 600 ? 4 : 3) * 6
  const patchesOverflow = earnedPatches.length > patchesPreviewCount
  const shownPatches = patchesOverflow
    ? earnedPatches.slice(0, patchesPreviewCount - 1)
    : earnedPatches
  const chartData = useMemo(
    () =>
      getLollipopChartForUser(profile.name, 6),
    [profile.name, checkinVersion],
  )

  async function handleReportUser(name: string) {
    try {
      const profileId = await resolveProfileIdByName(name)
      setReportTarget({ id: profileId, label: name })
      setOpenFriendMenu(null)
      setProfileMenuOpen(false)
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to report this profile.",
      )
    }
  }

  async function handleBlockUser(name: string) {
    try {
      const profileId = await resolveProfileIdByName(name)
      await blockProfile(profileId)
      addBlockedUser(name)
      setBlockedUsers((current) => [...new Set([...current, name])])
      setStatusMessage(
        `${name} is now blocked and hidden from your crew lists.`,
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to block this member.",
      )
      return false
    }
    setOpenFriendMenu(null)
    setProfileMenuOpen(false)
    return true
  }

  if (openedById && !isCurrentUser && !remoteProfile) {
    return (
      <div className="screen profile-page" aria-busy={!remoteLookupDone}>
        <header className="topbar">
          <button type="button" className="icon-button" aria-label="Back" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>
        </header>
        {remoteLookupDone ? (
          <p className="text-[var(--text-secondary)]" role="status">This profile could not be found.</p>
        ) : (
          <>
            <span className="sr-only" role="status">Loading profile…</span>
            <ProfileSkeleton />
          </>
        )}
      </div>
    )
  }

  if (isCurrentUser && isOwnProfileLoading) {
    return (
      <div className="screen profile-page" aria-busy="true">
        <span className="sr-only" role="status">Loading your profile…</span>
        <ProfileSkeleton />
      </div>
    )
  }

  return (
    <div className="screen profile-page">
      <header className="profile-header">
        <div className="profile-top">
          {(!isCurrentUser || returnToMore) && (
            <button
              type="button"
              onClick={() =>
                returnToMore
                  ? navigate("/more", {
                      replace: true,
                      state: { from: moreOrigin },
                    })
                  : navigate(-1)
              }
              className="icon-button"
              aria-label={returnToMore ? "Back to More" : "Back"}
            >
              <ArrowLeft />
            </button>
          )}

          {!isCurrentUser && (
            <div
              className="friend-menu-wrap profile-more-wrap"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="friend-menu-button"
                aria-label={`More options for ${profile.name}`}
                onClick={() => setProfileMenuOpen((current) => !current)}
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {profileMenuOpen && (
                <div className="friend-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => void handleReportUser(profile.name)}
                  >
                    Report
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBlockUser(profile.name)}
                  >
                    Block
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="profile-identity">
        <div className="relative">
          {isCurrentUser ? (
            <button
              type="button"
              onClick={() => navigate("/profile/edit")}
              className="hero-avatar-button"
              aria-label="Edit profile photo"
            >
              <Avatar
                name={profile.name}
                photoUrl={profile.photoUrl}
                size={96}
                className="hero-avatar"
              />
            </button>
          ) : (
            <Avatar
              name={profile.name}
              photoUrl={profile.photoUrl}
              size={96}
              className="hero-avatar"
              label={`${profile.name}'s profile photo`}
            />
          )}

          {isCurrentUser && (
            <button
              type="button"
              onClick={() => navigate("/profile/edit")}
              aria-label="Edit profile photo"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#7fb7a8] bg-[#0a1621] text-[#7fb7a8] shadow-lg shadow-black/30"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <h1>
          {profile.name}, {profile.age}
        </h1>
        <p>
          <MapPin />
          {profile.suburb}
        </p>
        {!isCurrentUser && profileId && (
          <FriendButton profileId={profileId} name={profile.name} />
        )}
        {isCurrentUser && (
          <button
            type="button"
            className="edit-profile-button"
            onClick={() => navigate("/profile/edit")}
          >
            <Pencil aria-hidden="true" />
            Edit profile
          </button>
        )}
      </div>

      {profileLoadError && (
        <p className="edit-form-error" role="alert">
          {profileLoadError}
        </p>
      )}

      <div className="stats-grid">
        <div>
          <strong>{profileMeetups}</strong>
          <span>Meetups</span>
        </div>
        <div>
          <strong>{hostedActivities}</strong>
          <span>Hosted</span>
        </div>
        <div>
          <strong>{sportCount}</strong>
          <span>Sports</span>
        </div>
        <div>
          <strong>{personalRecords?.length ?? 0}</strong>
          <span>PRs</span>
        </div>
      </div>

      <div className="chart-block">
        <div className="section-heading compact">
          <h2>Meetups</h2>
          <span>Last 6 months</span>
        </div>

        <div className="lollipop-chart">
          {chartData.map((month) => (
            <div
              key={month.label}
              className={`lollipop-column ${month.isCurrent ? "current" : ""}`}
              aria-label={`${month.label}: ${month.value} confirmed ${
                month.value === 1 ? "meetup" : "meetups"
              }`}
            >
              <span className="chart-value">{month.value}</span>
              <div
                className={`chart-bar ${month.isCurrent ? "current" : ""} ${
                  month.value === 0 ? "empty" : ""
                }`}
                style={{
                  height: `${Math.max(4, (month.value / month.maximum) * 64)}px`,
                }}
                aria-hidden="true"
              />
              <small>{month.label}</small>
            </div>
          ))}
        </div>

        {profileActivitiesError ? (
          <p className="edit-form-error" role="alert">
            {profileActivitiesError}
          </p>
        ) : profileActivities && profileActivities.upcoming.length > 0 ? (
          <div className="profile-activities">
            <h3>Upcoming</h3>
            {profileActivities.upcoming.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onClick={() => navigate(`/activity/${activity.id}`)}
              />
            ))}
          </div>
        ) : profileActivities?.latest ? (
          <div className="profile-activities">
            <h3>Latest meetup</h3>
            <ActivityCard
              activity={profileActivities.latest}
              onClick={() =>
                profileActivities.latest &&
                navigate(`/activity/${profileActivities.latest.id}`)
              }
            />
          </div>
        ) : null}
      </div>

      {(personalRecords !== null || personalRecordsError) && (
        <section className="pr-section" aria-labelledby="pr-heading">
          <div className="pr-section-heading">
            <h2 id="pr-heading">Personal records</h2>
            {isCurrentUser && (
              <button
                type="button"
                className="text-action"
                onClick={() => navigate("/profile/records")}
              >
                Claim a PR
              </button>
            )}
          </div>
          {personalRecordsError ? (
            <p className="edit-form-error" role="alert">{personalRecordsError}</p>
          ) : personalRecords && personalRecords.length > 0 ? (
            <>
              <div className={showAllRecords ? "pr-list" : "pr-grid"}>
                {(showAllRecords ? personalRecords : personalRecords.slice(0, recordsPreviewCount)).map((record) => (
                  <PersonalRecordCard
                    key={record.id}
                    record={record}
                    onChanged={() => setRecordsVersion((version) => version + 1)}
                  />
                ))}
              </div>
              {personalRecords.length > recordsPreviewCount && (
                <button
                  type="button"
                  className="text-action pr-view-all"
                  aria-expanded={showAllRecords}
                  onClick={() => setShowAllRecords((value) => !value)}
                >
                  {showAllRecords ? "Show less" : `View all ${personalRecords.length}`}
                </button>
              )}
            </>
          ) : (
            <p className="pr-empty">
              {isCurrentUser
                ? "Got a best? Claim your first PR with a photo as proof."
                : `${profile.name} hasn't claimed any PRs yet.`}
            </p>
          )}
        </section>
      )}


      <div className="section-heading compact">
        <h2>{isCurrentUser ? "Your sports" : "Sports"}</h2>
        {isCurrentUser && (
          <button
            type="button"
            className="text-action"
            onClick={() => navigate("/profile/sports/edit")}
          >
            Edit
          </button>
        )}
      </div>

      <div className="sport-list">
        {profile.sports.map((sport) => {
          const localMeetups = getConfirmedMeetupsForUserAndSport(
            profile.name,
            sport.name,
          ).length
          const meetupCount = isCurrentUser ? localMeetups : sport.meetups
          const sportPath = `/profile/${encodeURIComponent(profile.name)}/sports/${encodeURIComponent(sport.name)}`

          return (
            <button
              type="button"
              key={sport.name}
              className="sport-profile-row"
              onClick={() =>
                navigate(
                  isCurrentUser
                    ? `/profile/sports/${encodeURIComponent(sport.name)}`
                    : sportPath,
                )
              }
            >
              <span className="sport-profile-row-name">
                <SportIcon sport={sport.name} />
                <span>
                  <strong>{sport.name}</strong>
                  <small>{sport.level}</small>
                </span>
              </span>
              <span
                className={`sport-profile-row-count ${
                  meetupCount === 0 ? "empty" : ""
                }`}
              >
                {meetupCount === 0
                  ? "No meetups yet"
                  : `${meetupCount} ${
                      meetupCount === 1 ? "meetup" : "meetups"
                    }`}
              </span>
              <ChevronRight
                className="sport-profile-row-chevron"
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      <div className="section-heading compact">
        <h2>Patches</h2>
        <button
          type="button"
          className="text-action"
          onClick={() => navigate("/profile/patches")}
        >
          View all
        </button>
      </div>

      {earnedPatches.length > 0 ? (
        <div className="earned-patch-grid">
          {shownPatches.map((patch) => (
            <button
              type="button"
              key={patch.id}
              className="earned-patch-card"
              onClick={() => navigate("/profile/patches")}
            >
              <PatchIcon name={patch.icon} />
              <span>{patch.name}</span>
            </button>
          ))}
          {patchesOverflow && (
            <button
              type="button"
              className="earned-patch-card earned-patch-more"
              aria-label={`View all ${earnedPatches.length} patches`}
              onClick={() => navigate("/profile/patches")}
            >
              +{earnedPatches.length - shownPatches.length}
            </button>
          )}
        </div>
      ) : (
        <p className="profile-patches-empty">
          No patches yet. Your first meetup earns one.
        </p>
      )}

      <div className="section-heading compact">
        <h2>Friends</h2>
        {visibleFriends.length > friendsPreviewCount ? (
          <button
            type="button"
            className="text-action"
            onClick={() =>
              navigate(
                isCurrentUser
                  ? "/friends"
                  : `/profile/${encodeURIComponent(profile.name)}/friends`,
              )
            }
          >
            View all {visibleFriends.length}
          </button>
        ) : (
          <span>{visibleFriends.length}</span>
        )}
      </div>

      <div className="profile-friends-grid">
        {visibleFriends.slice(0, friendsPreviewCount).map((friend) => {
          const member = friend
          return (
            <div key={friend.id ?? friend.name} className="profile-friend-card">
              <MateCard
                member={member}
                onClick={() =>
                  navigate(getProfilePath(member))
                }
              />
              <div
                className="friend-menu-wrap profile-friend-menu"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="friend-menu-button"
                  aria-label={`Friend options for ${friend.name}`}
                  onClick={() =>
                    setOpenFriendMenu(
                      openFriendMenu === friend.name ? null : friend.name,
                    )
                  }
                >
                  <Settings2 className="h-4 w-4" />
                </button>

                {openFriendMenu === friend.name && (
                  <div className="friend-menu" role="menu">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFriendMenu(null)
                        navigate(
                          `/create?invite=${encodeURIComponent(friend.name)}`,
                        )
                      }}
                    >
                      Invite for activity
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleReportUser(friend.name)
                      }}
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleBlockUser(friend.name).then((blocked) => {
                          if (blocked)
                            setFriends((current) =>
                              current.filter(
                                (person) => person.name !== friend.name,
                              ),
                            )
                        })
                      }}
                    >
                      Block
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFriendMenu(null)
                        if (realFriends && friend.id) {
                          if (window.confirm(`Remove ${friend.name} from your friends?`)) {
                            void removeFriend(friend.id).catch((error: unknown) =>
                              setProfileLoadError(error instanceof Error ? error.message : "Unable to remove this friend."),
                            )
                          }
                          return
                        }
                        setFriends((current) =>
                          current.filter(
                            (person) => person.name !== friend.name,
                          ),
                        )
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {statusMessage ? (
        <p className="profile-status-message" role="status">
          {statusMessage}
        </p>
      ) : null}
      {reportTarget && (
        <ReportDialog
          targetType="profile"
          targetId={reportTarget.id}
          targetLabel={`profile: ${reportTarget.label}`}
          onBlock={async () => {
            const blocked = await handleBlockUser(reportTarget.label)
            if (!blocked) throw new Error("Unable to block this member.")
          }}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  )
}
