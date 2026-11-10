import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

// Shared layout for the welcome slides and onboarding steps: back button,
// progress bar, optional Skip, a big title and one main button at the bottom.
type Props = {
  progress: number // 0 to 1
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  onBack?: () => void
  onSkip?: () => void
  skipLabel?: string
  primaryLabel: string
  onPrimary: () => void
  primaryDisabled?: boolean
  footerNote?: ReactNode
  align?: 'center' | 'start'
}

export function FlowLayout({
  progress,
  title,
  subtitle,
  children,
  onBack,
  onSkip,
  skipLabel = 'Skip',
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  footerNote,
  align = 'center',
}: Props) {
  return (
    <main className={`flow-screen flow-align-${align}`}>
      <div className="flow-topbar">
        {onBack ? (
          <button type="button" className="flow-back" onClick={onBack} aria-label="Back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : (
          <span className="flow-back-placeholder" aria-hidden="true" />
        )}
        <div
          className="flow-progress"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ width: `${Math.max(4, Math.min(100, progress * 100))}%` }} />
        </div>
        {onSkip ? (
          <button type="button" className="flow-skip" onClick={onSkip}>{skipLabel}</button>
        ) : (
          <span className="flow-skip-placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="flow-body">
        <h1 className="flow-title">{title}</h1>
        {subtitle && <p className="flow-subtitle">{subtitle}</p>}
        <div className="flow-content">{children}</div>
      </div>

      <div className="flow-footer">
        {footerNote}
        <button
          type="button"
          className="button button-primary button-lg flow-primary"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
      </div>
    </main>
  )
}
