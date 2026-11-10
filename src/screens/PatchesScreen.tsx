import { ArrowLeft, Check, LockKeyhole, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { PatchIcon } from '../components/PatchIcon'
import { patchCategories } from '../data/patches'
import { getPatchProgressForUser, loadSavedMeetupsForUser, type PatchProgress } from '../lib/checkins'
import { getCurrentProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { getMoreOrigin } from '../lib/moreNavigation'

function formatEarnedDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PatchProgressBar({ patch }: { patch: PatchProgress }) {
  const progressPercent = Math.min(100, (patch.progress / patch.target) * 100)

  return (
    <div className="patch-progress">
      <div
        className="patch-progress-track"
        role="progressbar"
        aria-label={`${patch.name} progress`}
        aria-valuemin={0}
        aria-valuemax={patch.target}
        aria-valuenow={patch.progress}
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <small>{patch.progress} of {patch.target} {patch.progressLabel}</small>
    </div>
  )
}

export function PatchesScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo === '/more' ? '/more' : '/profile'
  const moreOrigin = getMoreOrigin(location.state)
  const [selectedPatch, setSelectedPatch] = useState<PatchProgress | null>(null)
  const [userName, setUserName] = useState(currentUser.name)
  const [profileError, setProfileError] = useState('')
  const [, setCheckinVersion] = useState(0)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!supabase) return
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError?.message === 'Auth session missing!') return
        if (userError) throw userError
        if (!userData.user) return
        const profile = await getCurrentProfile(userData.user.id)
        if (active && profile) {
          setUserName(profile.firstName)
          await loadSavedMeetupsForUser(profile.firstName)
          if (active) setCheckinVersion((version) => version + 1)
        }
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : 'Unable to load your profile.')
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [])

  const patches = getPatchProgressForUser(userName)
  const earnedPatches = patches.filter((patch) => patch.earned)
  const lockedPatches = patches.filter((patch) => !patch.earned)
  const earnedCount = earnedPatches.length

  function renderPatchCard(patch: PatchProgress) {
    return (
      <button
        type="button"
        key={patch.id}
        className={`all-patch-card ${patch.earned ? 'earned' : 'locked'}`}
        onClick={() => setSelectedPatch(patch)}
        aria-label={`${patch.name}, ${patch.earned ? 'earned' : `${patch.progress} of ${patch.target} ${patch.progressLabel}`}`}
      >
        <span className="all-patch-icon">
          <PatchIcon name={patch.icon} />
          {patch.earned
            ? <span className="patch-earned-mark"><Check aria-hidden="true" /></span>
            : <LockKeyhole className="patch-lock-mark" aria-hidden="true" />}
        </span>
        <strong>{patch.name}</strong>
        <small>{patch.rule}</small>
        {patch.earned
          ? <span className="patch-earned-date">Earned {formatEarnedDate(patch.earnedAt)}</span>
          : <PatchProgressBar patch={patch} />}
      </button>
    )
  }

  return (
    <div className="screen patches-page">
      <header className="patches-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Back"
          onClick={() => navigate(returnTo, { replace: true, state: returnTo === '/more' ? { from: moreOrigin } : undefined })}
        >
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Keep showing up</p>
          <h1>Patches</h1>
        </div>
        <span className="patches-summary">{earnedCount} of {patches.length} earned</span>
      </header>
      {profileError && <p className="edit-form-error" role="alert">{profileError}</p>}

      <section className="patch-category" aria-labelledby="my-patches-heading">
        <h2 id="my-patches-heading">My patches</h2>
        {earnedPatches.length > 0 ? (
          <div className="all-patches-grid">{earnedPatches.map(renderPatchCard)}</div>
        ) : (
          <div className="empty-state-card compact">
            <h3>No patches yet</h3>
            <p>Confirm your first meetup with a QR check-in to earn your first patch.</p>
          </div>
        )}
      </section>

      {lockedPatches.length > 0 && (
        <div className="patches-to-collect">
          <h2 className="patches-to-collect-title">Patches to collect</h2>
          {patchCategories.map((category) => {
            const categoryPatches = lockedPatches.filter((patch) => patch.category === category)
            if (categoryPatches.length === 0) return null

            return (
              <section key={category} className="patch-category">
                <h3>{category}</h3>
                <div className="all-patches-grid">{categoryPatches.map(renderPatchCard)}</div>
              </section>
            )
          })}
        </div>
      )}

      {selectedPatch && (
        <div className="patch-sheet-scrim" role="presentation" onClick={() => setSelectedPatch(null)}>
          <section
            className="patch-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patch-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="icon-button patch-sheet-close" aria-label="Close patch details" onClick={() => setSelectedPatch(null)}>
              <X />
            </button>
            <span className={`patch-sheet-icon ${selectedPatch.earned ? 'earned' : 'locked'}`}>
              <PatchIcon name={selectedPatch.icon} />
            </span>
            <p className="eyebrow">{selectedPatch.earned ? 'Patch earned' : selectedPatch.category}</p>
            <h2 id="patch-sheet-title">{selectedPatch.name}</h2>
            <p className="patch-sheet-description">{selectedPatch.description}</p>
            <p className="patch-sheet-rule">{selectedPatch.rule}</p>
            {selectedPatch.earned
              ? <p className="patch-sheet-earned">Earned {formatEarnedDate(selectedPatch.earnedAt)}</p>
              : <PatchProgressBar patch={selectedPatch} />}
          </section>
        </div>
      )}
    </div>
  )
}
