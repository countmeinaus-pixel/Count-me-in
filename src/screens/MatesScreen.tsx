import { ArrowLeft, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MateCard } from "../components/MateCard"
import { getBlockedUsers } from "../lib/localPreferences"
import { getBlockedProfiles } from "../lib/moderation"
import { useBackToMore } from "../lib/moreNavigation"
import { useCommunityMembers } from "../lib/useCommunityMembers"

const friendNames = ["Matt", "Hamish", "Sam", "Luca"]

export function MatesScreen({
  friendsOnly = false,
  fromMore = false,
}: {
  friendsOnly?: boolean
  fromMore?: boolean
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const backToMore = useBackToMore()
  const [query, setQuery] = useState("")
  const [selectedSport, setSelectedSport] = useState("")
  const [selectedSuburb, setSelectedSuburb] = useState("")
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [blockedUsersError, setBlockedUsersError] = useState("")
  const title = friendsOnly ? "Friends" : "Find your crew"
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
    if (friendsOnly && !friendNames.includes(member.name)) return false
    const matchesName = member.name.toLowerCase().includes(normalizedQuery)
    const matchesSport =
      !selectedSport ||
      member.sports.some((sport) => sport.name === selectedSport)
    const matchesSuburb = !selectedSuburb || member.suburb === selectedSuburb
    return matchesName && matchesSport && matchesSuburb
  })

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
          <h1>{title}</h1>
        </div>
      </header>

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
        <h2>{friendsOnly ? "Your friends" : "Mates around Adelaide"}</h2>
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
    </div>
  )
}
