import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MorePageHeader } from '../components/MorePageHeader'
import { SportIcon } from '../components/SportIcon'
import { currentUser } from '../data/mockData'
import { getMoreOrigin, useBackToMore } from '../lib/moreNavigation'
import { getCurrentProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'

type SportSummary = { name: string; skill: string }

export function MySportsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backToMore = useBackToMore()
  const [sports, setSports] = useState<SportSummary[]>(
    currentUser.sports.map(({ name, level }) => ({ name, skill: level })),
  )
  const [error, setError] = useState('')
  const [statusMessage] = useState(
    typeof location.state?.statusMessage === 'string' ? location.state.statusMessage : '',
  )

  useEffect(() => {
    let active = true
    async function loadSports() {
      if (!supabase) return
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError?.message === 'Auth session missing!') return
        if (userError) throw userError
        if (!userData.user) return

        const profile = await getCurrentProfile(userData.user.id)
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding first.')
        if (active) setSports(profile.sports.map(({ name, skill }) => ({ name, skill })))
      } catch (loadError) {
        if (active) {
          setSports([])
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your sports.')
        }
      }
    }

    void loadSports()
    return () => {
      active = false
    }
  }, [])

  function editSports() {
    navigate('/profile/sports/edit', {
      state: { returnTo: '/more/sports', from: getMoreOrigin(location.state) },
    })
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="My sports" eyebrow="Your sports" onBack={backToMore} />
      <p className="more-settings-intro">The sports you’re into and the level you’re comfortable at.</p>
      {sports.length > 0 ? (
        <div className="more-sports-list">
          {sports.map((sport) => (
            <div className="more-sport-row" key={sport.name}>
              <SportIcon sport={sport.name} />
              <strong>{sport.name}</strong>
              <small>{sport.skill}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="more-settings-note">Choose a sport to start finding activities.</p>
      )}
      {error && <p className="more-status-message error" role="alert">{error}</p>}
      {statusMessage && <p className="more-status-message" role="status">{statusMessage}</p>}
      <button type="button" className="primary-action more-edit-sports-button" onClick={editSports}>
        <Pencil aria-hidden="true" />Edit sports
      </button>
    </main>
  )
}
