import { X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PatchIcon } from './PatchIcon'

export type TourStep = {
  target: string // value of a data-tour attribute on the page
  title: string
  body: string
  path?: string // page the tip lives on; the tour opens it first
  example?: { label: string; lines: string[] }
  patches?: Array<{ icon: string; name: string }> // example collected patches
}

type Rect = { top: number; left: number; width: number; height: number }

// How long to wait for a page to show the part a tip points at.
const targetTimeoutMs = 4000

// Walks through the app with tips that point at real parts of the screen,
// opening the right page for each tip. Tips whose target never shows are skipped.
export function AppTour({ steps, onClose }: { steps: TourStep[]; onClose: (finished: boolean) => void }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const step = steps[index]

  const measure = useCallback(() => {
    const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!element) {
      setRect(null)
      return
    }
    const box = element.getBoundingClientRect()
    const padding = 6
    // Tall sections: highlight the top part so the tip still fits on screen.
    const height = Math.min(box.height, window.innerHeight * 0.4)
    setRect({
      top: box.top - padding,
      left: box.left - padding,
      width: box.width + padding * 2,
      height: height + padding * 2,
    })
  }, [step.target])

  const goTo = useCallback((nextIndex: number) => {
    if (nextIndex >= steps.length) {
      onClose(true)
      return
    }
    setDirection(nextIndex < index ? -1 : 1)
    setRect(null)
    setIndex(Math.max(0, nextIndex))
  }, [index, onClose, steps.length])

  // Open the tip's page, wait for it to render the target, then scroll it into view.
  // A page that redirects (for example to sign in) never shows the target, so the tip is skipped.
  useLayoutEffect(() => {
    if (step.path && window.location.pathname !== step.path) navigate(step.path)
    let frame = 0
    const startedAt = performance.now()
    const findTarget = () => {
      const onStepPage = !step.path || window.location.pathname === step.path
      const element = onStepPage ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
      if (!element) {
        if (performance.now() - startedAt < targetTimeoutMs) {
          frame = requestAnimationFrame(findTarget)
          return
        }
        // Nothing to point at: skip this tip in the direction we were going.
        const nextIndex = index + direction
        if (nextIndex < 0 || nextIndex >= steps.length) onClose(nextIndex >= steps.length)
        else setIndex(nextIndex)
        return
      }
      const box = element.getBoundingClientRect()
      const inView = box.top >= 80 && box.bottom <= window.innerHeight - 80
      if (!inView) {
        element.scrollIntoView({
          block: box.height > window.innerHeight * 0.4 ? 'start' : 'center',
          behavior: 'instant' as ScrollBehavior,
        })
        if (box.height > window.innerHeight * 0.4) window.scrollBy(0, -96)
      }
      measure()
    }
    findTarget()
    return () => cancelAnimationFrame(frame)
  }, [direction, index, measure, navigate, onClose, step.path, step.target, steps.length])

  useEffect(() => {
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  useEffect(() => {
    cardRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose])

  if (!rect) return <div className="tour-blocker" aria-hidden="true" />

  // Card below the highlighted part, or above it when that is in the lower half.
  const placeAbove = rect.top + rect.height / 2 > window.innerHeight / 2
  const cardStyle = placeAbove
    ? { bottom: Math.max(16, window.innerHeight - rect.top + 12) }
    : { top: Math.min(window.innerHeight - (step.example || step.patches ? 360 : 220), rect.top + rect.height + 12) }
  const isLast = index === steps.length - 1

  return (
    <>
      <div className="tour-blocker" aria-hidden="true" />
      <div className="tour-highlight" style={rect} aria-hidden="true" />
      <div
        ref={cardRef}
        className="tour-card"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        <button type="button" className="tour-card-close" onClick={() => onClose(false)} aria-label="Close the tour">
          <X aria-hidden="true" />
        </button>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
        {step.patches && (
          <div className="tour-patches">
            {step.patches.map((patch) => (
              <span key={patch.name} className="earned-patch-card">
                <PatchIcon name={patch.icon} />
                <span>{patch.name}</span>
              </span>
            ))}
          </div>
        )}
        {step.example && (
          <div className="tour-example">
            <span>{step.example.label}</span>
            {step.example.lines.map((line) => <p key={line}>{line}</p>)}
          </div>
        )}
        <div className="tour-card-footer">
          <span>{index + 1} of {steps.length}</span>
          <div className="tour-card-buttons">
            {index > 0 && (
              <button type="button" className="tour-card-back" onClick={() => goTo(index - 1)}>
                Back
              </button>
            )}
            <button type="button" className="tour-card-next" onClick={() => goTo(index + 1)}>
              {isLast ? 'Got it' : 'Next tip'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
