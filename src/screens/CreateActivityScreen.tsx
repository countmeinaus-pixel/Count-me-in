import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { currentUser } from '../data/mockData'

const allAppUsers = [
  currentUser.name,
  'Matt',
  'Hamish',
  'Sam',
  'Luca',
  'Ben',
  'Tom',
  'Raj',
  'Jules',
  'Theo',
  'Leo',
]

export function CreateActivityScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invitedFriends = useMemo(() => searchParams.getAll('invite').map((name) => decodeURIComponent(name)), [searchParams])
  const [selectedPeople, setSelectedPeople] = useState<string[]>(invitedFriends)
  const [searchTerm, setSearchTerm] = useState('')
  const [title, setTitle] = useState('Saturday coastal run')
  const [when, setWhen] = useState('Sat 22 Feb')
  const [location, setLocation] = useState('Port Noarlunga')

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return allAppUsers.filter(
      (person) => person !== currentUser.name && !selectedPeople.includes(person) && (!query || person.toLowerCase().includes(query)),
    )
  }, [searchTerm, selectedPeople])

  function togglePerson(person: string) {
    setSelectedPeople((current) => {
      if (current.includes(person)) {
        return current.filter((item) => item !== person)
      }
      return [...current, person]
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate('/')
  }

  return (
    <div className="screen">
      <header className="page-title">
        <p className="eyebrow">Start a callout</p>
        <h1>Create activity</h1>
      </header>

      <div className="progress-row" aria-label="Progress">
        <span className="done" />
        <span className="done" />
        <span />
        <span />
        <span />
      </div>

      <div className="invite-panel">
        <div className="invite-header">
          <span>Add people</span>
          <small>{selectedPeople.length} invited</small>
        </div>

        <input
          className="invite-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search all users in the app"
          aria-label="Search users to add"
        />

        <div className="invite-user-grid">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((person) => (
              <button key={person} type="button" className="invite-user" onClick={() => togglePerson(person)}>
                <span className="invite-avatar">{person.charAt(0)}</span>
                <span>{person}</span>
              </button>
            ))
          ) : (
            <p className="invite-empty">No matching users found.</p>
          )}
        </div>
      </div>

      {selectedPeople.length > 0 && (
        <div className="invited-friends">
          <span>Invited people</span>
          <div className="invited-list">
            {selectedPeople.map((friend) => (
              <button key={friend} type="button" className="invited-pill" onClick={() => togglePerson(friend)} aria-label={`Remove ${friend}`}>
                {friend}
                <span>×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="create-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>What are you up to?</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span>When</span>
          <input value={when} onChange={(event) => setWhen(event.target.value)} />
        </label>

        <label className="field">
          <span>Meet point</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>

        <div className="choice-block">
          <span>Level wanted</span>
          <div className="choice-list">
            {['Beginner friendly', 'Intermediate', 'Experienced'].map((level) => (
              <button key={level} type="button" className={level === 'Intermediate' ? 'selected' : ''}>{level}</button>
            ))}
          </div>
        </div>

        <div className="toggle-row">
          <span>
            <strong>Auto-accept</strong>
            <small>Accept requests without checking</small>
          </span>
          <input type="checkbox" defaultChecked />
        </div>

        <div className="form-actions">
          <Button type="submit" size="lg">Post activity</Button>
        </div>
      </form>
    </div>
  )
}
