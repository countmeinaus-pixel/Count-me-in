import { useEffect, useState } from "react"
import { MorePageHeader } from "../components/MorePageHeader"
import { useBackToMore } from "../lib/moreNavigation"
import {
  getProfileVisibility,
  removeBlockedUser,
  saveProfileVisibility,
  type ProfileVisibility,
} from "../lib/localPreferences"
import {
  getBlockedProfiles,
  unblockProfile,
  type BlockedProfile,
} from "../lib/moderation"

const visibilityOptions: Array<{ value: ProfileVisibility; label: string }> = [
  { value: "members", label: "All Count Me In members" },
  {
    value: "activityConnections",
    label: "People I’ve shared an activity with",
  },
  { value: "hidden", label: "Hidden from member search" },
]

export function PrivacySettingsScreen() {
  const backToMore = useBackToMore()
  const [visibility, setVisibility] = useState<ProfileVisibility>("members")
  const [blockedUsers, setBlockedUsers] = useState<BlockedProfile[]>([])
  const [error, setError] = useState("")
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true)

  useEffect(() => {
    let active = true
    async function loadSettings() {
      try {
        setVisibility(getProfileVisibility())
        const blockedProfiles = await getBlockedProfiles()
        if (active) setBlockedUsers(blockedProfiles)
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load blocked members.",
          )
      } finally {
        if (active) setIsLoadingBlocks(false)
      }
    }
    void loadSettings()
    return () => {
      active = false
    }
  }, [])

  function updateVisibility(nextVisibility: ProfileVisibility) {
    try {
      saveProfileVisibility(nextVisibility)
      setVisibility(nextVisibility)
      setError("")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save profile visibility.",
      )
    }
  }

  async function unblockUser(profile: BlockedProfile) {
    try {
      await unblockProfile(profile.id)
      removeBlockedUser(profile.name)
      setBlockedUsers((current) =>
        current.filter((blockedProfile) => blockedProfile.id !== profile.id),
      )
      setError("")
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to unblock this member.",
      )
    }
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Privacy and safety" onBack={backToMore} />
      <section className="more-setting-section">
        <h2>Who can see your profile?</h2>
        <div
          className="more-choice-list"
          role="radiogroup"
          aria-label="Profile visibility"
        >
          {visibilityOptions.map((option) => (
            <button
              type="button"
              className="more-choice-row"
              role="radio"
              aria-checked={visibility === option.value}
              key={option.value}
              onClick={() => updateVisibility(option.value)}
            >
              <span className="more-radio" aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <p className="more-settings-note">
          This preference is saved on this device. It does not change profile
          visibility for other members yet.
        </p>
      </section>

      <section className="more-setting-section">
        <h2>Blocked members</h2>
        {isLoadingBlocks ? (
          <p className="more-settings-note">Loading blocked members…</p>
        ) : blockedUsers.length > 0 ? (
          <ul className="blocked-user-list">
            {blockedUsers.map((profile) => (
              <li key={profile.id}>
                <span>{profile.name}</span>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => void unblockUser(profile)}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="more-settings-note">You haven’t blocked anyone.</p>
        )}
        <p className="more-settings-note">
          Blocked members cannot see your profile or activities, and you cannot
          see theirs. Chat blocking will be connected when chats are stored in
          Supabase.
        </p>
      </section>
      {error && (
        <p className="more-status-message error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
