import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

// A panel that slides in from the right, over a dimmed page.
export function SidePanel({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    panelRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className="side-panel-scrim" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="side-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="side-panel-header">
          <h2 id="side-panel-title">{title}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="side-panel-body">{children}</div>
        {footer && <footer className="side-panel-footer">{footer}</footer>}
      </div>
    </div>
  )
}
