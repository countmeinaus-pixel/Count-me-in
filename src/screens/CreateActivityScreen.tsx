import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'

export function CreateActivityScreen() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('Saturday coastal run')
  const [when, setWhen] = useState('Sat 22 Feb')
  const [location, setLocation] = useState('Port Noarlunga')

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
