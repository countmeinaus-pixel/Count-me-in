import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { MateCard } from "../components/MateCard"
import { getProfilePath } from "../lib/profile"
import { friendNames } from "../lib/friends"
import { getBlockedUsers } from "../lib/localPreferences"
import { useCommunityMembers } from "../lib/useCommunityMembers"

// All friends of someone else's profile, styled like the Friends page.
export function ProfileFriendsScreen() {
  const navigate = useNavigate()
  const { name = "" } = useParams()
  const { members: communityMembers } = useCommunityMembers()
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])

  useEffect(() => {
    try {
      setBlockedUsers(getBlockedUsers())
    } catch {
      setBlockedUsers([])
    }
  }, [])

  // Demo friends until friendships are stored in the database.
  const friends = communityMembers.filter(
    (member) =>
      friendNames.includes(member.name) &&
      member.name !== name &&
      !blockedUsers.includes(member.name),
  )

  return (
    <div className="screen mates-screen">
      <header className="mates-header">
        <button
          type="button"
          className="icon-button"
          aria-label={`Back to ${name}'s profile`}
          onClick={() => navigate(`/profile/${encodeURIComponent(name)}`)}
        >
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Good people, good plans</p>
          <h1>{name}’s friends</h1>
        </div>
      </header>

      <section aria-labelledby="profile-friends-heading">
        <div className="mates-results-heading">
          <h2 id="profile-friends-heading">Friends</h2>
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
            <h2>No friends yet</h2>
            <p>{name} hasn’t met up with anyone yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}
