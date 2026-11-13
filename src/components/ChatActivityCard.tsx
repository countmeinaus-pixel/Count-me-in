import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activities } from '../data/mockData'
import { getFeedActivity } from '../lib/activityParticipation'
import { parseActivityLink } from '../lib/activityLinks'
import type { ActivityCardData } from './ActivityCard'
import { ActivityPreviewCard } from './ActivityPreviewCard'

// An activity shared in a chat: the same card as on the Home map. Tap to open it.
export function ChatActivityCard({ activityId }: { activityId: string }) {
  const navigate = useNavigate()
  const [card, setCard] = useState<ActivityCardData | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let active = true
    const demo = activities.find((item) => String(item.id) === activityId)
    if (demo) {
      setCard(demo)
      setState('ready')
      return
    }
    getFeedActivity(activityId)
      .then((saved) => {
        if (!active) return
        if (!saved) { setState('missing'); return }
        setCard(saved)
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
    <span className="chat-activity-card">
      <ActivityPreviewCard activity={card} onOpen={() => navigate(`/activity/${card.id}`)} />
    </span>
  )
}

// Message text with a shared activity shown as a card instead of the link.
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
