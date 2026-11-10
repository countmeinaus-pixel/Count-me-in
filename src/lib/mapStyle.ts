import type { StyleSpecification } from 'maplibre-gl'

// Free OpenStreetMap vector tiles from OpenFreeMap: no account, no key, no usage fees.
const tileSource = 'https://tiles.openfreemap.org/planet'
const glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Map style built from the app's design tokens so the map matches the rest of the app.
export function createMapStyle(): StyleSpecification {
  const land = token('--bg')
  const water = token('--surface-3')
  const green = token('--seafoam-subtle')
  const building = token('--surface-1')
  const minorRoad = token('--surface-2')
  const road = token('--border')
  const majorRoad = token('--border-strong')
  const label = token('--text-secondary')
  const mutedLabel = token('--text-muted')
  const waterLabel = token('--seafoam')

  return {
    version: 8,
    glyphs,
    sources: {
      osm: {
        type: 'vector',
        url: tileSource,
        attribution: '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': land } },
      {
        id: 'green',
        type: 'fill',
        source: 'osm',
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]],
        paint: { 'fill-color': green, 'fill-opacity': 0.6 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'osm',
        'source-layer': 'park',
        paint: { 'fill-color': green, 'fill-opacity': 0.8 },
      },
      { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': water } },
      {
        id: 'waterway',
        type: 'line',
        source: 'osm',
        'source-layer': 'waterway',
        paint: { 'line-color': water, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 2] },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'osm',
        'source-layer': 'building',
        minzoom: 14,
        paint: { 'fill-color': building },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track', 'path']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': minorRoad,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 4],
        },
      },
      {
        id: 'road',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 6],
        },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': majorRoad,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 16, 8],
        },
      },
      {
        id: 'water-name',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'water_name',
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: { 'text-color': waterLabel, 'text-halo-color': land, 'text-halo-width': 1 },
      },
      {
        id: 'place-suburb',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'place',
        minzoom: 10,
        filter: ['in', ['get', 'class'], ['literal', ['suburb', 'village', 'hamlet', 'neighbourhood']]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
        },
        paint: { 'text-color': mutedLabel, 'text-halo-color': land, 'text-halo-width': 1.2 },
      },
      {
        id: 'place-town',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 14, 16],
        },
        paint: { 'text-color': label, 'text-halo-color': land, 'text-halo-width': 1.5 },
      },
    ],
  }
}
