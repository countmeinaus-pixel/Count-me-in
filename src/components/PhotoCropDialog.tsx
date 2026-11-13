import { ZoomIn, ZoomOut } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'

// Square crop for profile photos: drag to move, slider to zoom. The circle shows
// what members will see. The result is always a square JPEG of at most 800×800 px,
// well under the 3 MB limit, whatever photo was chosen.
const outputSize = 800
const maxBytes = 3 * 1024 * 1024
const maxZoom = 3

type Offset = { x: number; y: number }

export function PhotoCropDialog({
  file,
  onCancel,
  onDone,
}: {
  file: File
  onCancel: () => void
  onDone: (cropped: File) => void
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: Offset } | null>(null)
  const [imageUrl] = useState(() => URL.createObjectURL(file))
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [viewport, setViewport] = useState(300)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const update = () => setViewport(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Size of the photo on screen: it always covers the whole square.
  const scale = natural ? (viewport / Math.min(natural.width, natural.height)) * zoom : 1
  const shownWidth = natural ? natural.width * scale : viewport
  const shownHeight = natural ? natural.height * scale : viewport

  function clamp(next: Offset, width = shownWidth, height = shownHeight): Offset {
    const limitX = Math.max(0, (width - viewport) / 2)
    const limitY = Math.max(0, (height - viewport) / 2)
    return {
      x: Math.min(limitX, Math.max(-limitX, next.x)),
      y: Math.min(limitY, Math.max(-limitY, next.y)),
    }
  }

  function changeZoom(nextZoom: number) {
    const value = Math.min(maxZoom, Math.max(1, nextZoom))
    if (!natural) return setZoom(value)
    const nextScale = (viewport / Math.min(natural.width, natural.height)) * value
    // Keep the same spot in the middle while zooming.
    const ratio = value / zoom
    setZoom(value)
    setOffset((current) => clamp({ x: current.x * ratio, y: current.y * ratio }, natural.width * nextScale, natural.height * nextScale))
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: offset }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setOffset(clamp({ x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  // Arrow keys move the photo, + and - zoom (for keyboard users).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10
    const moves: Record<string, Offset> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    }
    if (moves[event.key]) {
      event.preventDefault()
      setOffset((current) => clamp({ x: current.x + moves[event.key].x, y: current.y + moves[event.key].y }))
    } else if (event.key === '+' || event.key === '=') {
      changeZoom(zoom + 0.1)
    } else if (event.key === '-') {
      changeZoom(zoom - 0.1)
    }
  }

  async function save() {
    const image = imageRef.current
    if (!image || !natural) return
    setIsSaving(true)
    setError('')
    try {
      // The part of the photo inside the square, in the photo's own pixels.
      const left = viewport / 2 + offset.x - shownWidth / 2
      const top = viewport / 2 + offset.y - shownHeight / 2
      const sourceX = -left / scale
      const sourceY = -top / scale
      const sourceSize = viewport / scale
      const size = Math.max(1, Math.min(outputSize, Math.round(sourceSize)))

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is not available in this browser.')
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)

      let quality = 0.8
      let blob: Blob | null = null
      do {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        quality -= 0.15
      } while (blob && blob.size > maxBytes && quality > 0.3)
      if (!blob) throw new Error('This photo could not be prepared. Try another one.')
      if (blob.size > maxBytes) throw new Error('This photo is too large. Try another one (max 3 MB).')

      onDone(new File([blob], 'profile.jpg', { type: 'image/jpeg' }))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'This photo could not be prepared.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="report-dialog-backdrop" role="presentation">
      <section className="report-dialog photo-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-crop-title">
        <h2 id="photo-crop-title">Move and zoom</h2>
        <p>Drag the photo to choose what shows in the circle.</p>

        <div
          ref={viewportRef}
          className="photo-crop-viewport"
          tabIndex={0}
          role="application"
          aria-label="Photo position. Drag, or use the arrow keys to move and plus or minus to zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onWheel={(event) => changeZoom(zoom - event.deltaY * 0.002)}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={() => setError('This file could not be opened. Choose a JPG, PNG or HEIC photo.')}
            style={{
              width: shownWidth,
              height: shownHeight,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
          <span className="photo-crop-circle" aria-hidden="true" />
        </div>

        <label className="photo-crop-zoom">
          <ZoomOut aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={maxZoom}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => changeZoom(Number(event.target.value))}
          />
          <ZoomIn aria-hidden="true" />
        </label>

        {error && <p className="flow-error" role="alert">{error}</p>}

        <div className="photo-crop-actions">
          <button type="button" className="button button-secondary button-md" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="button button-primary button-md" onClick={() => void save()} disabled={isSaving || !natural}>
            {isSaving ? 'Saving…' : 'Use photo'}
          </button>
        </div>
      </section>
    </div>
  )
}
