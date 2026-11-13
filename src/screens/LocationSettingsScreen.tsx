import { LocationControls } from '../components/LocationControls'
import { MorePageHeader } from '../components/MorePageHeader'
import { ShareLocationSetting } from '../components/ShareLocationSetting'
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
      <LocationControls value={preference} onChange={setLocationPreference} showShareLink={false} />

      <h3 className="more-settings-subtitle location-share-title">Share with mates</h3>
      <ShareLocationSetting />
      <p className="more-settings-note">
        The area you look at is saved on this device only. Your shared location is rounded to about 1 km and only used to show distances. To stop
        sharing, switch it off here. You can also block location for this site in your browser or phone settings.
      </p>
    </main>
  )
}
