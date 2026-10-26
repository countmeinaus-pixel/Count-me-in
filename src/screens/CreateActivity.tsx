import { useMemo, useState } from 'react'
import { Check, Fish, Footprints, Mountain, Plus, Waves, Wind, Dumbbell, Bike, Anchor } from 'lucide-react'
import { ActivityCard, type Activity } from '../components/ActivityCard'
import { Button } from '../components/Button'

const sportOptions = [
  ['Spearfishing', Fish], ['Hiking', Mountain], ['Running', Footprints], ['Kitesurfing', Wind],
  ['Surfing', Waves], ['Swimming', Waves], ['Gym', Dumbbell], ['Mountain biking', Bike],
  ['Road cycling', Bike], ['Scuba diving', Anchor], ['Open activity', Plus],
] as const

const sportFields: Record<string, string[]> = {
  Spearfishing: ['Spot', 'Depth', 'Water entry (Shore dive or Boat dive)', 'Duration'],
  Hiking: ['Trail or destination', 'Distance', 'Elevation', 'Estimated duration'],
  Running: ['Distance', 'Pace', 'Terrain'],
  Kitesurfing: ['Spot', 'Discipline', 'Duration'],
  Surfing: ['Spot', 'Board', 'Duration'],
  Swimming: ['Location', 'Distance', 'Pace'],
  Gym: ['Gym name', 'Focus', 'Duration'],
  'Mountain biking': ['Trail park', 'Distance', 'Trail grade'],
  'Road cycling': ['Route', 'Distance', 'Average speed'],
  'Scuba diving': ['Dive site', 'Max depth', 'Certification needed'],
  'Open activity': ['Activity name', 'Description'],
}

type Draft = {
  sport: string; title: string; details: Record<string, string>; date: string; time: string
  meeting: string; suburb: string; group: string; spots: number; level: string
  autoAccept: boolean; notes: string
}

const blank: Draft = {
  sport: '', title: '', details: {}, date: '', time: '', meeting: '', suburb: '',
  group: '1 buddy', spots: 4, level: 'Any', autoAccept: false, notes: '',
}

export function CreateActivity({ onPost, onHome }: { onPost: (activity: Activity) => void; onHome: () => void }) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState(blank)
  const [posted, setPosted] = useState<Activity | null>(null)
  const fields = sportFields[draft.sport] || []
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((old) => ({ ...old, [key]: value }))
  const setDetail = (key: string, value: string) => setDraft((old) => ({ ...old, details: { ...old.details, [key]: value } }))

  const preview = useMemo<Activity>(() => {
    const detailValues = Object.values(draft.details).filter(Boolean).slice(0, 3)
    const activityName = draft.details['Activity name']
    const location = draft.details.Spot || draft.details['Trail or destination'] || draft.details.Location || draft.suburb
    return {
      id: Date.now(), sport: draft.sport, title: activityName || draft.title || `${draft.sport} at ${location}`,
      date: draft.date && draft.time ? `${new Date(`${draft.date}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · ${draft.time}` : 'Date and time',
      facts: detailValues.join(' · '), place: `${draft.meeting}, ${draft.suburb}`, host: 'Jai',
      spots: draft.group === '1 buddy' ? '1 buddy wanted' : `1 of ${draft.spots} spots`,
      level: draft.level, icon: draft.sport === 'Hiking' ? 'mountain' : draft.sport === 'Running' ? 'run' : 'fish',
    }
  }, [draft])

  const valid = step === 1 ? !!draft.sport
    : step === 2 ? (draft.sport === 'Open activity' ? !!draft.details['Activity name'] : !!draft.title)
    : step === 3 ? !!draft.date && !!draft.time && !!draft.meeting && !!draft.suburb
    : true

  const next = () => {
    if (!valid) return
    if (step === 5) { onPost(preview); setPosted(preview); setStep(6) }
    else setStep((value) => value + 1)
  }

  if (step === 6 && posted) return (
    <div className="screen posted-screen">
      <div className="posted-mark"><Check /></div><p className="eyebrow">Posted</p>
      <h1>Your callout is live.</h1><p className="support">We’ll let you know when someone wants to join.</p>
      <ActivityCard activity={posted} onClick={() => {}} />
      <Button onClick={onHome}>Back to home</Button>
      <button className="text-action" onClick={() => { setDraft(blank); setStep(1); setPosted(null) }}>Create another</button>
    </div>
  )

  return (
    <div className="screen create-flow">
      <header className="page-title"><p className="eyebrow">Step {step} of 5</p><h1>{['', 'What are you up to?', 'The details', 'When and where?', 'Who are you after?', 'Review'][step]}</h1></header>
      <div className="progress">{[1,2,3,4,5].map((item) => <span key={item} className={item <= step ? 'done' : ''} />)}</div>

      {step === 1 && <div className="sport-grid">{sportOptions.map(([name, Icon]) =>
        <button key={name} className={`sport-tile ${draft.sport === name ? 'chosen' : ''}`} onClick={() => setDraft({ ...blank, sport: name })}>
          {draft.sport === name && <i><Check /></i>}<Icon /><span>{name}</span>
        </button>)}</div>}

      {step === 2 && <div className="form-stack">
        {draft.sport !== 'Open activity' && <Field label="Title" value={draft.title} placeholder={`${draft.sport} with mates`} onChange={(value) => set('title', value)} />}
        {fields.map((field) => <Field key={field} label={field} value={draft.details[field] || ''} onChange={(value) => setDetail(field, value)} />)}
      </div>}

      {step === 3 && <div className="form-stack">
        <Field label="Date" type="date" value={draft.date} onChange={(value) => set('date', value)} />
        <Field label="Start time" type="time" value={draft.time} onChange={(value) => set('time', value)} />
        <Field label="Meeting point" value={draft.meeting} placeholder="Car park by the jetty" onChange={(value) => set('meeting', value)} />
        <Field label="Suburb" value={draft.suburb} placeholder="Port Noarlunga" onChange={(value) => set('suburb', value)} />
      </div>}

      {step === 4 && <div className="form-stack">
        <Choice label="Group size" options={['1 buddy', 'Small group']} value={draft.group} onChange={(value) => set('group', value)} />
        {draft.group === 'Small group' && <div className="stepper"><span>Maximum spots</span><button onClick={() => set('spots', Math.max(2, draft.spots - 1))}>−</button><strong>{draft.spots}</strong><button onClick={() => set('spots', Math.min(8, draft.spots + 1))}>+</button></div>}
        <Choice label="Level wanted" options={['Any', 'Beginner friendly', 'Intermediate', 'Experienced']} value={draft.level} onChange={(value) => set('level', value)} />
        <label className="toggle-row"><span><strong>Auto-accept</strong><small>Let mates join straight away</small></span><input type="checkbox" checked={draft.autoAccept} onChange={(event) => set('autoAccept', event.target.checked)} /></label>
        <Field label="Notes (optional)" value={draft.notes} placeholder="Anything useful for the group" onChange={(value) => set('notes', value)} />
      </div>}

      {step === 5 && <div className="review">
        <p className="support">This is how your callout will appear.</p><ActivityCard activity={preview} onClick={() => {}} />
        <Review label="Activity" value={preview.title} onEdit={() => setStep(2)} />
        <Review label="When" value={preview.date} onEdit={() => setStep(3)} />
        <Review label="Meeting point" value={preview.place} onEdit={() => setStep(3)} />
        <Review label="Group" value={`${preview.spots} · ${draft.level}`} onEdit={() => setStep(4)} />
      </div>}

      <div className="flow-actions">{step > 1 && <button className="secondary-action" onClick={() => setStep((value) => value - 1)}>Back</button>}<Button disabled={!valid} onClick={next}>{step === 5 ? 'Post activity' : 'Continue'}</Button></div>
      {!valid && step > 1 && <p className="validation">Fill in all required fields to continue.</p>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}
function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="choice"><span>{label}</span><div>{options.map((option) => <button key={option} className={value === option ? 'selected' : ''} onClick={() => onChange(option)}>{value === option && <Check />}{option}</button>)}</div></div>
}
function Review({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="review-row"><div><span>{label}</span><strong>{value}</strong></div><button onClick={onEdit}>Edit</button></div>
}
