import { ArrowLeft, ChevronRight, Search, SlidersHorizontal, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MateCard } from "../components/MateCard"
import { getProfilePath } from "../lib/profile"
import { getBlockedUsers } from "../lib/localPreferences"
import { getBlockedProfiles } from "../lib/moderation"
import { useBackToMore } from "../lib/moreNavigation"
import { useCommunityMembers } from "../lib/useCommunityMembers"
import { friendNames } from "../lib/friends"
import { respondToFriendRequest, useMyFriendships } from "../lib/friendships"
import { TopMatchCard } from "../components/CrewSection"
import { MateFilterPanel } from "../components/MateFilterPanel"
import { activities as demoActivities } from "../data/mockData"
import { getSavedActivityFeed } from "../lib/activityParticipation"
import { setLocationPreference, useLocationPreference } from "../lib/distance"
import { applyMateFilters, countActiveFilters, defaultMateFilters, type MateFilters } from "../lib/mateFilters"
import { useViewerProfile } from "../lib/viewerProfile"
import { inviteMate } from "../lib/invite"


// Two pages from one screen:
// - "friends" (bottom nav): only the people you are friends with.
// - "crew" (More > Community): friend requests, invite a mate, and search everyone else.
export function MatesScreen({ view = "friends" }: { view?: "friends" | "crew" }) {
  const isCrew = view === "crew"
  const navigate = useNavigate()
  const location = useLocation()
  const backToMore = useBackToMore()
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<MateFilters>(defaultMateFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const locationPreference = useLocationPreference()
  const [hostingSoonNames, setHostingSoonNames] = useState<Set<string>>(new Set())
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [blockedUsersError, setBlockedUsersError] = useState("")
  // Signed in: real friends and requests. Signed out: the demo friends.
  const { data: friendships, error: friendshipsError } = useMyFriendships()
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [requestError, setRequestError] = useState("")
  const viewer = useViewerProfile()
  const viewerProfile = viewer.status === "ready" ? viewer.profile : null
  const viewerSports = viewerProfile?.sports.map((sport) => sport.name) ?? []
  const viewerSuburb = viewerProfile?.suburb ?? ""
  const { members: communityMembers, error: membersError } =
    useCommunityMembers()
  const sports = [
    ...new Set(
      communityMembers.flatMap((member) =>
        member.sports.map((sport) => sport.name),
      ),
    ),
  ].sort()

  // Who hosts an activity in the next two weeks (for the "Hosting something soon" filter).
  useEffect(() => {
    let active = true
    const soon = Date.now() + 14 * 24 * 60 * 60 * 1000
    const collect = (list: Array<{ host: string; startsAt: Date }>) =>
      list.filter((activity) => activity.startsAt.getTime() >= Date.now() && activity.startsAt.getTime() <= soon).map((activity) => activity.host)
    setHostingSoonNames(new Set(collect(demoActivities)))
    getSavedActivityFeed()
      .then((feed) => {
        if (active) setHostingSoonNames(new Set([...collect(demoActivities), ...collect(feed)]))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    async function loadBlockedMembers() {
      try {
        setBlockedUsers(getBlockedUsers())
        const remoteBlocks = await getBlockedProfiles()
        if (active)
          setBlockedUsers((current) => [
            ...new Set([
              ...current,
              ...remoteBlocks.map((profile) => profile.name),
            ]),
          ])
      } catch (error) {
        if (active)
          setBlockedUsersError(
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

  const normalizedQuery = query.trim().toLowerCase()
  const candidates = communityMembers.filter((member) => {
    if (blockedUsersError) return false
    if (blockedUsers.includes(member.name)) return false
    if (viewerProfile && member.id === viewerProfile.id) return false
    if (friendships ? friendships.friends.some((friend) => friend.id === member.id) : friendNames.includes(member.name)) return false
    return member.name.toLowerCase().includes(normalizedQuery)
  })
  const filterContext = { viewerSports, viewerSuburb, hostingSoonNames }
  const filteredMembers = applyMateFilters(candidates, filters, { ...filterContext, location: locationPreference })
  const activeFilterCount = countActiveFilters(filters, locationPreference)

  const friends = (friendships
    ? friendships.friends
    : communityMembers.filter((member) => friendNames.includes(member.name))
  ).filter((member) => !blockedUsers.includes(member.name))
  const incoming = friendships?.incoming ?? []

  async function answerRequest(requestId: string, accept: boolean) {
    setRespondingTo(requestId)
    setRequestError("")
    try {
      await respondToFriendRequest(requestId, accept)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to answer this friend request.")
    } finally {
      setRespondingTo(null)
    }
  }

  function goBack() {
    if (location.state?.from === "/more" || (isCrew && !(window.history.state?.idx > 0))) backToMore()
    else if (isCrew) navigate(-1)
    else navigate("/")
  }

  return (
    <div className="screen mates-screen">
      <header className="mates-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Back"
          onClick={goBack}
        >
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">{isCrew ? "Invites and new mates" : "Good people, good plans"}</p>
          <h1>{isCrew ? "Find new crew" : "Friends"}</h1>
        </div>
      </header>

      {!isCrew && (
        <button type="button" className="mates-crew-link" onClick={() => navigate("/more/crew")}>
          <span className="mates-crew-link-icon"><UserPlus aria-hidden="true" /></span>
          <span className="grow">
            <strong>Find new crew</strong>
            <small>{incoming.length > 0 ? `${incoming.length} friend ${incoming.length === 1 ? "request" : "requests"} waiting` : "Friend requests, invites and new mates"}</small>
          </span>
          {incoming.length > 0 && <span className="mates-crew-link-badge">{incoming.length}</span>}
          <ChevronRight aria-hidden="true" />
        </button>
      )}

      {isCrew && incoming.length > 0 && (
        <section className="friend-requests" aria-labelledby="friend-requests-heading">
          <div className="mates-results-heading">
            <h2 id="friend-requests-heading">Friend requests</h2>
            <span>{incoming.length}</span>
          </div>
          <div className="friend-request-cards">
            {incoming.map(({ requestId, member }) => {
              const shared = member.sports.map((sport) => sport.name).filter((sport) => viewerSports.includes(sport))
              const nearby = Boolean(viewerSuburb) && member.suburb.toLowerCase() === viewerSuburb.toLowerCase()
              return (
                <TopMatchCard
                  key={requestId}
                  suggestion={{ member, reason: '', shared, nearby }}
                  hosting={null}
                  label="New friend request"
                  icon={UserPlus}
                  ctaVariant="secondary"
                  onOpenProfile={(person) => navigate(getProfilePath(person))}
                >
                  <div className="friend-request-buttons">
                    <button type="button" className="button button-secondary button-md" disabled={respondingTo !== null} onClick={() => void answerRequest(requestId, false)}>Decline</button>
                    <button type="button" className="button button-primary button-md" disabled={respondingTo !== null} onClick={() => void answerRequest(requestId, true)}>Accept</button>
                  </div>
                </TopMatchCard>
              )
            })}
          </div>
          {requestError && <p className="inline-error" role="alert">{requestError}</p>}
        </section>
      )}
      {friendshipsError && <p className="inline-error" role="alert">{friendshipsError}</p>}

      {!isCrew && (
      <section aria-labelledby="your-friends-heading">
        <div className="mates-results-heading">
          <h2 id="your-friends-heading">Your friends</h2>
          <span>{friends.length} friends</span>
        </div>
        {friends.length > 0 ? (
          <div className="mate-grid">
            {friends.map((member) => (
              <MateCard
                key={member.id ?? member.name}
                member={member}
                onClick={() =>
                  navigate(getProfilePath(member))
                }
              />
            ))}
          </div>
        ) : (
          <div className="mate-empty-state">
            <h2>Your crew starts here</h2>
            <p>Open someone's profile and tap Add friend. Once he accepts, he shows up here.</p>
            <button type="button" onClick={() => navigate("/more/crew")}>
              Find new crew
            </button>
          </div>
        )}
      </section>
      )}

      {isCrew && (
      <>
      <button type="button" className="mates-crew-link" onClick={() => void inviteMate()}>
        <span className="mates-crew-link-icon"><UserPlus aria-hidden="true" /></span>
        <span className="grow">
          <strong>Invite a mate</strong>
          <small>Send him a link to Count Me In</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>

      <section
        className="mates-crew-section"
        aria-labelledby="find-crew-heading"
      >
        <div className="mates-results-heading">
          <h2 id="find-crew-heading">Find your crew</h2>
        </div>

      {(blockedUsersError || membersError) && (
        <p className="edit-form-error" role="alert">
          {blockedUsersError || membersError}
        </p>
      )}
      <div className="mate-search-row">
        <label className="mate-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            aria-label="Search mates by name"
          />
        </label>
        <button
          type="button"
          className={`mate-filter-button ${activeFilterCount ? 'active' : ''}`}
          onClick={() => setFiltersOpen(true)}
          aria-label={activeFilterCount ? `Filters, ${activeFilterCount} on` : 'Filters'}
        >
          <SlidersHorizontal aria-hidden="true" />
          {activeFilterCount > 0 && <span className="mate-filter-count" aria-hidden="true">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="mates-results-heading">
        <h3>{locationPreference ? `Mates near ${locationPreference.label.replace(/^Near /, '')}` : 'Mates around Adelaide'}</h3>
        <span>{filteredMembers.length} profiles</span>
      </div>

      {filteredMembers.length > 0 ? (
        <div className="mate-grid">
          {filteredMembers.map((member) => (
            <MateCard
              key={member.id ?? member.name}
              member={member}
              onClick={() =>
                navigate(getProfilePath(member))
              }
            />
          ))}
        </div>
      ) : (
        <div className="mate-empty-state">
          <h2>No mates found</h2>
          <p>Try another name, fewer filters or a bigger distance.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setFilters(defaultMateFilters)
              setLocationPreference(null)
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      </section>
      {filtersOpen && (
        <MateFilterPanel
          filters={filters}
          location={locationPreference}
          sports={sports}
          countFor={(draft, location) => applyMateFilters(candidates, draft, { ...filterContext, location }).length}
          onApply={(next, location) => {
            setFilters(next)
            setLocationPreference(location)
            setFiltersOpen(false)
          }}
          onClose={() => setFiltersOpen(false)}
        />
      )}
      </>
      )}
    </div>
  )
}
