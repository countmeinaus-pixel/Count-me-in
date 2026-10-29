import { ArrowLeft, LogOut, MapPin, Pencil, Settings2, ShieldCheck, Users, Waves } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { communityMembers, currentUser } from '../data/mockData'
import { getConfirmedMeetupCountForUser, getEarnedPatchesForUser, getLollipopChartForUser } from '../lib/checkins'
import { getStoredLanguage, getTranslations, setStoredLanguage, type Language } from '../lib/i18n'
import { updateProfilePhoto } from '../lib/profile'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

const patchIcons = {
  'first-meetup': ShieldCheck,
  regular: Users,
  crew: Users,
  'early-bird': ShieldCheck,
  'salt-water': Waves,
  trailhead: Waves,
  host: Users,
  'all-rounder': ShieldCheck,
} as const

const initialFriends = [
  { name: 'Matt', sport: 'Spearfishing', online: true },
  { name: 'Hamish', sport: 'Hiking', online: true },
  { name: 'Sam', sport: 'Running', online: false },
  { name: 'Luca', sport: 'Kitesurfing', online: true },
]

export function ProfileScreen() {
  const navigate = useNavigate()
  const { name: profileParam } = useParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null)
  const [friends, setFriends] = useState(initialFriends)
  const [openFriendMenu, setOpenFriendMenu] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const copy = getTranslations(language)

  const isCurrentUser = !profileParam || decodeURIComponent(profileParam) === currentUser.name
  const profile = isCurrentUser
    ? currentUser
    : communityMembers.find((member) => member.name === decodeURIComponent(profileParam ?? '')) ?? {
        name: decodeURIComponent(profileParam ?? currentUser.name),
        age: 31,
        suburb: 'Adelaide',
        verified: true,
        sports: [
          { name: 'Running', level: 'Intermediate' },
          { name: 'Hiking', level: 'Beginner' },
        ],
        stats: { meetups: 4, hosted: 1, sports: 2 },
      }
  const profileMeetups = isCurrentUser
    ? currentUser.stats.meetups + getConfirmedMeetupCountForUser(currentUser.name)
    : 12
  const patchList = useMemo(
    () => getEarnedPatchesForUser(isCurrentUser ? currentUser.name : profile.name),
    [isCurrentUser, profile.name],
  )
  const chartData = useMemo(
    () => getLollipopChartForUser(isCurrentUser ? currentUser.name : profile.name, 6),
    [isCurrentUser, profile.name],
  )

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      if (!supabase) {
        setStatusMessage(getSupabaseSetupHint())
        return
      }

      setIsUpdatingPhoto(true)
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        navigate('/login')
        return
      }

      const nextPhotoUrl = await updateProfilePhoto(userData.user.id, file)
      setProfilePhoto(nextPhotoUrl)
      setStatusMessage(copy.profileUpdated)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.photoUpdateFailed)
    } finally {
      setIsUpdatingPhoto(false)
      event.target.value = ''
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      navigate('/login')
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatusMessage(error.message)
      return
    }

    navigate('/login')
  }

  function handleReportUser(name: string) {
    setStatusMessage(`${name} has been reported. We will review the profile.`)
    setOpenFriendMenu(null)
    setProfileMenuOpen(false)
  }

  function handleBlockUser(name: string) {
    setBlockedUsers((current) => [...new Set([...current, name])])
    setStatusMessage(`${name} is now blocked and hidden from your activity flow.`)
    setOpenFriendMenu(null)
    setProfileMenuOpen(false)
  }

  return (
    <div className="screen profile-page">
      <header className="profile-header">
        <div className="profile-top">
          {!isCurrentUser && (
            <button type="button" onClick={() => navigate(-1)} className="icon-button" aria-label="Back">
              <ArrowLeft />
            </button>
          )}

          {!isCurrentUser && (
            <div className="friend-menu-wrap profile-more-wrap" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="friend-menu-button"
                aria-label={`More options for ${profile.name}`}
                onClick={() => setProfileMenuOpen((current) => !current)}
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {profileMenuOpen && (
                <div className="friend-menu" role="menu">
                  <button type="button" onClick={() => handleReportUser(profile.name)}>Report</button>
                  <button type="button" onClick={() => handleBlockUser(profile.name)}>Block</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="profile-identity">
        <div className="relative">
          {isCurrentUser ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="avatar hero-avatar flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#7fb7a8] bg-[#163430] text-4xl font-bold text-[#e6e2d8]"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profielfoto" className="h-full w-full object-cover" />
              ) : (
                'J'
              )}
            </button>
          ) : (
            <div className="avatar hero-avatar flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#7fb7a8] bg-[#163430] text-4xl font-bold text-[#e6e2d8]">
              {profile.name[0]}
            </div>
          )}

          {isCurrentUser && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Profielfoto wijzigen"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#7fb7a8] bg-[#0a1621] text-[#7fb7a8] shadow-lg shadow-black/30"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isCurrentUser && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        )}

        <h1>{profile.name}, {profile.age}</h1>
        <p><MapPin />{profile.suburb}</p>
        <span className="verified"><ShieldCheck />Verified member</span>
      </div>

      <div className="stats-grid">
        <div><strong>{profileMeetups}</strong><span>Confirmed meetups</span></div>
        <div><strong>{profile.stats.hosted}</strong><span>Hosted</span></div>
        <div><strong>{profile.stats.sports}</strong><span>Sports</span></div>
      </div>

      <div className="chart-block">
        <div className="section-heading compact">
          <h2>Meetups</h2>
          <span>Last 6 months</span>
        </div>

        <div className="lollipop-chart">
          {chartData.map((month) => (
            <div key={month.label} className={`lollipop-column ${month.isCurrent ? 'current' : ''}`}>
              {month.value > 0 && <span className="chart-value">{month.value}</span>}
              <div className="chart-stem" />
              <span className={`chart-dot ${month.value > 0 ? 'filled' : ''}`} />
              <small>{month.label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="section-heading compact">
        <h2>{isCurrentUser ? 'Your sports' : 'Sports'}</h2>
        {isCurrentUser && <span>Edit</span>}
      </div>

      <div className="sport-list">
        {profile.sports.map((sport) => (
          <p key={sport.name}>
            <span className="sport-name">{sport.name}</span>
            <span className="sport-level">{sport.level}</span>
          </p>
        ))}
      </div>

      <div className="section-heading compact">
        <h2>Patches</h2>
        <span>{patchList.filter((patch) => patch.earned).length} of {patchList.length}</span>
      </div>

      <div className="patch-grid">
        {patchList.map((patch) => {
          const Icon = patchIcons[patch.id as keyof typeof patchIcons] ?? ShieldCheck
          const selected = selectedPatchId === patch.id
          const earned = patch.earned

          return (
            <div key={patch.id} className="patch-cell">
              <button
                type="button"
                className={`patch-item ${selected ? 'selected' : ''} ${earned ? 'earned' : 'locked'}`}
                onClick={() => setSelectedPatchId((current) => (current === patch.id ? null : patch.id))}
                aria-label={`View patch: ${patch.label}`}
              >
                <Icon />
                <span>{patch.label}</span>
              </button>

              {selected && (
                <div className="patch-tooltip" role="dialog" aria-live="polite">
                  <strong>{patch.label}</strong>
                  <p>{patch.reason}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="section-heading compact">
        <h2>Friends</h2>
        <span>{friends.length}</span>
      </div>

      <div className="friends-list">
        {friends.map((friend) => (
          <div
            key={friend.name}
            className="friend-row"
            onClick={() => navigate(`/profile/${encodeURIComponent(friend.name)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/profile/${encodeURIComponent(friend.name)}`)
              }
            }}
          >
            <div className="friend-meta">
              <div className="friend-avatar">{friend.name[0]}</div>
              <div>
                <strong>{friend.name}</strong>
                <span>{friend.sport}</span>
              </div>
            </div>

            <div className="friend-status">
              <span className={`presence ${friend.online ? 'online' : ''}`} />
              <div className="friend-menu-wrap" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="friend-menu-button"
                  aria-label={`Friend options for ${friend.name}`}
                  onClick={() => setOpenFriendMenu(openFriendMenu === friend.name ? null : friend.name)}
                >
                  <Settings2 className="h-4 w-4" />
                </button>

                {openFriendMenu === friend.name && (
                  <div className="friend-menu" role="menu">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFriendMenu(null)
                        navigate(`/create?invite=${encodeURIComponent(friend.name)}`)
                      }}
                    >
                      Invite for activity
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReportUser(friend.name)
                      }}
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBlockUser(friend.name)
                        setFriends((current) => current.filter((person) => person.name !== friend.name))
                      }}
                    >
                      Block
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFriends((current) => current.filter((person) => person.name !== friend.name))
                        setOpenFriendMenu(null)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCurrentUser && (
        <div className="mt-6 rounded-2xl border border-[#22384a] bg-[#132433] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#dfe5ea]">{copy.languageLabel}</span>
            <div className="flex gap-2 rounded-full border border-[#22384a] bg-[#0a1621] p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  setStoredLanguage('en')
                }}
                className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-[#163430] text-[#dff4ef]' : 'text-[#9fb3c2]'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('nl')
                  setStoredLanguage('nl')
                }}
                className={`rounded-full px-2 py-1 ${language === 'nl' ? 'bg-[#163430] text-[#dff4ef]' : 'text-[#9fb3c2]'}`}
              >
                NL
              </button>
            </div>
          </div>
        </div>
      )}

      {statusMessage ? (
        <p className="mt-4 rounded-xl border border-[#22384a] bg-[#132433] px-3 py-2 text-sm text-[#dfe5ea]">
          {statusMessage}
        </p>
      ) : null}

      {isCurrentUser && (
        <div className="profile-actions">
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 font-medium text-[#e6e2d8]"
          >
            <LogOut className="h-4 w-4" />
            {isUpdatingPhoto ? copy.updatingPhoto : copy.logOut}
          </button>
        </div>
      )}
    </div>
  )
}
