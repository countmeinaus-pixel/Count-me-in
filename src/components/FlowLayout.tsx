import { ArrowLeft } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

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
  // Fit the screen without scrolling: extra examples marked data-optional are
  // hidden, group by group, until the content fits above the button. Groups go
  // in data-optional-drop order (1 first), otherwise last group first.
  fitViewport?: boolean
}

function fitOptionalContent(body: HTMLElement) {
  const optional = [...body.querySelectorAll<HTMLElement>('[data-optional]')]
  optional.forEach((element) => { element.hidden = false })
  const dropOrder = (group: string, index: number) => {
    const element = optional.find((item) => item.dataset.optional === group)
    return Number(element?.dataset.optionalDrop ?? 1000 - index)
  }
  const groups = [...new Set(optional.map((element) => element.dataset.optional ?? ''))]
    .map((group, index) => ({ group, order: dropOrder(group, index) }))
    .sort((a, b) => a.order - b.order)
    .map(({ group }) => group)
  while (body.scrollHeight > body.clientHeight && groups.length > 0) {
    const group = groups.shift()
    optional
      .filter((element) => element.dataset.optional === group)
      .forEach((element) => { element.hidden = true })
  }
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
  fitViewport = false,
}: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!fitViewport || !body) return
    const fit = () => fitOptionalContent(body)
    fit()
    // Web fonts can change the text height after the first render.
    void document.fonts?.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fitViewport, children])

  return (
    <main className={`flow-screen flow-align-${align}${fitViewport ? ' flow-fit' : ''}`}>
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

      <div className="flow-body" ref={bodyRef}>
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
