import { useEffect, useState } from "react"
import { MorePageHeader } from "../components/MorePageHeader"
import { useBackToMore } from "../lib/moreNavigation"
import {
  getRecordsForStaffReview,
  removePersonalRecordById,
  type PersonalRecord,
} from "../lib/personalRecords"
import { PersonalRecordCard } from "../components/PersonalRecordCard"
import { Link, useNavigate } from "react-router-dom"
import { getActivitiesToReview, reviewActivity, type ActivityToReview } from "../lib/activityReview"
import {
  getCurrentModerationRole,
  getModerationReports,
  updateModerationReportStatus,
  type ModerationReport,
  type ModerationReportStatus,
} from "../lib/moderation"

const reportStatuses: ModerationReportStatus[] = [
  "open",
  "in_review",
  "resolved",
  "dismissed",
]

const reportReasonLabels: Record<ModerationReport["reason"], string> = {
  inappropriate_or_sexual_content: "Inappropriate or sexual content",
  harassment_or_bullying: "Harassment or bullying",
  spam_or_scam: "Spam or scam",
  fake_profile: "Fake profile",
  safety_concern: "Safety concern",
  other: "Other",
}

function getEvidenceTitle(report: ModerationReport) {
  const title = report.evidence.title
  const firstName = report.evidence.first_name
  if (typeof title === "string") return title
  if (typeof firstName === "string") return firstName
  return report.target_type === "profile"
    ? "Reported profile"
    : "Reported activity"
}

type ModerationTab = "reports" | "records" | "activities"
const tabPaths: Record<ModerationTab, string> = {
  reports: "/more/moderation",
  records: "/more/moderation/records",
  activities: "/more/moderation/activities",
}

// Each tab has its own address, so it can be its own item in the menu.
export function ModerationScreen({ tab = "reports" }: { tab?: ModerationTab }) {
  const navigate = useNavigate()
  const setTab = (next: ModerationTab) => navigate(tabPaths[next], { replace: true })
  const backToMore = useBackToMore()
  const [role, setRole] = useState<"moderator" | "admin" | null>(null)
  const [reports, setReports] = useState<ModerationReport[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null)
  const [activitiesToReview, setActivitiesToReview] = useState<ActivityToReview[] | null>(null)
  const [activitiesError, setActivitiesError] = useState("")
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [recordsToCheck, setRecordsToCheck] = useState<PersonalRecord[] | null>(null)
  const [recordsError, setRecordsError] = useState("")
  const [recordsVersion, setRecordsVersion] = useState(0)

  useEffect(() => {
    if (!role || tab !== "activities") return
    let active = true
    setActivitiesError("")
    getActivitiesToReview()
      .then((items) => {
        if (active) setActivitiesToReview(items)
      })
      .catch((loadError: unknown) => {
        if (active)
          setActivitiesError(
            loadError instanceof Error ? loadError.message : "Unable to load activities to review.",
          )
      })
    return () => {
      active = false
    }
  }, [role, tab])

  async function answerActivity(item: ActivityToReview, approve: boolean) {
    let message = ""
    if (!approve) {
      const reason = window.prompt(`Why is "${item.title}" not approved? ${item.hostName} sees this message. You can leave it empty.`, "")
      if (reason === null) return
      message = reason.trim()
    }
    setReviewingId(item.id)
    setActivitiesError("")
    try {
      await reviewActivity(item.id, approve, message)
      setActivitiesToReview((current) => current?.filter((entry) => entry.id !== item.id) ?? null)
    } catch (reviewError) {
      setActivitiesError(reviewError instanceof Error ? reviewError.message : "Unable to review this activity.")
    } finally {
      setReviewingId(null)
    }
  }

  useEffect(() => {
    if (!role || tab !== "records") return
    let active = true
    setRecordsError("")
    getRecordsForStaffReview()
      .then((records) => {
        if (active) setRecordsToCheck(records)
      })
      .catch((loadError: unknown) => {
        if (active)
          setRecordsError(
            loadError instanceof Error ? loadError.message : "Unable to load PRs to check.",
          )
      })
    return () => {
      active = false
    }
  }, [role, tab, recordsVersion])

  useEffect(() => {
    let active = true
    async function loadModerationQueue() {
      try {
        const currentRole = await getCurrentModerationRole()
        if (active)
          setRole(
            currentRole === "admin" || currentRole === "moderator"
              ? currentRole
              : null,
          )
        if (currentRole !== "admin" && currentRole !== "moderator") return

        const queue = await getModerationReports()
        if (active) setReports(queue)
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the reports queue.",
          )
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadModerationQueue()
    return () => {
      active = false
    }
  }, [])

  async function removeFlaggedRecord(report: ModerationReport) {
    if (!window.confirm("Remove this PR and its proof photo for good?")) return
    setUpdatingReportId(report.id)
    setError("")
    try {
      await removePersonalRecordById(report.target_id)
      await updateModerationReportStatus(report.id, "resolved")
      setReports((current) =>
        current.map((item) =>
          item.id === report.id ? { ...item, status: "resolved" } : item,
        ),
      )
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "Unable to remove this PR.",
      )
    } finally {
      setUpdatingReportId(null)
    }
  }

  async function changeStatus(
    reportId: string,
    status: ModerationReportStatus,
  ) {
    setUpdatingReportId(reportId)
    setError("")
    try {
      await updateModerationReportStatus(reportId, status)
      setReports((current) =>
        current.map((report) =>
          report.id === reportId ? { ...report, status } : report,
        ),
      )
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update this report.",
      )
    } finally {
      setUpdatingReportId(null)
    }
  }

  return (
    <main className="screen more-settings-page moderation-page">
      <MorePageHeader title="Moderation" onBack={backToMore} />
      {isLoading ? (
        <p className="more-settings-note">Loading reports…</p>
      ) : role ? (
        <>
          <div className="segment-bar">
            <button
              type="button"
              className={tab === "reports" ? "active" : ""}
              aria-pressed={tab === "reports"}
              onClick={() => setTab("reports")}
            >
              Reports
            </button>
            <button
              type="button"
              className={tab === "records" ? "active" : ""}
              aria-pressed={tab === "records"}
              onClick={() => setTab("records")}
            >
              Check PRs
            </button>
            <button
              type="button"
              className={tab === "activities" ? "active" : ""}
              aria-pressed={tab === "activities"}
              onClick={() => setTab("activities")}
            >
              Review activities
            </button>
          </div>
          {tab === "activities" ? (
            <>
              <p className="more-settings-intro">
                Activities with a sport that is not in the list yet. Approve to
                put it live for everyone; admins then get a notification to
                consider adding the sport. Reject to keep it hidden.
              </p>
              {activitiesError ? (
                <p className="edit-form-error" role="alert">{activitiesError}</p>
              ) : activitiesToReview === null ? (
                <p className="more-settings-note">Loading activities…</p>
              ) : activitiesToReview.length ? (
                <div className="moderation-report-list">
                  {activitiesToReview.map((item) => (
                    <article className="moderation-report-card review-activity-card" key={item.id}>
                      <span className="review-activity-sport">New sport: {item.suggestedSport}</span>
                      <h2>{item.title}</h2>
                      <p>
                        By {item.hostName} ·{" "}
                        {new Date(item.startsAt).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p>{[item.meetingPoint, item.suburb].filter(Boolean).join(", ")}</p>
                      {item.notes && <p className="review-activity-notes">{item.notes}</p>}
                      <Link className="text-action" to={`/activity/${item.id}`}>Open activity</Link>
                      <div className="review-activity-actions">
                        <button
                          type="button"
                          className="button button-secondary button-md"
                          disabled={reviewingId !== null}
                          onClick={() => void answerActivity(item, false)}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="button button-primary button-md"
                          disabled={reviewingId !== null}
                          onClick={() => void answerActivity(item, true)}
                        >
                          {reviewingId === item.id ? "Saving…" : "Approve"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="more-settings-note">No activities waiting for a review.</p>
              )}
            </>
          ) : tab === "records" ? (
            <>
              <p className="more-settings-intro">
                Personal records that are not verified yet, flagged ones first.
                Verify counts as fully verified (like 3 confirms) and makes a
                flagged PR visible again.
              </p>
              {recordsError ? (
                <p className="edit-form-error" role="alert">{recordsError}</p>
              ) : recordsToCheck === null ? (
                <p className="more-settings-note">Loading PRs…</p>
              ) : recordsToCheck.length ? (
                <div className="pr-list">
                  {recordsToCheck.map((record) => (
                    <PersonalRecordCard
                      key={record.id}
                      record={record}
                      showOwner
                      staffMode
                      onChanged={() => setRecordsVersion((version) => version + 1)}
                    />
                  ))}
                </div>
              ) : (
                <p className="more-settings-note">No PRs waiting for a check.</p>
              )}
            </>
          ) : (
          <>
          <p className="more-settings-intro">
            Reports are ordered by safety priority, then by newest first. Staff
            actions are restricted by Supabase.
          </p>
          {reports.length ? (
            <div className="moderation-report-list">
              {reports.map((report) => (
                <article className="moderation-report-card" key={report.id}>
                  <div className="moderation-report-heading">
                    <div>
                      <span className="eyebrow">
                        {report.target_type} ·{" "}
                        {reportReasonLabels[report.reason]}
                      </span>
                      <h2>{getEvidenceTitle(report)}</h2>
                    </div>
                    <span className={`moderation-status ${report.status}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                  {report.note && <p>{report.note}</p>}
                  {report.target_type === "personal_record" &&
                    typeof report.evidence.photo_url === "string" && (
                      <>
                        <img
                          className="moderation-pr-photo"
                          src={report.evidence.photo_url}
                          alt="Proof photo of the flagged PR"
                        />
                        <button
                          type="button"
                          className="button button-destructive button-md"
                          disabled={updatingReportId === report.id}
                          onClick={() => void removeFlaggedRecord(report)}
                        >
                          Remove PR
                        </button>
                      </>
                    )}
                  <time dateTime={report.created_at}>
                    {new Date(report.created_at).toLocaleString("en-AU")}
                  </time>
                  <label className="report-status-field">
                    <span>Update status</span>
                    <select
                      value={report.status}
                      disabled={updatingReportId === report.id}
                      onChange={(event) => {
                        const nextStatus = reportStatuses.find(
                          (status) => status === event.target.value,
                        )
                        if (nextStatus) void changeStatus(report.id, nextStatus)
                      }}
                    >
                      {reportStatuses.map((status) => (
                        <option value={status} key={status}>
                          {status.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state-card compact">
              <h3>No reports yet</h3>
              <p>New profile and activity reports will appear here.</p>
            </div>
          )}
          </>
          )}
        </>
      ) : (
        <p className="more-settings-note">
          You don’t have permission to view moderation reports.
        </p>
      )}
      {error && (
        <p className="more-status-message error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
