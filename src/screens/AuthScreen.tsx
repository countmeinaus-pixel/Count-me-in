import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_LANGUAGE, getStoredLanguage, getTranslations, setStoredLanguage, type Language } from '../lib/i18n'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

export function AuthScreen() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const copy = getTranslations(language)

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

    const normalizedEmail = email.trim()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    })

    if (signInError) {
      const isInvalidCredentials = signInError.status === 400 || signInError.message.toLowerCase().includes('invalid login credentials')

      if (isInvalidCredentials) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password,
        })

        setIsBusy(false)

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        navigate('/onboarding')
        return
      }

      setIsBusy(false)
      setError(signInError.message)
      return
    }

    setIsBusy(false)
    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#0a1621] px-5 py-8 text-[#e6e2d8]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163430] text-[#7fb7a8]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#7fb7a8]">Count Me In</p>
              <h1 className="text-2xl font-bold text-white">{copy.authTitle}</h1>
            </div>
          </div>
          <div className="flex gap-2 rounded-full border border-[#22384a] bg-[#0a1621] p-1 text-xs">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`rounded-full px-2 py-1 ${language === 'en' ? 'bg-[#163430] text-[#dff4ef]' : 'text-[#9fb3c2]'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('nl')}
              className={`rounded-full px-2 py-1 ${language === 'nl' ? 'bg-[#163430] text-[#dff4ef]' : 'text-[#9fb3c2]'}`}
            >
              NL
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-[#22384a] bg-[#132433] p-5 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[#163430] px-3 py-2 text-sm text-[#dff4ef]">
            <Mail className="h-4 w-4 text-[#7fb7a8]" />
            <span>{copy.authSubtitle}</span>
          </div>

          <label className="mb-2 block text-sm text-[#dfe5ea]">{copy.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            className="w-full rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base outline-none ring-0 placeholder:text-[#6e8597] focus:border-[#7fb7a8]"
          />

          <label className="mb-2 mt-5 block text-sm text-[#dfe5ea]">{copy.passwordLabel}</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            className="w-full rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base outline-none ring-0 placeholder:text-[#6e8597] focus:border-[#7fb7a8]"
          />

          <button
            type="button"
            onClick={handleContinue}
            disabled={isBusy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6b2c] px-4 py-3 font-semibold text-[#1a0d05] transition hover:bg-[#ff8250] disabled:opacity-60"
          >
            {isBusy ? copy.sending : copy.sendCode}
            <ArrowRight className="h-4 w-4" />
          </button>

          {error ? (
            <p className="mt-4 rounded-xl border border-[#f0645a]/40 bg-[#2f1413] px-3 py-2 text-sm text-[#ffc4c0]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
