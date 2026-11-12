import type { LucideIcon } from 'lucide-react'

// The Count Me In "Unbroken" knot on its navy tile (public/favicon.svg).
export function BrandMark({ className = '' }: { className?: string }) {
  return <img src="/favicon.svg" alt="" aria-hidden="true" className={`brand-mark ${className}`.trim()} />
}

// The same logo where a menu expects an icon component (About Count Me In).
export const BrandMarkIcon = BrandMark as unknown as LucideIcon
