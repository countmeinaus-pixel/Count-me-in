import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import { isInAustralia, type Coordinates } from '../lib/location'
import { createMapStyle } from '../lib/mapStyle'
import { SidePanel } from './SidePanel'

const australia: [number, number] = [134.5, -27.5]

// Tap the map (or drag the pin) to choose the exact meeting spot.
// Coordinates are kept exactly as the map gives them: never rounded.
// Free: OpenFreeMap tiles via MapLibre, the same map as on Home.
export default function MapPinPicker({
  initial,
  start,
  onPick,
  onClose,
}: {
  initial: Coordinates | null // the current pin, if there is one
  start: Coordinates | null // where to open the map when there is no pin (the suburb)
  onPick: (point: Coordinates) => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [point, setPoint] = useState<Coordinates | null>(initial)

  useEffect(() => {
    if (!containerRef.current) return
    const center = initial ?? start
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(),
      center: center ? [center.longitude, center.latitude] : australia,
      zoom: initial ? 16 : start ? 13 : 3.2,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
        fitBoundsOptions: { maxZoom: 17 },
        showAccuracyCircle: true,
      }),
      'top-right',
    )

    function placeMarker(next: Coordinates) {
      setPoint(next)
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ draggable: true, color: '#ff6b2c' })
          .setLngLat([next.longitude, next.latitude])
          .addTo(map)
        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current!.getLngLat()
          setPoint({ latitude: lngLat.lat, longitude: lngLat.lng })
        })
      } else {
        markerRef.current.setLngLat([next.longitude, next.latitude])
      }
    }

    if (initial) placeMarker(initial)
    map.on('click', (event) => placeMarker({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }))

    return () => {
      markerRef.current = null
      map.remove()
    }
    // The map is created once when the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const outsideAustralia = point !== null && !isInAustralia(point)

  return (
    <SidePanel
      title="Pick the spot"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-secondary button-md" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="button button-primary button-md"
            disabled={!point || outsideAustralia}
            onClick={() => point && onPick(point)}
          >
            Use this spot
          </button>
        </>
      }
    >
      <p className="map-picker-hint">Tap the map where you meet. Drag the pin to fine-tune it, zoom in for more detail.</p>
      <div ref={containerRef} className="map-picker" />
      <p className={outsideAustralia ? 'field-error' : 'map-picker-coords'}>
        {outsideAustralia
          ? 'This spot is not in Australia.'
          : point
          ? `${point.latitude}, ${point.longitude}`
          : 'No spot chosen yet.'}
      </p>
    </SidePanel>
  )
}
