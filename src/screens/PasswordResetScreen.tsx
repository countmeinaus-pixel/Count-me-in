import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredLanguage, getTranslations, setStoredLanguage, type Language } from '../lib/i18n'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

export function PasswordResetScreen() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(Boolean(supabase))
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const copy = getTranslations(language)

  useEffect(() => {
    if (!supabase) {
      setIsCheckingRecovery(false)
      return
    }

    let isActive = true
    let receivedRecoverySession = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        receivedRecoverySession = true
        setHasRecoverySession(true)
        setIsCheckingRecovery(false)
      }
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return
      setHasRecoverySession(Boolean(data.session) || receivedRecoverySession)
      setIsCheckingRecovery(false)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage)
    setStoredLanguage(nextLanguage)
  }

  async function handleUpdatePassword() {
    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }

    if (!hasRecoverySession) {
      setError(copy.resetLinkInvalid)
      return
    }

    if (password.length < 6) {
      setError(copy.passwordTooShort)
      return
    }

    if (password !== confirmPassword) {
      setError(copy.passwordsDoNotMatch)
      return
    }

    setIsBusy(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setIsBusy(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setIsComplete(true)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-5 py-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--seafoam-subtle)] text-[var(--seafoam)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--seafoam)]">Count Me In</p>
              <h1 className="text-2xl font-bold text-white">{copy.resetPasswordTitle}</h1>
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

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[var(--seafoam-subtle)] px-3 py-2 text-sm text-[var(--seafoam)]">
            <LockKeyhole className="h-4 w-4 text-[var(--seafoam)]" />
            <span>{copy.resetPasswordSubtitle}</span>
          </div>

          {isCheckingRecovery ? (
            <p role="status" className="text-sm text-[#9fb3c2]">{copy.checking}</p>
          ) : isComplete ? (
            <div>
              <p role="status" className="rounded-xl border border-[var(--seafoam)]/30 bg-[var(--seafoam-subtle)] px-3 py-2 text-sm text-[var(--seafoam)]">
                {copy.passwordUpdated}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)]"
              >
                {copy.backToSignIn}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : hasRecoverySession ? (
            <>
              <label htmlFor="new-password" className="mb-2 block text-sm text-[var(--text-primary)]">{copy.newPasswordLabel}</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.newPasswordPlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--seafoam)]"
              />

              <label htmlFor="confirm-password" className="mb-2 mt-5 block text-sm text-[var(--text-primary)]">{copy.confirmPasswordLabel}</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={copy.confirmPasswordPlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--seafoam)]"
              />

              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isBusy}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {isBusy ? copy.updatingPassword : copy.updatePassword}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div>
              <p className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-subtle)] px-3 py-2 text-sm text-[var(--danger)]">
                {copy.resetLinkInvalid}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-5 min-h-11 text-sm font-medium text-[var(--seafoam)] underline-offset-4 hover:underline"
              >
                {copy.backToSignIn}
              </button>
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-subtle)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}