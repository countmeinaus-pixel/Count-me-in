const DEMO_JOIN_REQUEST_PREFIX = "count-me-in-demo-join-request-"

export function getDemoJoinRequestKey(activityId: number) {
  return `${DEMO_JOIN_REQUEST_PREFIX}${activityId}`
}

export function hasDemoJoinRequest(activityId: number) {
  if (typeof window === "undefined") return false

  try {
    return window.localStorage.getItem(getDemoJoinRequestKey(activityId)) === "pending"
  } catch {
    return false
  }
}

export function saveDemoJoinRequest(activityId: number) {
  window.localStorage.setItem(getDemoJoinRequestKey(activityId), "pending")
}

export function removeDemoJoinRequest(activityId: number) {
  window.localStorage.removeItem(getDemoJoinRequestKey(activityId))
}
