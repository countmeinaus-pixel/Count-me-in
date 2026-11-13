import { Bike, ChevronLeft, ChevronRight, Dumbbell, Fish, Footprints, MapPin, Mountain, Waves } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMapStyle } from '../lib/mapStyle'
import type { ActivityCardData } from './ActivityCard'
import { ActivityPreviewCard } from './ActivityPreviewCard'
import { SportIcon } from './SportIcon'
import { formatActivityDate, getActivitySpotsLabel } from '../data/mockData'

// Without pins the map shows your chosen place (or all of Australia); with pins it zooms to them.
const australia: [number, number] = [134.5, -27.5]
// Pins closer than this on screen are grouped into one cluster.
const clusterRadiusPx = 44
// Pins this close together (about 30 m) are treated as the same spot.
const sameSpotDegrees = 0.0003
// Keeps a tapped pin above the activity card at the bottom of the map.
const cardOffset: [number, number] = [0, -70]

const markerIcons = {
  fish: Fish,
  mountain: Mountain,
  run: Footprints,
  waves: Waves,
  bike: Bike,
  gym: Dumbbell,
} as const

type ActivityMapProps = {
  activities: ActivityCardData[]
  onOpenActivity: (id: ActivityCardData['id']) => void
  // The chosen location filter: without pins the map starts there instead of all of Australia.
  home?: { latitude: number; longitude: number } | null
}

export default function ActivityMap({ activities, onOpenActivity, home = null }: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // The activities shown in the card: one pin, or every activity at one spot.
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [selection, setSelection] = useState<{ ids: Array<ActivityCardData['id']>; index: number } | null>(null)
  const pinned = activities.filter((activity) => activity.latitude != null && activity.longitude != null)
  const selectedGroup = selection
    ? pinned.filter((activity) => selection.ids.includes(activity.id))
    : []
  const selected = selectedGroup[selection?.index ?? 0] ?? null

  useEffect(() => {
    if (!containerRef.current) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(),
      center: home ? [home.longitude, home.latitude] : australia,
      zoom: home ? 9.5 : 3.2,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      })
    } catch {
      // Some browsers cannot draw maps (WebGL off): show a message instead of crashing the app.
      setMapUnavailable(true)
      return
    }
    map.touchZoomRotate.disableRotation()
    // Current location: uses the browser's own location, free and only after the viewer allows it.
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: false, timeout: 10_000 },
        fitBoundsOptions: { maxZoom: 13 },
        showAccuracyCircle: false,
      }),
      'top-right',
    )
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', () => setSelection(null))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // One custom marker per activity, with the sport's icon. Pins that sit close
  // together on screen are swapped for a cluster bubble with a count.
  const pinKey = pinned.map((activity) => `${activity.id}:${activity.latitude}:${activity.longitude}`).join('|')
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const roots: Root[] = []
    const markers = pinned.map((activity) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `activity-marker${activity.joinStatus === 'accepted' ? ' going' : ''}`
      element.setAttribute('aria-label', `${activity.sport}: ${activity.title}`)
      element.dataset.activityIds = String(activity.id)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        setSelection({ ids: [activity.id], index: 0 })
        map.easeTo({ center: [activity.longitude!, activity.latitude!], offset: cardOffset })
      })
      const Icon = markerIcons[activity.icon]
      const root = createRoot(element)
      root.render(<span className="activity-marker-pin"><Icon aria-hidden="true" /></span>)
      roots.push(root)
      return new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([activity.longitude!, activity.latitude!])
    })
    let clusterMarkers: maplibregl.Marker[] = []

    function openCluster(group: ActivityCardData[]) {
      const bounds = new maplibregl.LngLatBounds()
      group.forEach((activity) => bounds.extend([activity.longitude!, activity.latitude!]))
      const spread = Math.max(
        bounds.getNorth() - bounds.getSouth(),
        bounds.getEast() - bounds.getWest(),
      )
      // Same spot, or already zoomed in all the way: list them in the card.
      if (spread < sameSpotDegrees || map!.getZoom() >= map!.getMaxZoom() - 1) {
        setSelection({ ids: group.map((activity) => activity.id), index: 0 })
        map!.easeTo({ center: bounds.getCenter(), offset: cardOffset })
        return
      }
      setSelection(null)
      map!.fitBounds(bounds, { padding: 80, maxZoom: 17 })
    }

    function updateClusters() {
      clusterMarkers.forEach((marker) => marker.remove())
      clusterMarkers = []
      const points = pinned.map((activity, index) => ({
        index,
        point: map!.project([activity.longitude!, activity.latitude!]),
      }))
      const used = new Set<number>()
      points.forEach(({ index, point }) => {
        if (used.has(index)) return
        const members = points.filter((other) =>
          !used.has(other.index) && Math.hypot(other.point.x - point.x, other.point.y - point.y) <= clusterRadiusPx,
        )
        members.forEach((member) => used.add(member.index))
        if (members.length === 1) {
          markers[index].addTo(map!)
          return
        }
        members.forEach((member) => markers[member.index].remove())
        const group = members.map((member) => pinned[member.index])
        const element = document.createElement('button')
        element.type = 'button'
        element.className = 'activity-cluster'
        element.dataset.activityIds = group.map((activity) => activity.id).join(',')
        element.textContent = String(group.length)
        element.setAttribute('aria-label', `${group.length} activities here. Tap to see them.`)
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          openCluster(group)
        })
        const center = group.reduce(
          (sum, activity) => [sum[0] + activity.longitude! / group.length, sum[1] + activity.latitude! / group.length],
          [0, 0],
        ) as [number, number]
        clusterMarkers.push(new maplibregl.Marker({ element }).setLngLat(center).addTo(map!))
      })
      window.dispatchEvent(new Event('count-me-in-map-markers'))
    }

    if (pinned.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      pinned.forEach((activity) => bounds.extend([activity.longitude!, activity.latitude!]))
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 })
    } else if (pinned.length === 1) {
      map.jumpTo({ center: [pinned[0].longitude!, pinned[0].latitude!], zoom: 12 })
    }
    updateClusters()
    map.on('moveend', updateClusters)

    return () => {
      map.off('moveend', updateClusters)
      markers.forEach((marker) => marker.remove())
      clusterMarkers.forEach((marker) => marker.remove())
      // Unmount after React finishes the current render.
      window.setTimeout(() => roots.forEach((root) => root.unmount()))
    }
    // pinKey covers every change to the pinned activities.
  }, [pinKey])

  // Highlight the selected pin or cluster, also after clusters are redrawn.
  const selectionKey = selection?.ids.join(',') ?? ''
  useEffect(() => {
    const highlight = () => {
      document.querySelectorAll<HTMLElement>('.activity-marker, .activity-cluster').forEach((element) => {
        element.classList.toggle('selected', selectionKey !== '' && element.dataset.activityIds === selectionKey)
      })
    }
    highlight()
    window.addEventListener('count-me-in-map-markers', highlight)
    return () => window.removeEventListener('count-me-in-map-markers', highlight)
  }, [selectionKey])

  const withoutPin = activities.length - pinned.length

  if (mapUnavailable) {
    return (
      <div className="activity-map activity-map-loading" role="status">
        The map can’t be shown in this browser. Use List or Calendar instead.
      </div>
    )
  }

  return (
    <div className="activity-map">
      <div ref={containerRef} className="activity-map-canvas" aria-label="Map of activities" />
      {selected && selection && (
        <div className="activity-map-card">
          {/* Same content as the activity card, side by side: photo left, details right. */}
          <ActivityPreviewCard activity={selected} onOpen={() => onOpenActivity(selected.id)} />
          {selectedGroup.length > 1 && (
            <div className="activity-map-card-pager">
              <button
                type="button"
                aria-label="Previous activity at this spot"
                disabled={selection.index === 0}
                onClick={() => setSelection({ ...selection, index: selection.index - 1 })}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span>{selection.index + 1} of {selectedGroup.length} here</span>
              <button
                type="button"
                aria-label="Next activity at this spot"
                disabled={selection.index === selectedGroup.length - 1}
                onClick={() => setSelection({ ...selection, index: selection.index + 1 })}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
      {withoutPin > 0 && (
        <p className="activity-map-note">
          {withoutPin === 1 ? '1 activity has' : `${withoutPin} activities have`} no map pin yet. You’ll find {withoutPin === 1 ? 'it' : 'them'} in the list below.
        </p>
      )}
    </div>
  )
}
