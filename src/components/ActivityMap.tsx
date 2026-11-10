import { Bike, Dumbbell, Fish, Footprints, Mountain, Waves } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMapStyle } from '../lib/mapStyle'
import type { ActivityCardData } from './ActivityCard'

const adelaide: [number, number] = [138.6007, -34.9285]

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
}

export default function ActivityMap({ activities, onOpenActivity }: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedId, setSelectedId] = useState<ActivityCardData['id'] | null>(null)
  const pinned = activities.filter((activity) => activity.latitude != null && activity.longitude != null)
  const selected = pinned.find((activity) => activity.id === selectedId) ?? null

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(),
      center: adelaide,
      zoom: 9.5,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', () => setSelectedId(null))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // One custom marker per activity, with the sport's icon.
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
      element.dataset.activityId = String(activity.id)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        setSelectedId(activity.id)
        map.easeTo({ center: [activity.longitude!, activity.latitude!] })
      })
      const Icon = markerIcons[activity.icon]
      const root = createRoot(element)
      root.render(<span className="activity-marker-pin"><Icon aria-hidden="true" /></span>)
      roots.push(root)
      return new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([activity.longitude!, activity.latitude!])
        .addTo(map)
    })

    if (pinned.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      pinned.forEach((activity) => bounds.extend([activity.longitude!, activity.latitude!]))
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 })
    } else if (pinned.length === 1) {
      map.jumpTo({ center: [pinned[0].longitude!, pinned[0].latitude!], zoom: 12 })
    }

    return () => {
      markers.forEach((marker) => marker.remove())
      // Unmount after React finishes the current render.
      window.setTimeout(() => roots.forEach((root) => root.unmount()))
    }
    // pinKey covers every change to the pinned activities.
  }, [pinKey])

  // Highlight the selected marker.
  useEffect(() => {
    document.querySelectorAll('.activity-marker').forEach((element) => {
      element.classList.toggle('selected', (element as HTMLElement).dataset.activityId === String(selectedId))
    })
  }, [selectedId])

  const withoutPin = activities.length - pinned.length

  return (
    <div className="activity-map">
      <div ref={containerRef} className="activity-map-canvas" aria-label="Map of activities around Adelaide" />
      {selected && (
        <button type="button" className="activity-map-card" onClick={() => onOpenActivity(selected.id)}>
          <span className="map-callout-header">
            <span>{selected.sport}</span>
            <time>{selected.startsAt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</time>
          </span>
          <strong>{selected.title}</strong>
          <span className="activity-map-card-place">{selected.place}, {selected.suburb}</span>
        </button>
      )}
      {withoutPin > 0 && (
        <p className="activity-map-note">
          {withoutPin === 1 ? '1 activity has' : `${withoutPin} activities have`} no map pin yet. You’ll find {withoutPin === 1 ? 'it' : 'them'} in the list below.
        </p>
      )}
    </div>
  )
}
