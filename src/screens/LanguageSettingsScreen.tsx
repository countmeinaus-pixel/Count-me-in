import { useState } from 'react'
import { MorePageHeader } from '../components/MorePageHeader'
import { getStoredLanguage, setStoredLanguage, type Language } from '../lib/i18n'
import { useBackToMore } from '../lib/moreNavigation'

export function LanguageSettingsScreen() {
  const backToMore = useBackToMore()
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [error, setError] = useState('')

  function chooseLanguage(nextLanguage: Language) {
    try {
      setStoredLanguage(nextLanguage)
      setLanguage(nextLanguage)
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your language.')
    }
  }

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Language" onBack={backToMore} />
      <p className="more-settings-intro">Choose the language you’d like to use.</p>
      <div className="more-choice-list" role="radiogroup" aria-label="App language">
        {(['en', 'nl'] as const).map((option) => (
          <button
            type="button"
            className="more-choice-row"
            role="radio"
            aria-checked={language === option}
            key={option}
            onClick={() => chooseLanguage(option)}
          >
            <span className="more-radio" aria-hidden="true" />
            <span>{option === 'en' ? 'English' : 'Nederlands'}</span>
            <small>{option.toUpperCase()}</small>
          </button>
        ))}
      </div>
      {error && <p className="more-status-message error" role="alert">{error}</p>}
    </main>
  )
}
