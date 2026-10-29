import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activities } from '../data/mockData'
import { getStoredLanguage, getTranslations, setStoredLanguage, type Language } from '../lib/i18n'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

const featureSlides = {
  en: [
    { image: activities[1].hero, alt: 'Trail through the Adelaide Hills', title: 'Find your crew', body: 'Meet local mates who share your kind of adventure.' },
    { image: activities[0].hero, alt: 'Diver exploring the reef', title: 'Make a plan', body: 'Find a callout or post one of your own.' },
    { image: activities[2].hero, alt: 'Runner on an outdoor trail', title: 'Stay in the loop', body: 'Chat with the crew before you head out.' },
    { image: activities[3].hero, alt: 'Kitesurfing along the coast', title: 'Show up together', body: 'Meet in person and build your crew, one outing at a time.' },
  ],
  nl: [
    { image: activities[1].hero, alt: 'Pad door de Adelaide Hills', title: 'Vind je crew', body: 'Ontmoet locals die graag hetzelfde avontuur aangaan.' },
    { image: activities[0].hero, alt: 'Duiker op het rif', title: 'Maak een plan', body: 'Vind een activiteit of plaats er zelf een.' },
    { image: activities[2].hero, alt: 'Hardloper op een buitenpad', title: 'Blijf op de hoogte', body: 'Chat met de groep voordat je op pad gaat.' },
    { image: activities[3].hero, alt: 'Kitesurfen aan de kust', title: 'Ga samen op pad', body: 'Ontmoet elkaar en bouw aan je crew, activiteit voor activiteit.' },
  ],
} as const

export function AuthScreen() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const copy = getTranslations(language)
  const slides = featureSlides[language]

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % featureSlides.en.length)
    }, 6000)

    return () => window.clearInterval(intervalId)
  }, [])

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage)
    setStoredLanguage(nextLanguage)
  }

  async function handleContinue() {
    if (!email.trim()) {
      setError(copy.emailRequired)
      return
    }

    if (!password.trim()) {
      setError(copy.passwordRequired)
      return
    }

    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }

    setIsBusy(true)
    setError('')
    setNotice('')

    const normalizedEmail = email.trim()

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      })

      setIsBusy(false)

      if (signUpError) {
        const isExistingAccount = signUpError.message.toLowerCase().includes('user already registered')
        setError(isExistingAccount ? copy.accountExists : signUpError.message)
        return
      }

      if (data.session) {
        navigate('/onboarding')
      } else {
        setNotice(copy.signUpEmailSent)
      }
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    setIsBusy(false)

    if (signInError) {
      const isInvalidCredentials = signInError.status === 400 || signInError.message.toLowerCase().includes('invalid login credentials')
      setError(isInvalidCredentials ? copy.invalidLogin : signInError.message)
      return
    }

    navigate('/onboarding')
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setError(copy.emailRequired)
      setNotice('')
      return
    }

    if (!supabase) {
      setError(getSupabaseSetupHint())
      setNotice('')
      return
    }

    setIsBusy(true)
    setError('')
    setNotice('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setIsBusy(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setNotice(copy.resetEmailSent)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-5 py-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--seafoam-subtle)] text-[var(--seafoam)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--seafoam)]">Count Me In</p>
              <h1 className="text-2xl font-bold text-white">{copy.authTitle}</h1>
            </div>
          </div>
          <div className="flex gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] p-1 text-xs">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-[var(--seafoam-subtle)] text-[var(--seafoam)]' : 'text-[var(--text-secondary)]'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('nl')}
              className={`rounded-full px-2 py-1 ${language === 'nl' ? 'bg-[var(--seafoam-subtle)] text-[var(--seafoam)]' : 'text-[var(--text-secondary)]'}`}
            >
              NL
            </button>
          </div>
        </div>

        <section className="auth-carousel" aria-label="Count Me In features" aria-roledescription="carousel">
          {slides.map((slide, index) => (
            <img
              key={slide.title}
              src={slide.image}
              alt={index === activeSlide ? slide.alt : ''}
              aria-hidden={index !== activeSlide}
              className={`auth-carousel-image ${index === activeSlide ? 'active' : ''}`}
            />
          ))}
          <div className="auth-carousel-scrim" />
          <div className="auth-carousel-copy" aria-live="polite">
            <span>{String(activeSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
            <h2>{slides[activeSlide].title}</h2>
            <p>{slides[activeSlide].body}</p>
          </div>
          <div className="auth-carousel-indicators" aria-label="Choose a feature">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={index === activeSlide ? 'active' : ''}
                aria-label={`Show feature ${index + 1}: ${slide.title}`}
                aria-pressed={index === activeSlide}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        </section>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[var(--seafoam-subtle)] px-3 py-2 text-sm text-[var(--seafoam)]">
            <Mail className="h-4 w-4 text-[var(--seafoam)]" />
            <span>{isSignUp ? copy.createAccountSubtitle : copy.authSubtitle}</span>
          </div>

          <label className="mb-2 block text-sm text-[var(--text-primary)]">{copy.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base outline-none ring-0 placeholder:text-[var(--text-muted)] focus:border-[var(--seafoam)]"
          />

          <label className="mb-2 mt-5 block text-sm text-[var(--text-primary)]">{copy.passwordLabel}</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base outline-none ring-0 placeholder:text-[var(--text-muted)] focus:border-[var(--seafoam)]"
          />

          {!isSignUp && (
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isBusy}
              className="mt-3 min-h-11 text-sm font-medium text-[var(--seafoam)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              {isBusy ? copy.sendingResetLink : copy.forgotPassword}
            </button>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={isBusy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {isBusy ? (isSignUp ? copy.creatingAccount : copy.sending) : (isSignUp ? copy.createAccount : copy.signIn)}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            {isSignUp ? copy.haveAccount : copy.noAccount}{' '}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setIsSignUp((current) => !current)
                setError('')
                setNotice('')
              }}
              className="font-semibold text-[var(--seafoam)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              {isSignUp ? copy.signIn : copy.createAccount}
            </button>
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-subtle)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-4 rounded-xl border border-[var(--seafoam)]/30 bg-[var(--seafoam-subtle)] px-3 py-2 text-sm text-[var(--seafoam)]">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
