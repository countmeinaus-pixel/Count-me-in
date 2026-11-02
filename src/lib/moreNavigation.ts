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
