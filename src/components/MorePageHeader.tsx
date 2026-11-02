import { ArrowLeft } from 'lucide-react'

export function MorePageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="more-page-header">
      <button type="button" className="icon-button" aria-label="Back to More" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
      </button>
      <h1>{title}</h1>
    </header>
  )
}
