import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { MorePageHeader } from '../components/MorePageHeader'
import {
  getCurrentModerationRole,
  getModerationTeam,
  searchMembersByName,
  setMemberRole,
  type TeamMember,
} from '../lib/moderation'
import { useBackToMore } from '../lib/moreNavigation'

type SearchResult = Awaited<ReturnType<typeof searchMembersByName>>[number]

// Admin only: make members moderator, or take that role away again.
export function TeamScreen() {
  const backToMore = useBackToMore()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getCurrentModerationRole()
      .then(async (role) => {
        if (!active) return
        setIsAdmin(role === 'admin')
        if (role === 'admin') {
          const members = await getModerationTeam()
          if (active) setTeam(members)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setIsAdmin(false)
          setError(loadError instanceof Error ? loadError.message : 'Unable to load the team.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Search as you type (from 2 letters), with a short pause.
  useEffect(() => {
    if (!isAdmin) return
    let active = true
    const timer = window.setTimeout(() => {
      searchMembersByName(query)
        .then((found) => {
          if (active) setResults(found)
        })
        .catch((searchError: unknown) => {
          if (active) setError(searchError instanceof Error ? searchError.message : 'Unable to search members.')
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, isAdmin])

  async function changeRole(member: { id: string; name: string }, role: 'user' | 'moderator') {
    if (role === 'user' && !window.confirm(`Remove ${member.name} as moderator?`)) return
    setBusyId(member.id)
    setError('')
    setNotice('')
    try {
      await setMemberRole(member.id, role)
      setTeam(await getModerationTeam())
      setNotice(role === 'moderator' ? `${member.name} is now a moderator.` : `${member.name} is no longer a moderator.`)
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to change this role.')
    } finally {
      setBusyId(null)
    }
  }

  const teamIds = new Set((team ?? []).map((member) => member.id))

  return (
    <main className="screen more-settings-page team-page">
      <MorePageHeader title="Team" onBack={backToMore} />
      {isAdmin === null ? (
        <p className="more-settings-note">Loading…</p>
      ) : !isAdmin ? (
        <p className="more-settings-note">Only admins can manage the team.</p>
      ) : (
        <>
          <p className="more-settings-intro">
            Moderators can review reports, PRs and activities with a new sport. Only admins can add sports and change roles.
          </p>
          {notice && <p className="activity-share-feedback" role="status">{notice}</p>}
          {error && <p className="edit-form-error" role="alert">{error}</p>}

          <h3 className="more-settings-subtitle">Current team</h3>
          {team === null ? (
            <p className="more-settings-note">Loading team…</p>
          ) : (
            <div className="team-list">
              {team.map((member) => (
                <div className="team-row" key={member.id}>
                  <Avatar name={member.name} photoUrl={member.photoUrl} size={36} />
                  <span className="grow">
                    <strong>{member.name}</strong>
                    <small>{member.role === 'admin' ? 'Admin' : 'Moderator'}</small>
                  </span>
                  {member.role === 'moderator' && (
                    <button type="button" className="button button-secondary button-sm" disabled={busyId !== null} onClick={() => void changeRole(member, 'user')}>
                      {busyId === member.id ? 'Saving…' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <h3 className="more-settings-subtitle">Add a moderator</h3>
          <label className="mate-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search members by name"
              aria-label="Search members by name"
            />
          </label>
          {query.trim().length >= 2 && (
            results.length ? (
              <div className="team-list">
                {results.map((member) => (
                  <div className="team-row" key={member.id}>
                    <Avatar name={member.name} photoUrl={member.photoUrl} size={36} />
                    <span className="grow">
                      <strong>{member.name}</strong>
                      <small>{member.suburb}</small>
                    </span>
                    {teamIds.has(member.id) ? (
                      <small className="team-badge">Already in the team</small>
                    ) : (
                      <button type="button" className="button button-primary button-sm" disabled={busyId !== null} onClick={() => void changeRole(member, 'moderator')}>
                        {busyId === member.id ? 'Saving…' : 'Make moderator'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="more-settings-note">No members found with that name.</p>
            )
          )}
        </>
      )}
    </main>
  )
}
