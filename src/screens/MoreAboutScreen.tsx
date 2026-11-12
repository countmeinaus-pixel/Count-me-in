import packageDetails from '../../package.json'
import { ArrowUpRight, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MorePageHeader } from '../components/MorePageHeader'
import { aboutDetails, aboutSections } from '../data/aboutContent'
import { useBackToMore, getMoreOrigin } from '../lib/moreNavigation'
import { useLocation } from 'react-router-dom'

export function MoreAboutScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backToMore = useBackToMore()

  return (
    <main className="screen more-about-page">
      <MorePageHeader title="About Count Me In" eyebrow="The app" onBack={backToMore} />
      <div className="about-brand">
        <span className="about-brand-mark"><UsersRound aria-hidden="true" /></span>
        <strong>Count Me In</strong>
        <small>Find your mates for the things you love.</small>
      </div>

      <article className="about-story">
        {aboutSections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.title}-${index}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <section className="about-builder">
        <h2>Built by</h2>
        <div className="about-builder-card">
          <span className="about-builder-avatar" aria-hidden="true">{aboutDetails.name[0]}</span>
          <span><strong>{aboutDetails.name}</strong><small>{aboutDetails.location}</small></span>
        </div>
        <button
          type="button"
          className="secondary-action"
          onClick={() => navigate('/more/help', { state: { from: getMoreOrigin(location.state) } })}
        >
          Send feedback <ArrowUpRight aria-hidden="true" />
        </button>
      </section>

      <footer className="about-footer">
        <span>Version {packageDetails.version}</span>
        <span>Made in Adelaide</span>
      </footer>
      {/* Required by the CC BY licence of the place data (public/au-localities.json). */}
      <p className="about-credit">
        Place data: Australian Postcodes by Matthew Proctor, CC BY 4.0. Maps © OpenStreetMap contributors.
      </p>
    </main>
  )
}
