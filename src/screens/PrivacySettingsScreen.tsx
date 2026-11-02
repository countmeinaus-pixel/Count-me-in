import { useEffect, useState } from 'react'
import { MorePageHeader } from '../components/MorePageHeader'
import { useBackToMore } from '../lib/moreNavigation'
import {
  getBlockedUsers,
  getProfileVisibility,
  removeBlockedUser,
  saveProfileVisibility,
  type ProfileVisibility,
} from '../lib/localPreferences'

const visibilityOptions: Array<{ value: ProfileVisibility; label: string }> = [
  { value: 'members', label: 'All Count Me In members' },
  { value: 'activityConnections', label: 'People I’ve shared an activity with' },
  { value: 'hidden', label: 'Hidden from member search' },
]

export function PrivacySettingsScreen() {
  const backToMore = useBackToMore()
  const [visibility, setVisibility] = useState<ProfileVisibility>('members')
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      setVisibility(getProfileVisibility())
      setBlockedUsers(getBlockedUsers())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load privacy settings.')
    }
  }, [])

  function updateVisibility(nextVisibility: ProfileVisibility) {
    try {
      saveProfileVisibility(nextVisibility)
      setVisibility(nextVisibility)
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save profile visibility.')
    }
  }

  function unblockUser(name: string) {
    try {
      removeBlockedUser(name)
      setBlockedUsers((current) => current.filter((blockedName) => blockedName !== name))
      setError('')
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to unblock this member.')
    }
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Privacy and safety" onBack={backToMore} />
      <section className="more-setting-section">
        <h2>Who can see your profile?</h2>
        <div className="more-choice-list" role="radiogroup" aria-label="Profile visibility">
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
        <p className="more-settings-note">Your choice is saved on this device. Profile visibility is not enforced for other members until the Supabase privacy rules are added.</p>
      </section>

      <section className="more-setting-section">
        <h2>Blocked members</h2>
        {blockedUsers.length > 0 ? (
          <ul className="blocked-user-list">
            {blockedUsers.map((name) => (
              <li key={name}>
                <span>{name}</span>
                <button type="button" className="text-action" onClick={() => unblockUser(name)}>Unblock</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="more-settings-note">You haven’t blocked anyone.</p>
        )}
        <p className="more-settings-note">Blocked members are hidden from Find your crew and your Friends list on this device. Blocking is not yet synced across devices.</p>
      </section>
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </main>
  )
}
