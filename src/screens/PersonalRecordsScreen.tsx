import { ArrowLeft, Plus } from 'lucide-react'
import { ListSkeleton } from '../components/Skeleton'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ClaimPrDialog } from '../components/ClaimPrDialog'
import { PersonalRecordCard } from '../components/PersonalRecordCard'
import { getMoreOrigin } from '../lib/moreNavigation'
import { getPersonalRecordsForProfile, isRecordVerified, type PersonalRecord } from '../lib/personalRecords'
import { getCurrentProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'

// Your own personal records: claim new ones and see how many confirms they have.
export function PersonalRecordsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo === '/more' ? '/more' : '/profile'
  const moreOrigin = getMoreOrigin(location.state)
  const [profile, setProfile] = useState<{ id: string; sports: string[] } | null>(null)
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notSignedIn, setNotSignedIn] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setError('')
      try {
        if (!supabase) {
          setNotSignedIn(true)
          return
        }
        const { data } = await supabase.auth.getUser()
        if (!data.user) {
          if (active) setNotSignedIn(true)
          return
        }
        const current = await getCurrentProfile(data.user.id)
        if (!current) throw new Error('Your profile could not be found. Please complete onboarding first.')
        if (active) setProfile({ id: current.id, sports: current.sports.map((sport) => sport.name) })
        const result = await getPersonalRecordsForProfile(current.id)
        if (active) setRecords(result ?? [])
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your personal records.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [version])

  const verifiedCount = records.filter(isRecordVerified).length

  return (
    <div className="screen patches-page">
      <header className="mates-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Back"
          onClick={() => navigate(returnTo, { replace: true, state: returnTo === '/more' ? { from: moreOrigin } : undefined })}
        >
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Show what you've got</p>
          <h1>Personal records</h1>
        </div>
        {records.length > 0 && <span className="patches-summary">{verifiedCount} of {records.length} verified</span>}
      </header>

      <p className="challenges-intro">
        Claim a PR with a photo as proof. Other members confirm it, and after 3 confirms it gets a verified tick on your profile.
      </p>

      {notSignedIn ? (
        <p className="pr-empty">Sign in to claim your personal records.</p>
      ) : (
        <Button size="lg" onClick={() => setClaimOpen(true)} disabled={!profile}>
          <Plus aria-hidden="true" /> Claim a PR
        </Button>
      )}

      {statusMessage && <p className="activity-share-feedback" role="status">{statusMessage}</p>}
      {error && <p className="edit-form-error" role="alert">{error}</p>}

      {isLoading ? (
        <ListSkeleton rows={4} label="Loading your records" />
      ) : records.length > 0 ? (
        <div className="pr-grid">
          {records.map((record) => (
            <PersonalRecordCard key={record.id} record={record} onChanged={() => setVersion((value) => value + 1)} />
          ))}
        </div>
      ) : !notSignedIn && !error ? (
        <div className="empty-state-card compact">
          <h3>No PRs yet</h3>
          <p>Deepest dive, fastest 10 km, heaviest deadlift? Claim your first one.</p>
        </div>
      ) : null}

      {claimOpen && profile && (
        <ClaimPrDialog
          preferredSports={profile.sports}
          onClose={() => setClaimOpen(false)}
          onClaimed={() => {
            setClaimOpen(false)
            setStatusMessage('PR claimed. Other members can now confirm it.')
            setVersion((value) => value + 1)
          }}
        />
      )}
    </div>
  )
}
