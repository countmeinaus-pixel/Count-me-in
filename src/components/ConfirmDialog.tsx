import { type ReactNode, useEffect, useRef, useState } from 'react'

// A warning pop-up before something that cannot be undone (or is hard to undo).
// Optional text field, e.g. a reason that is sent along.
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  inputLabel,
  inputPlaceholder,
  onConfirm,
  onCancel,
}: {
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  onConfirm: (input: string) => Promise<void> | void
  onCancel: () => void
}) {
  const [input, setInput] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isBusy, onCancel])

  async function confirm() {
    setIsBusy(true)
    setError('')
    try {
      await onConfirm(input.trim())
    } catch (confirmError) {
      const message = typeof confirmError === 'object' && confirmError !== null && 'message' in confirmError
        ? String((confirmError as { message: unknown }).message)
        : ''
      setError(message || 'Something went wrong. Try again.')
      setIsBusy(false)
    }
  }

  return (
    <div className="report-dialog-backdrop" role="presentation" onClick={() => !isBusy && onCancel()}>
      <section className="report-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="confirm-dialog-title">{title}</h2>
        {children && <div className="confirm-dialog-body">{children}</div>}
        {inputLabel && (
          <label className="edit-field">
            <span>{inputLabel} <small>Optional · {input.length}/280</small></span>
            <input value={input} maxLength={280} placeholder={inputPlaceholder} onChange={(event) => setInput(event.target.value)} />
          </label>
        )}
        {error && <p className="edit-form-error" role="alert">{error}</p>}
        <div className="photo-crop-actions">
          <button ref={cancelRef} type="button" className="button button-secondary button-md" disabled={isBusy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`button button-md ${destructive ? 'button-destructive' : 'button-primary'}`} disabled={isBusy} onClick={() => void confirm()}>
            {isBusy ? 'One moment…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
