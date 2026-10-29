import { ArrowLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MateCard } from '../components/MateCard'
import { communityMembers } from '../data/mockData'

const sports = [...new Set(communityMembers.flatMap((member) => member.sports.map((sport) => sport.name)))].sort()
const suburbs = [...new Set(communityMembers.map((member) => member.suburb))].sort()

export function MatesScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedSuburb, setSelectedSuburb] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredMembers = communityMembers.filter((member) => {
    const matchesName = member.name.toLowerCase().includes(normalizedQuery)
    const matchesSport = !selectedSport || member.sports.some((sport) => sport.name === selectedSport)
    const matchesSuburb = !selectedSuburb || member.suburb === selectedSuburb
    return matchesName && matchesSport && matchesSuburb
  })

  return (
    <div className="screen mates-screen">
      <header className="mates-header">
        <button type="button" className="icon-button" aria-label="Back to home" onClick={() => navigate('/')}>
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Good people, good plans</p>
          <h1>Find your crew</h1>
        </div>
      </header>

      <label className="mate-search">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          aria-label="Search mates by name"
        />
      </label>

      <div className="mate-filters">
        <label>
          <span>Sport</span>
          <select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)} aria-label="Filter by sport">
            <option value="">All sports</option>
            {sports.map((sport) => <option value={sport} key={sport}>{sport}</option>)}
          </select>
        </label>
        <label>
          <span>Location</span>
          <select value={selectedSuburb} onChange={(event) => setSelectedSuburb(event.target.value)} aria-label="Filter by location">
            <option value="">All locations</option>
            {suburbs.map((suburb) => <option value={suburb} key={suburb}>{suburb}</option>)}
          </select>
        </label>
      </div>

      <div className="mates-results-heading">
        <h2>Mates around Adelaide</h2>
        <span>{filteredMembers.length} profiles</span>
      </div>

      {filteredMembers.length > 0 ? (
        <div className="mate-grid">
          {filteredMembers.map((member) => (
            <MateCard
              key={member.name}
              member={member}
              onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}
            />
          ))}
        </div>
      ) : (
        <div className="mate-empty-state">
          <h2>No mates found</h2>
          <p>Try another name, sport or location.</p>
          <button type="button" onClick={() => { setQuery(''); setSelectedSport(''); setSelectedSuburb('') }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}