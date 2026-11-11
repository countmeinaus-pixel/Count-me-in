import { useLocation, useNavigate } from 'react-router-dom'

export function getMoreOrigin(state: unknown) {
  if (typeof state !== 'object' || state === null || !('from' in state)) return '/'
  const from = state.from
  return typeof from === 'string' && from.startsWith('/') && from !== '/more' ? from : '/'
}

export function useBackToMore() {
  const location = useLocation()
  const navigate = useNavigate()
  const from = getMoreOrigin(location.state)
  return () => navigate('/more', { state: { from } })
}

// The More panel slides in and out at this speed (keep in sync with index.css).
export const moreMenuSlideMs = 500
// Ask an open More panel to slide out, then go to the path in event.detail.
export const closeMoreMenuEvent = 'count-me-in-close-more'
export function requestCloseMoreMenu(to: string) {
  window.dispatchEvent(new CustomEvent(closeMoreMenuEvent, { detail: to }))
}
