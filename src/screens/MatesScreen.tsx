import { ArrowLeft, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MateCard } from "../components/MateCard"
import { getBlockedUsers } from "../lib/localPreferences"
import { getBlockedProfiles } from "../lib/moderation"
import { useBackToMore } from "../lib/moreNavigation"
import { useCommunityMembers } from "../lib/useCommunityMembers"

const friendNames = ["Matt", "Hamish", "Sam", "Luca"]

// Friends and Find your crew live on one page: your friends first, everyone else below.
export function MatesScreen({ fromMore = false }: { fromMore?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const backToMore = useBackToMore()
  const [query, setQuery] = useState("")
  const [selectedSport, setSelectedSport] = useState("")
  const [selectedSuburb, setSelectedSuburb] = useState("")
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [blockedUsersError, setBlockedUsersError] = useState("")
  const crewSectionRef = useRef<HTMLElement | null>(null)
  const { members: communityMembers, error: membersError } =
    useCommunityMembers()
  const sports = [
    ...new Set(
      communityMembers.flatMap((member) =>
        member.sports.map((sport) => sport.name),
      ),
    ),
  ].sort()
  const suburbs = [
    ...new Set(communityMembers.map((member) => member.suburb)),
  ].sort()

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
  const filteredMembers = communityMembers.filter((member) => {
    if (blockedUsersError) return false
    if (blockedUsers.includes(member.name)) return false
    if (friendNames.includes(member.name)) return false
    const matchesName = member.name.toLowerCase().includes(normalizedQuery)
    const matchesSport =
      !selectedSport ||
      member.sports.some((sport) => sport.name === selectedSport)
    const matchesSuburb = !selectedSuburb || member.suburb === selectedSuburb
    return matchesName && matchesSport && matchesSuburb
  })

  const friends = communityMembers.filter(
    (member) =>
      friendNames.includes(member.name) &&
      !blockedUsers.includes(member.name),
  )

  function scrollToCrew() {
    crewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useEffect(() => {
    if (location.hash === "#crew") crewSectionRef.current?.scrollIntoView()
  }, [location.hash])

  return (
    <div className="screen mates-screen">
      <header className="mates-header">
        <button
          type="button"
          className="icon-button"
          aria-label={fromMore ? "Back to More" : "Back to home"}
          onClick={() =>
            fromMore || location.state?.from === "/more"
              ? backToMore()
              : navigate("/")
          }
        >
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Good people, good plans</p>
          <h1>Friends</h1>
        </div>
      </header>

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
                  navigate(`/profile/${encodeURIComponent(member.name)}`)
                }
              />
            ))}
          </div>
        ) : (
          <div className="mate-empty-state">
            <h2>Your crew starts here</h2>
            <p>Meet someone at an activity and add him as a friend.</p>
            <button type="button" onClick={scrollToCrew}>
              Find your crew
            </button>
          </div>
        )}
      </section>

      <section
        className="mates-crew-section"
        id="crew"
        ref={crewSectionRef}
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

      <div className="mate-filters">
        <label>
          <span>Sport</span>
          <select
            value={selectedSport}
            onChange={(event) => setSelectedSport(event.target.value)}
            aria-label="Filter by sport"
          >
            <option value="">All sports</option>
            {sports.map((sport) => (
              <option value={sport} key={sport}>
                {sport}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Location</span>
          <select
            value={selectedSuburb}
            onChange={(event) => setSelectedSuburb(event.target.value)}
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {suburbs.map((suburb) => (
              <option value={suburb} key={suburb}>
                {suburb}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mates-results-heading">
        <h3>Mates around Adelaide</h3>
        <span>{filteredMembers.length} profiles</span>
      </div>

      {filteredMembers.length > 0 ? (
        <div className="mate-grid">
          {filteredMembers.map((member) => (
            <MateCard
              key={member.id ?? member.name}
              member={member}
              onClick={() =>
                navigate(`/profile/${encodeURIComponent(member.name)}`)
              }
            />
          ))}
        </div>
      ) : (
        <div className="mate-empty-state">
          <h2>No mates found</h2>
          <p>Try another name, sport or location.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setSelectedSport("")
              setSelectedSuburb("")
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      </section>
    </div>
  )
}
