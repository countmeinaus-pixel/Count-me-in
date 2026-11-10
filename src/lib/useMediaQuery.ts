import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export const wideChatLayoutQuery = '(min-width: 768px)'

// Width of the app's content area (the space next to the desktop side nav), the
// same width the CSS @container app rules use.
export function useContentWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const content = document.querySelector('.app-content')
    if (!content) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return width
}
