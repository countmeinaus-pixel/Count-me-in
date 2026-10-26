import { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Fish,
  Footprints,
  MapPin,
  MessageCircle,
  Mountain,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  User,
  Users,
  Waves,
} from 'lucide-react'
import { ActivityCard, type Activity } from './components/ActivityCard'
import { BottomNav, type Tab } from './components/BottomNav'
import { Button } from './components/Button'
import { CreateActivity } from './screens/CreateActivity'

const hero =
  'https://images.unsplash.com/photo-1516691195066-3f22714f08fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1080'

const initialActivities: Activity[] = [
  {
    id: 1,
    sport: 'Spearfishing',
    title: 'Spearfishing at Port Noarlunga reef',
    date: 'Sat 22 Feb · 7:00 am',
    facts: '5 to 10 m · Shore dive · 2 hrs',
    place: 'Port Noarlunga jetty car park',
    host: 'Matt',
    spots: '2 of 4 spots',
    level: 'Intermediate',
    icon: 'fish',
  },
  {
    id: 2,
    sport: 'Hiking',
    title: 'Waterfall Gully to Mount Lofty',
    date: 'Sun 23 Feb · 8:30 am',
    facts: '8 km · Steep · 3 hrs',
    place: 'Waterfall Gully car park',
    host: 'Hamish',
    spots: '3 of 6 spots',
    level: 'Beginner friendly',
    icon: 'mountain',
  },
  {
    id: 3,
    sport: 'Running',
    title: 'Onkaparinga River trail run',
    date: 'Tue 25 Feb · 6:15 am',
    facts: '12 km · Steady pace · Trail',
    place: 'Old Noarlunga footbridge',
    host: 'Sam',
    spots: '1 of 3 spots',
    level: 'Intermediate',
    icon: 'run',
  },
]

const filters = ['My sports', 'Spearfishing', 'Hiking', 'Running', 'Kitesurfing']

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [filter, setFilter] = useState('My sports')
  const [selected, setSelected] = useState<Activity | null>(null)
  const [joined, setJoined] = useState(false)

  const visible = filter === 'My sports' ? activities : activities.filter((item) => item.sport === filter)

  if (selected) {
    return (
      <main className="app-shell">
        <section className="detail-hero">
          <img src={hero} alt="Rocky South Australian coastline at first light" />
          <div className="hero-scrim" />
          <button className="icon-button hero-back" aria-label="Back" onClick={() => setSelected(null)}>
            <ArrowLeft />
          </button>
          <button className="icon-button hero-share" aria-label="Share">
            <Share2 />
          </button>
        </section>
        <section className="detail-content">
          <p className="eyebrow">{selected.sport}</p>
          <h1>{selected.title}</h1>
          <p className="date">{selected.date}</p>
          <div className="facts-grid">
            <div><span>Depth</span><strong>5 to 10 m</strong></div>
            <div><span>Entry</span><strong>Shore dive</strong></div>
            <div><span>Duration</span><strong>2 hours</strong></div>
            <div><span>Spots</span><strong>2 of 4</strong></div>
          </div>
          <div className="meeting-row">
            <MapPin />
            <div><strong>Port Noarlunga jetty car park</strong><span>Port Noarlunga</span></div>
            <ChevronRight />
          </div>
          <div className="host-card">
            <div className="avatar large">M<span><Check /></span></div>
            <div className="grow"><p className="eyebrow">Hosted by</p><strong>Matt, 34</strong><span>12 confirmed meetups</span></div>
            <ChevronRight />
          </div>
          <div className="section-heading"><h2>Who’s going</h2><span>2 spots left</span></div>
          <div className="going"><div className="avatar">M</div><div className="avatar">L</div><div className="avatar empty"><Plus /></div></div>
          <div className="notes"><h2>From Matt</h2><p>Viz is looking decent. Meet by the southern end of the car park and we’ll walk down together.</p></div>
        </section>
        <div className="sticky-action">
          <Button onClick={() => setJoined(true)}>{joined ? 'Open chat' : 'Count me in'}</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      {tab === 'home' && (
        <div className="screen">
          <header className="topbar">
            <div className="location"><MapPin />Adelaide</div>
            <button className="icon-button" aria-label="Notifications"><Bell /></button>
          </header>
          <section className="intro">
            <p className="eyebrow">Good morning</p>
            <h1>Ready to get out there, Jai?</h1>
          </section>
          <div className="filters">
            {filters.map((item) => (
              <button key={item} className={`chip ${filter === item ? 'selected' : ''}`} onClick={() => setFilter(item)}>
                {filter === item && <Check />}{item}
              </button>
            ))}
          </div>
          <div className="section-heading"><h2>This week</h2><span>{visible.length} callouts</span></div>
          <div className="card-list">
            {visible.map((item) => <ActivityCard key={item.id} activity={item} onClick={() => setSelected(item)} />)}
          </div>
          {visible.length === 0 && <div className="empty-state"><Search /><h2>Nothing on for this sport yet</h2><p>Be the first. Post a callout.</p><Button onClick={() => setTab('create')}>Create activity</Button></div>}
        </div>
      )}

      {tab === 'activities' && (
        <div className="screen">
          <header className="page-title"><p className="eyebrow">Your plans</p><h1>My activities</h1></header>
          <div className="segment"><button className="active">Upcoming</button><button>Past</button></div>
          <div className="status-line"><span>Going</span><p>Next up on Saturday</p></div>
          <ActivityCard activity={activities[0]} onClick={() => setSelected(activities[0])} />
          <div className="status-line"><span className="hosting">Hosting</span><p>2 join requests</p></div>
          <ActivityCard activity={activities.find((item) => item.host === 'Jai') || {...activities[1], title: 'Morialta Falls morning hike', host: 'Jai'}} onClick={() => setSelected(activities.find((item) => item.host === 'Jai') || activities[1])} />
        </div>
      )}

      {tab === 'create' && (
        <CreateActivity onPost={(activity) => setActivities((current) => [activity, ...current])} onHome={() => setTab('home')} />
      )}

      {tab === 'chats' && (
        <div className="screen">
          <header className="page-title"><p className="eyebrow">Your crew</p><h1>Chats</h1></header>
          <div className="chat-row"><div className="sport-icon"><Fish /></div><div className="grow"><strong>Port Noarlunga spearfishing</strong><p>Matt: Viz looked decent yesterday</p></div><div className="chat-meta"><span>9:42</span><i /></div></div>
          <div className="chat-row"><div className="sport-icon"><Mountain /></div><div className="grow"><strong>Mount Lofty hike</strong><p>Hamish: See you by the kiosk</p></div><div className="chat-meta"><span>Tue</span></div></div>
          <div className="chat-preview">
            <p>Messages open once your join request is accepted.</p>
            <div className="message-input"><span>Message the group</span><Send /></div>
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="screen">
          <header className="profile-top"><button className="icon-button"><Settings /></button></header>
          <div className="profile-identity"><div className="avatar hero-avatar">J<span><Check /></span></div><h1>Jai, 37</h1><p><MapPin />Port Noarlunga</p><span className="verified"><ShieldCheck />Verified member</span></div>
          <div className="stats"><div><strong>7</strong><span>Meetups</span></div><div><strong>2</strong><span>Hosted</span></div><div><strong>5</strong><span>Sports</span></div></div>
          <div className="section-heading"><h2>Your sports</h2><span>Edit</span></div>
          <div className="sport-list"><p><Fish />Spearfishing <span>Intermediate</span></p><p><Mountain />Hiking <span>Intermediate</span></p><p><Footprints />Running <span>Intermediate</span></p></div>
          <div className="section-heading"><h2>Patches</h2><span>3 of 8</span></div>
          <div className="patches"><div><ShieldCheck /><span>First meetup</span></div><div><Users /><span>Regular</span></div><div><Waves /><span>Salt water</span></div></div>
        </div>
      )}
      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
