import { ArrowLeft, Check, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SportIcon } from '../components/SportIcon'
import { getCurrentProfile, saveProfileSports, type ProfileSport, type SkillLevel } from '../lib/profile'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'
import { useUnsavedChangesWarning } from '../lib/useUnsavedChangesWarning'

const skillLevels: SkillLevel[] = ['Beginner', 'Intermediate', 'Experienced']

type CatalogSport = Pick<ProfileSport, 'id' | 'name' | 'icon'>

function sameSelection(current: ProfileSport[], initial: ProfileSport[]) {
  if (current.length !== initial.length) return false
  const initialSkills = new Map(initial.map((sport) => [sport.name, sport.skill]))
  return current.every((sport) => initialSkills.get(sport.name) === sport.skill)
}

export function EditSportsScreen() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [catalog, setCatalog] = useState<CatalogSport[]>([])
  const [selectedSports, setSelectedSports] = useState<ProfileSport[]>([])
  const [initialSports, setInitialSports] = useState<ProfileSport[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSports() {
      try {
        if (!supabase) {
          setError(getSupabaseSetupHint())
          return
        }

        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          navigate('/login', { replace: true })
          return
        }

        const [profile, catalogResult] = await Promise.all([
          getCurrentProfile(userData.user.id),
          supabase.from('sports').select('id, name, icon').order('name'),
        ])
        if (catalogResult.error) throw catalogResult.error
        if (!profile) {
          setError('Your profile could not be found. Please complete onboarding first.')
          return
        }

        if (!active) return
        setUserId(profile.id)
        setCatalog(catalogResult.data ?? [])
        setInitialSports(profile.sports)
        setSelectedSports(profile.sports)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your sports.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadSports()
    return () => {
      active = false
    }
  }, [navigate])

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return catalog.filter((sport) => sport.name.toLowerCase().includes(normalizedQuery))
  }, [catalog, query])
  const isDirty = !sameSelection(selectedSports, initialSports)
  useUnsavedChangesWarning(isDirty && !isSaving)

  function toggleSport(sport: CatalogSport) {
    setError('')
    const existing = selectedSports.find((item) => item.id === sport.id)
    if (existing && selectedSports.length === 1) {
      setError('Keep at least one sport selected.')
      return
    }

    setSelectedSports((current) => {
      if (existing) return current.filter((item) => item.id !== sport.id)
      return [...current, { ...sport, skill: 'Intermediate' }]
        .sort((left, right) => left.name.localeCompare(right.name))
    })
  }

  function updateLevel(sportId: number, skill: SkillLevel) {
    setSelectedSports((current) => current.map((sport) => (
      sport.id === sportId ? { ...sport, skill } : sport
    )))
    setError('')
  }

  async function handleSave() {
    if (!isDirty || selectedSports.length === 0) return
    setIsSaving(true)
    setError('')
    try {
      await saveProfileSports(userId, selectedSports.map(({ name, skill }) => ({ name, skill })))
      navigate('/profile', { replace: true, state: { statusMessage: 'Sports updated.' } })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your sports.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="screen edit-sports-page">
      <header className="edit-page-header">
        <button type="button" className="icon-button" aria-label="Back to profile" onClick={() => navigate('/profile')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">Your profile</p>
          <h1>Edit sports</h1>
        </div>
      </header>

      <p className="edit-page-intro">Choose the sports you want to find activities for, then set your level in each.</p>

      <label className="edit-sport-search">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sports"
          aria-label="Search sports"
        />
      </label>

      {isLoading ? (
        <p className="edit-form-status">Loading your sports…</p>
      ) : (
        <div className="edit-sports-list">
          {filteredCatalog.map((sport) => {
            const selected = selectedSports.find((item) => item.id === sport.id)
            return (
              <section key={sport.id} className={`edit-sport-card ${selected ? 'selected' : ''}`}>
                <button
                  type="button"
                  className="edit-sport-toggle"
                  aria-pressed={!!selected}
                  onClick={() => toggleSport(sport)}
                >
                  <SportIcon sport={sport.name} />
                  <span>{sport.name}</span>
                  {selected && <Check aria-label="Selected" />}
                </button>
                {selected && (
                  <div className="edit-sport-levels" aria-label={`${sport.name} level`}>
                    {skillLevels.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        aria-pressed={selected.skill === skill}
                        className={selected.skill === skill ? 'selected' : ''}
                        onClick={() => updateLevel(sport.id, skill)}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
          {filteredCatalog.length === 0 && <p className="edit-form-status">No sports match that search.</p>}
        </div>
      )}

      <p className="edit-sports-count">{selectedSports.length} {selectedSports.length === 1 ? 'sport' : 'sports'} selected</p>
      {error && <p className="edit-form-error" role="alert">{error}</p>}

      <div className="edit-form-actions">
        <button type="button" className="secondary-action" onClick={() => navigate('/profile')} disabled={isSaving}>Cancel</button>
        <button
          type="button"
          className="primary-action"
          onClick={() => void handleSave()}
          disabled={isLoading || !isDirty || selectedSports.length === 0 || isSaving}
        >
          <Check aria-hidden="true" />{isSaving ? 'Saving…' : 'Save sports'}
        </button>
      </div>
    </main>
  )
}
