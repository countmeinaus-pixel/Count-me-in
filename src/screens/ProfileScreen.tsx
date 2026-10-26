import { MapPin, ShieldCheck, Users, Waves } from 'lucide-react'
import { currentUser } from '../data/mockData'

export function ProfileScreen() {
  return (
    <div className="screen">
      <header className="profile-header">
        <div className="profile-top" />
      </header>

      <div className="profile-identity">
        <div className="avatar hero-avatar">J<span><ShieldCheck /></span></div>
        <h1>{currentUser.name}, {currentUser.age}</h1>
        <p><MapPin />{currentUser.suburb}</p>
        <span className="verified"><ShieldCheck />Verified member</span>
      </div>

      <div className="stats-grid">
        <div><strong>7</strong><span>Meetups</span></div>
        <div><strong>2</strong><span>Hosted</span></div>
        <div><strong>5</strong><span>Sports</span></div>
      </div>

      <div className="section-heading compact">
        <h2>Your sports</h2>
        <span>Edit</span>
      </div>

      <div className="sport-list">
        {currentUser.sports.map((sport) => (
          <p key={sport.name}>
            <span className="sport-name">{sport.name}</span>
            <span className="sport-level">{sport.level}</span>
          </p>
        ))}
      </div>

      <div className="section-heading compact">
        <h2>Patches</h2>
        <span>3 of 8</span>
      </div>

      <div className="patch-grid">
        <div><ShieldCheck /><span>First meetup</span></div>
        <div><Users /><span>Regular</span></div>
        <div><Waves /><span>Salt water</span></div>
      </div>
    </div>
  )
}
