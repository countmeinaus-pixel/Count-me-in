import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabaseSetupHint, supabase } from '../lib/supabase'

export function AuthScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function handleSendCode() {
    if (!email.trim()) {
      setError('Voer je e-mailadres in om een code te ontvangen.')
      return
    }

    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }

    setIsBusy(true)
    setError('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })

    setIsBusy(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setStage('code')
  }

  async function handleVerifyCode() {
    if (!supabase) {
      setError(getSupabaseSetupHint())
      return
    }

    if (!code.trim() || code.trim().length < 6) {
      setError('Voer de 6-cijferige code in.')
      return
    }

    setIsBusy(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })

    setIsBusy(false)

    if (verifyError) {
      setError(verifyError.message)
      return
    }

    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#0a1621] px-5 py-8 text-[#e6e2d8]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163430] text-[#7fb7a8]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7fb7a8]">Count Me In</p>
            <h1 className="text-2xl font-bold text-white">Welkom mate</h1>
          </div>
        </div>

        <div className="rounded-3xl border border-[#22384a] bg-[#132433] p-5 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[#163430] px-3 py-2 text-sm text-[#dff4ef]">
            <Mail className="h-4 w-4 text-[#7fb7a8]" />
            <span>Inloggen via eenmalige e-mailcode</span>
          </div>

          {stage === 'email' ? (
            <>
              <label className="mb-2 block text-sm text-[#dfe5ea]">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jij@voorbeeld.com"
                className="w-full rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-base outline-none ring-0 placeholder:text-[#6e8597] focus:border-[#7fb7a8]"
              />

              <button
                type="button"
                onClick={handleSendCode}
                disabled={isBusy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6b2c] px-4 py-3 font-semibold text-[#1a0d05] transition hover:bg-[#ff8250] disabled:opacity-60"
              >
                {isBusy ? 'Versturen...' : 'Verstuur code'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm text-[#dfe5ea]">6-cijferige code</label>
                <button
                  type="button"
                  className="text-sm text-[#7fb7a8] underline underline-offset-2"
                  onClick={() => setStage('email')}
                >
                  Ander e-mailadres
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-2xl border border-[#22384a] bg-[#0a1621] px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none placeholder:text-[#6e8597] focus:border-[#7fb7a8]"
              />

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={isBusy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7fb7a8] px-4 py-3 font-semibold text-[#0a1621] transition hover:opacity-95 disabled:opacity-60"
              >
                {isBusy ? 'Controleren...' : 'Inloggen'}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </>
          )}

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
