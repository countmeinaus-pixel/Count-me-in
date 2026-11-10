// Per-device flags for the welcome slides and the in-app tour.
const welcomeKey = 'count-me-in-welcome-seen-v1'
const tourKey = 'count-me-in-app-tour-done-v1'

function read(key: string) {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function write(key: string, value: boolean) {
  try {
    if (value) window.localStorage.setItem(key, '1')
    else window.localStorage.removeItem(key)
  } catch {
    // Private mode or blocked storage: the slides or tour may show again.
  }
}

export const hasSeenWelcome = () => read(welcomeKey)
export const markWelcomeSeen = () => write(welcomeKey, true)
export const hasFinishedTour = () => read(tourKey)
export const markTourFinished = () => write(tourKey, true)
export const resetTour = () => write(tourKey, false)
