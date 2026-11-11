import { LocationControls } from '../components/LocationControls'
import { MorePageHeader } from '../components/MorePageHeader'
import { setLocationPreference, useLocationPreference } from '../lib/distance'
import { useBackToMore } from '../lib/moreNavigation'

// Same setting as the location button on Home and the Friends filters:
// a change here shows up there straight away.
export function LocationSettingsScreen() {
  const backToMore = useBackToMore()
  const preference = useLocationPreference()

  return (
    <main className="screen more-settings-page">
      <MorePageHeader title="Location" onBack={backToMore} />
      <p className="more-settings-intro">
        Choose where you are and how far you’re happy to travel. Home and Find new crew only show activities and mates within this distance.
      </p>
      <LocationControls value={preference} onChange={setLocationPreference} />
      <p className="more-settings-note">
        Your location is saved on this device only, unless you choose to share it. To stop sharing it completely, also block location for this site in your browser or phone settings.
      </p>
    </main>
  )
}
