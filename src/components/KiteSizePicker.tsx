export const kiteSizes = [6, 7, 8, 9, 10, 11, 12, 13, 14]

export function parseKiteSizes(value: string | undefined) {
  return (value ?? '')
    .replace('m²', '')
    .split(',')
    .map((size) => Number(size.trim()))
    .filter((size) => kiteSizes.includes(size))
}

export function formatKiteSizes(sizes: number[]) {
  return sizes.length ? `${[...sizes].sort((left, right) => left - right).join(', ')} m²` : ''
}

export function KiteSizePicker({ value, onChange }: { value: string | undefined; onChange: (value: string) => void }) {
  const selected = parseKiteSizes(value)

  function toggle(size: number) {
    onChange(formatKiteSizes(selected.includes(size) ? selected.filter((item) => item !== size) : [...selected, size]))
  }

  return (
    <div className="field kite-size-picker" role="group" aria-labelledby="kite-sizes-label">
      <span id="kite-sizes-label">Kite sizes</span>
      <small className="field-helper">Which kites are you bringing?</small>
      <div className="kite-size-chips">
        {kiteSizes.map((size) => (
          <button
            key={size}
            type="button"
            className={`chip ${selected.includes(size) ? 'selected' : ''}`}
            aria-pressed={selected.includes(size)}
            onClick={() => toggle(size)}
          >
            {size} m²
          </button>
        ))}
      </div>
    </div>
  )
}
