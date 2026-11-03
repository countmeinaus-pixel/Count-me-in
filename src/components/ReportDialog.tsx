import { FormEvent, useState } from "react"
import {
  submitModerationReport,
  type ReportReason,
  type ReportTargetType,
} from "../lib/moderation"

const reasons: Array<{ value: ReportReason; label: string }> = [
  {
    value: "inappropriate_or_sexual_content",
    label: "Inappropriate or sexual content",
  },
  { value: "harassment_or_bullying", label: "Harassment or bullying" },
  { value: "spam_or_scam", label: "Spam or scam" },
  { value: "fake_profile", label: "Fake profile" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
]

export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  onBlock,
  onClose,
}: {
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  onBlock?: () => Promise<void>
  onClose: () => void
}) {
  const [reason, setReason] = useState<ReportReason | "">("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submittedReason, setSubmittedReason] = useState<ReportReason | null>(
    null,
  )
  const [isBlocking, setIsBlocking] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason) {
      setError("Choose a reason for this report.")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      await submitModerationReport(targetType, targetId, reason, note)
      setSubmittedReason(reason)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send this report.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleBlock() {
    if (!onBlock) return
    setIsBlocking(true)
    setError("")
    try {
      await onBlock()
      onClose()
    } catch (blockError) {
      setError(
        blockError instanceof Error
          ? blockError.message
          : "Unable to block this member.",
      )
    } finally {
      setIsBlocking(false)
    }
  }

  return (
    <div className="report-dialog-backdrop" role="presentation">
      <section
        className="report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
      >
        {submittedReason ? (
          <>
            <h2 id="report-dialog-title">Thanks for letting us know</h2>
            <p>A moderator will review this report.</p>
            {submittedReason === "safety_concern" && (
              <p className="report-safety-note">
                If someone is in immediate danger, call 000.
              </p>
            )}
            {error && (
              <p className="more-status-message error" role="alert">
                {error}
              </p>
            )}
            <div className="report-dialog-actions">
              {onBlock && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => void handleBlock()}
                  disabled={isBlocking}
                >
                  {isBlocking ? "Blocking…" : "Block member"}
                </button>
              )}
              <button
                type="button"
                className="primary-action"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <h2 id="report-dialog-title">Report {targetLabel}</h2>
            <p>Choose the reason that best describes your concern.</p>
            <label className="report-field">
              <span>Reason</span>
              <select
                value={reason}
                onChange={(event) =>
                  setReason(
                    reasons.find((item) => item.value === event.target.value)
                      ?.value ?? "",
                  )
                }
                required
              >
                <option value="">Select a reason</option>
                {reasons.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="report-field">
              <span>More detail (optional)</span>
              <textarea
                value={note}
                maxLength={1000}
                rows={4}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {reason === "safety_concern" && (
              <p className="report-safety-note">
                If someone is in immediate danger, call 000.
              </p>
            )}
            {error && (
              <p className="more-status-message error" role="alert">
                {error}
              </p>
            )}
            <div className="report-dialog-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-action"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
