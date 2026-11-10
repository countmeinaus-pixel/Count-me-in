import { X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type TourStep = {
  target: string // value of a data-tour attribute on the page
  title: string
  body: string
}

type Rect = { top: number; left: number; width: number; height: number }

// Walks through the app with tips that point at real parts of the screen.
// Steps whose target is not on the page are skipped.
export function AppTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
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
    setRect({
      top: box.top - padding,
      left: box.left - padding,
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    })
  }, [step.target])

  useLayoutEffect(() => {
    const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!element) {
      // Nothing to point at: go to the next tip, or close at the end.
      if (index < steps.length - 1) setIndex(index + 1)
      else onClose()
      return
    }
    const box = element.getBoundingClientRect()
    const inView = box.top >= 80 && box.bottom <= window.innerHeight - 80
    if (!inView) element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    measure()
  }, [index, measure, onClose, step.target, steps.length])

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
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose])

  if (!rect) return null

  // Card below the highlighted part, or above it when that is in the lower half.
  const placeAbove = rect.top + rect.height / 2 > window.innerHeight / 2
  const cardStyle = placeAbove
    ? { bottom: Math.max(16, window.innerHeight - rect.top + 12) }
    : { top: Math.min(window.innerHeight - 220, rect.top + rect.height + 12) }
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
        <button type="button" className="tour-card-close" onClick={onClose} aria-label="Close the tour">
          <X aria-hidden="true" />
        </button>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
        <div className="tour-card-footer">
          <span>{index + 1} of {steps.length}</span>
          <button type="button" className="tour-card-next" onClick={() => (isLast ? onClose() : setIndex(index + 1))}>
            {isLast ? 'Got it' : 'Next tip'}
          </button>
        </div>
      </div>
    </>
  )
}
