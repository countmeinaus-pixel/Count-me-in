import { CalendarDays, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activities, formatActivityDate } from '../data/mockData'
import { getSavedActivity } from '../lib/activities'
import { parseActivityLink } from '../lib/activityLinks'

type CardData = { id: string; title: string; sport: string; startsAt: Date; suburb: string; hero: string }

// An activity shared in a chat: photo, sport, title, date and place. Tap to open it.
export function ChatActivityCard({ activityId }: { activityId: string }) {
  const navigate = useNavigate()
  const [card, setCard] = useState<CardData | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let active = true
    const demo = activities.find((item) => String(item.id) === activityId)
    if (demo) {
      setCard({ id: activityId, title: demo.title, sport: demo.sport, startsAt: demo.startsAt, suburb: demo.suburb, hero: demo.hero })
      setState('ready')
      return
    }
    getSavedActivity(activityId)
      .then((saved) => {
        if (!active) return
        if (!saved) { setState('missing'); return }
        setCard({ id: saved.id, title: saved.title, sport: saved.sport, startsAt: new Date(saved.startsAt), suburb: saved.suburb, hero: saved.hero })
        setState('ready')
      })
      .catch(() => { if (active) setState('missing') })
    return () => { active = false }
  }, [activityId])

  if (state === 'loading') return <span className="chat-activity-card is-loading" aria-label="Loading activity" />
  if (state === 'missing' || !card) {
    return <span className="chat-activity-card is-missing">This activity is no longer available.</span>
  }

  return (
    <button type="button" className="chat-activity-card" onClick={() => navigate(`/activity/${card.id}`)} aria-label={`Open activity ${card.title}`}>
      <img src={card.hero} alt="" loading="lazy" />
      <span className="chat-activity-card-body">
        <span className="eyebrow">{card.sport}</span>
        <strong>{card.title}</strong>
        <small><CalendarDays aria-hidden="true" />{formatActivityDate(card.startsAt, {}, card.suburb)}</small>
        <small><MapPin aria-hidden="true" />{card.suburb}</small>
        <span className="chat-activity-card-cta">View activity</span>
      </span>
    </button>
  )
}

// Message text with a shared activity shown as a card.
export function ChatMessageBody({ text }: { text: string }) {
  const link = parseActivityLink(text)
  if (!link) return <p>{text}</p>
  return (
    <>
      {link.rest && <p>{link.rest}</p>}
      <ChatActivityCard activityId={link.activityId} />
    </>
  )
}
