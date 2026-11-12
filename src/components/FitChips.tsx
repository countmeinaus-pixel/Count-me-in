import { useLayoutEffect, useRef, useState } from 'react'

// Sport chips on one line: as many as fit, then "+N" for the rest.
// A hidden copy of all chips is measured, so it adapts to the card width.
export function FitChips({ items, className = '' }: { items: string[]; className?: string }) {
  const rowRef = useRef<HTMLSpanElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const [visible, setVisible] = useState(items.length)

  useLayoutEffect(() => {
    const row = rowRef.current
    const measure = measureRef.current
    if (!row || !measure) return

    function fit() {
      if (!row || !measure) return
      const available = row.clientWidth
      const chips = Array.from(measure.children) as HTMLElement[]
      const gap = parseFloat(getComputedStyle(row).columnGap || '4') || 4
      const plusWidth = chips[chips.length - 1]?.offsetWidth ?? 0 // the "+99" chip
      const widths = chips.slice(0, items.length).map((chip) => chip.offsetWidth)
      let used = 0
      let count = 0
      for (let index = 0; index < widths.length; index += 1) {
        const next = used + (count > 0 ? gap : 0) + widths[index]
        const left = widths.length - (index + 1)
        const needed = next + (left > 0 ? gap + plusWidth : 0)
        if (needed > available) break
        used = next
        count += 1
      }
      setVisible(Math.max(1, count))
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(row)
    return () => observer.disconnect()
  }, [items])

  const hidden = items.length - visible

  return (
    <span ref={rowRef} className={`fit-chips ${className}`.trim()}>
      {items.slice(0, visible).map((item) => <span className="mate-sport" key={item}>{item}</span>)}
      {hidden > 0 && <span className="mate-sport-more">+{hidden}</span>}
      <span ref={measureRef} className="fit-chips-measure" aria-hidden="true">
        {items.map((item) => <span className="mate-sport" key={item}>{item}</span>)}
        <span className="mate-sport-more">+99</span>
      </span>
    </span>
  )
}
