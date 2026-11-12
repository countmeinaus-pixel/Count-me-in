import { ArrowLeft, Check, ChevronDown, LockKeyhole, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { getActiveChallenges } from '../data/challenges'
import {
  getChallengeProgress,
  getEarnedChallenges,
  getJoinedChallengeIds,
  joinChallenge,
  leaveChallenge,
  type ChallengeProgress,
} from '../lib/challenges'
import { useLocation, useNavigate } from 'react-router-dom'
import { currentUser } from '../data/mockData'
import { PatchIcon } from '../components/PatchIcon'
import { patchCategories } from '../data/patches'
import { getPatchProgressForUser, loadSavedMeetupsForUser, type PatchProgress } from '../lib/checkins'
import { getCurrentProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { getMoreOrigin } from '../lib/moreNavigation'
import { loadConfirmedPrDates } from '../lib/personalRecords'
import { loadFriendDates } from '../lib/friendships'

function formatEarnedDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const generalPatchCategories: string[] = ['Getting started', 'Consistency', 'Sports', 'Social', 'Places']

function formatTimeLeft(endsAt: Date) {
  const days = Math.ceil((endsAt.getTime() - Date.now()) / 86400000)
  if (days <= 1) return 'Ends today'
  return `${days} days left`
}

function PatchProgressBar({ patch }: { patch: Pick<PatchProgress, 'name' | 'progress' | 'target' | 'progressLabel'> }) {
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
  const [joinedChallengeIds, setJoinedChallengeIds] = useState<string[]>([])
  const [challengeError, setChallengeError] = useState('')
  const [busyChallengeId, setBusyChallengeId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getJoinedChallengeIds()
      .then((ids) => {
        if (active) setJoinedChallengeIds(ids)
      })
      .catch((error: unknown) => {
        if (active) setChallengeError(error instanceof Error ? error.message : 'Unable to load your challenges.')
      })
    return () => {
      active = false
    }
  }, [])

  async function toggleChallenge(challenge: ChallengeProgress) {
    setBusyChallengeId(challenge.id)
    setChallengeError('')
    try {
      if (challenge.joined) {
        await leaveChallenge(challenge.id)
        setJoinedChallengeIds((ids) => ids.filter((id) => id !== challenge.id))
      } else {
        await joinChallenge(challenge.id)
        setJoinedChallengeIds((ids) => [...ids, challenge.id])
      }
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : 'Unable to update this challenge.')
    } finally {
      setBusyChallengeId(null)
    }
  }

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
          await loadConfirmedPrDates().catch(() => undefined)
          await loadFriendDates(profile.firstName).catch(() => undefined)
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
  const activeChallenges = getActiveChallenges().map((challenge) =>
    getChallengeProgress(challenge, userName, joinedChallengeIds.includes(challenge.id)),
  )
  const earnedChallenges = getEarnedChallenges(joinedChallengeIds, userName)
    .sort((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? ''))

  function renderEarnedChallenge(challenge: ChallengeProgress) {
    return (
      <div key={challenge.id} className="all-patch-card earned challenge-patch-card">
        <span className="all-patch-icon">
          <PatchIcon name={challenge.icon} />
          <span className="patch-earned-mark"><Check aria-hidden="true" /></span>
        </span>
        <strong>{challenge.name}</strong>
        <small>{challenge.rule}</small>
        <span className="patch-earned-date">Earned {formatEarnedDate(challenge.completedAt)}</span>
      </div>
    )
  }

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

      <section className="patch-category" aria-labelledby="challenges-heading" data-tour="patches-challenges">
        <h2 id="challenges-heading">Challenges</h2>
        <p className="challenges-intro">Join a challenge and reach the goal before time runs out to earn a limited patch.</p>
        {challengeError && <p className="edit-form-error" role="alert">{challengeError}</p>}
        <div className="challenge-list">
          {activeChallenges.map((challenge) => (
            <article key={challenge.id} className={`challenge-card ${challenge.joined ? 'joined' : ''}`}>
              <span className={`all-patch-icon ${challenge.completed ? '' : 'challenge-icon'}`}>
                <PatchIcon name={challenge.icon} />
                {challenge.completed && <span className="patch-earned-mark"><Check aria-hidden="true" /></span>}
              </span>
              <div className="challenge-body">
                <div className="challenge-title-row">
                  <strong>{challenge.name}</strong>
                  <span className="challenge-time-left">{formatTimeLeft(challenge.endsAt)}</span>
                </div>
                <small>{challenge.rule}</small>
                {challenge.completed ? (
                  <span className="patch-earned-date">Completed. Patch earned!</span>
                ) : challenge.joined ? (
                  <>
                    <PatchProgressBar patch={challenge} />
                    <button
                      type="button"
                      className="challenge-leave"
                      onClick={() => void toggleChallenge(challenge)}
                      disabled={busyChallengeId !== null}
                    >
                      Leave challenge
                    </button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void toggleChallenge(challenge)}
                    disabled={busyChallengeId !== null}
                  >
                    {busyChallengeId === challenge.id ? 'Joining…' : 'Join challenge'}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="patch-category" aria-labelledby="my-patches-heading" data-tour="patches-mine">
        <h2 id="my-patches-heading">My patches</h2>
        {earnedPatches.length + earnedChallenges.length > 0 ? (
          <div className="all-patches-grid">
            {earnedChallenges.map(renderEarnedChallenge)}
            {earnedPatches.map(renderPatchCard)}
          </div>
        ) : (
          <div className="empty-state-card compact">
            <h3>No patches yet</h3>
            <p>Confirm your first meetup with a QR check-in, or join a challenge above, to earn your first patch.</p>
          </div>
        )}
      </section>

      {lockedPatches.length > 0 && (
        <div className="patches-to-collect">
          <h2 className="patches-to-collect-title">Patches to collect</h2>
          {patchCategories.map((category) => {
            const categoryPatches = lockedPatches.filter((patch) => patch.category === category)
            if (categoryPatches.length === 0) return null

            if (generalPatchCategories.includes(category)) {
              return (
                <section key={category} className="patch-category">
                  <h3>{category}</h3>
                  <div className="all-patches-grid">{categoryPatches.map(renderPatchCard)}</div>
                </section>
              )
            }

            // Sports have 20 patches each, so they fold open on tap.
            const sportTotal = patches.filter((patch) => patch.category === category).length
            return (
              <details key={category} className="patch-sport-group">
                <summary>
                  <span className="patch-sport-name">{category}</span>
                  <span className="patch-sport-count">{sportTotal - categoryPatches.length} of {sportTotal}</span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div className="all-patches-grid">{categoryPatches.map(renderPatchCard)}</div>
              </details>
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
