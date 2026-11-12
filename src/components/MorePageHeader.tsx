import { ArrowLeft } from 'lucide-react'

// Same page header as Friends: back button, small eyebrow, large title.
export function MorePageHeader({ title, eyebrow = 'Settings', onBack }: { title: string; eyebrow?: string; onBack: () => void }) {
  return (
    <header className="mates-header">
      <button type="button" className="icon-button" aria-label="Back to More" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
      </button>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
    </header>
  )
}
