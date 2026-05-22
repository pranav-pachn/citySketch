import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Navigation, Check, Search, Loader2, MapPin, ZoomIn, ZoomOut, LocateFixed, Clock3 } from 'lucide-react'
import { apiClient, type LocationResult } from '@/shared/api/apiClient'

/* ─── Fix default Leaflet icon paths (vite/webpack break them) ──────────── */
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ─── Map context returned to the parent ────────────────────────────────── */
export interface MapSiteContext {
  lat: number
  lng: number
  bbox: [number, number, number, number] // [south, west, north, east]
  locationName: string
  zoom: number
}

interface SiteSelectorProps {
  onClose: () => void
  onConfirm: (ctx: MapSiteContext) => void
}

const RECENT_SEARCHES_KEY = 'citySketch.recentLocations'

function normalizeBoundingBox(boundingBox: LocationResult['boundingBox']) {
  if (!boundingBox || boundingBox.length !== 4) return null
  return boundingBox
}

/* ─── Inner component to track map bounds ───────────────────────────────── */
function MapController({
  center,
  zoom,
  onBoundsChange,
}: {
  center: [number, number]
  zoom: number
  onBoundsChange: (bbox: [number, number, number, number]) => void
}) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  useMapEvents({
    moveend: () => {
      const b = map.getBounds()
      onBoundsChange([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()])
    },
    zoomend: () => {
      const b = map.getBounds()
      onBoundsChange([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()])
    },
  })

  return null
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export function SiteSelector({ onClose, onConfirm }: SiteSelectorProps) {
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]) // Bengaluru default
  const [zoom, setZoom] = useState(15)
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null)
  const [locationName, setLocationName] = useState('')

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [recentSearches, setRecentSearches] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Geolocation
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.slice(0, 5))
      }
    } catch {
      setRecentSearches([])
    }
  }, [])

  const saveRecentSearch = useCallback((location: LocationResult) => {
    setRecentSearches((current) => {
      const next = [location, ...current.filter((item) => item.id !== location.id)].slice(0, 5)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage quota errors in private browsing modes.
      }
      return next
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  /* ── Search ── */
  const doSearch = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (trimmed.length < 3) return

    setIsSearching(true)
    setSearchError('')
    try {
      const items = await apiClient.searchLocations(trimmed)
      setResults(items.slice(0, 5))
      setShowResults(items.length > 0)
      if (items.length === 0) {
        setSearchError('No locations found. Try a different search term.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search locations'
      console.error('Geocode search failed:', message)
      setSearchError(message)
      setResults([])
      setShowResults(true)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSearchError('')

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => doSearch(val), 500)
    } else {
      setResults([])
      setShowResults(val.trim().length === 0)
    }
  }

  const handleResultPick = (r: LocationResult) => {
    setCenter([r.lat, r.lon])
    setLocationName(r.name)
    setQuery(r.name)
    setShowResults(false)
    setSearchError('')
    setZoom(16)
    const normalizedBbox = normalizeBoundingBox(r.boundingBox)
    if (normalizedBbox) {
      setBbox(normalizedBbox)
    }
    saveRecentSearch(r)
  }

  /* ── Browser geolocation ── */
  const handleLocateMe = () => {
    if (!navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude])
        setZoom(16)
        setLocationName('Your current location')
        setIsLocating(false)
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  /* ── Confirm ── */
  const handleConfirm = () => {
    if (!bbox) return
    onConfirm({
      lat: center[0],
      lng: center[1],
      bbox,
      locationName: locationName || `${center[0].toFixed(4)}, ${center[1].toFixed(4)}`,
      zoom,
    })
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowResults(true)
    setSearchError('')
    inputRef.current?.focus()
  }

  const dropdownItems = query.trim().length === 0 ? recentSearches : results
  const showRecentSection = query.trim().length === 0 && recentSearches.length > 0

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zinc-950 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <div className="relative z-[1500] flex flex-col gap-3 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-4 backdrop-blur-xl sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/20">
            <Navigation size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white">Real-World Site Selector</h2>
            <p className="text-[11px] text-zinc-500">Pick a location to overlay your city design</p>
          </div>
        </div>

        {/* Search */}
        <div ref={searchBoxRef} className="relative w-full min-w-0 flex-1 sm:mx-6 sm:max-w-[500px]">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search city, neighborhood, or landmark…"
              className="h-12 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 pl-11 pr-20 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
              onFocus={() => {
                if (query.trim().length === 0 && recentSearches.length > 0) {
                  setShowResults(true)
                } else if (results.length > 0) {
                  setShowResults(true)
                }
              }}
            />
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-zinc-500"
              size={16}
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            {isSearching && (
              <Loader2
                className="pointer-events-none absolute right-10 top-1/2 z-10 -translate-y-1/2 animate-spin text-zinc-500"
                size={16}
              />
            )}
          </div>

          {searchError && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {searchError}
            </div>
          )}

          {/* Autocomplete dropdown */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-[320px] overflow-y-auto rounded-2xl border border-zinc-700/80 bg-zinc-900/98 shadow-2xl backdrop-blur-xl">
              {showRecentSection && (
                <div className="flex items-center gap-2 px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <Clock3 size={12} />
                  Recent Searches
                </div>
              )}

              {dropdownItems.length === 0 && !searchError && (
                <div className="px-4 py-4 text-sm text-zinc-500">Start typing to search for a city or neighborhood.</div>
              )}

              {dropdownItems.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-800/80 hover:text-white"
                  onClick={() => handleResultPick(r)}
                >
                  <MapPin size={14} className="shrink-0 text-blue-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{r.name}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-zinc-500">{r.type.replace('_', ' ')}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Map ── */}
      <div className="relative flex-1">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap contributors, © CARTO"
          />
          <MapController center={center} zoom={zoom} onBoundsChange={setBbox} />
        </MapContainer>

        {/* Center crosshair overlay — spec §3.5: 50% of viewport */}
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="relative rounded-2xl border-2 border-dashed border-blue-400/40 bg-blue-500/[0.03] shadow-[0_0_60px_rgba(59,130,246,0.08)]" style={{ width: '50%', height: '50%' }}>
            <div className="absolute -left-px -top-px h-5 w-5 rounded-tl-xl border-l-[3px] border-t-[3px] border-blue-400" />
            <div className="absolute -right-px -top-px h-5 w-5 rounded-tr-xl border-r-[3px] border-t-[3px] border-blue-400" />
            <div className="absolute -bottom-px -left-px h-5 w-5 rounded-bl-xl border-b-[3px] border-l-[3px] border-blue-400" />
            <div className="absolute -bottom-px -right-px h-5 w-5 rounded-br-xl border-b-[3px] border-r-[3px] border-blue-400" />
            {/* Crosshair lines */}
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-blue-400/15" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-blue-400/15" />
            {/* Center pin */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-3 w-3 rounded-full border-2 border-blue-400 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
            </div>
            {/* Area estimate label */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900/90 px-3 py-1 text-[11px] font-medium text-blue-300 backdrop-blur pointer-events-none">
              {bbox ? `≈ ${((Math.abs(bbox[2] - bbox[0]) * Math.abs(bbox[3] - bbox[1])) * 111 * 111 * Math.cos((bbox[0] + bbox[2]) / 2 * Math.PI / 180)).toFixed(1)} km² selected` : 'Select area'}
            </div>
          </div>
        </div>

        {/* Right-side map controls */}
        <div className="absolute right-4 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-2">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/90 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-zinc-800 hover:text-white"
            onClick={() => setZoom(z => Math.min(z + 1, 19))}
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/90 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-zinc-800 hover:text-white"
            onClick={() => setZoom(z => Math.max(z - 1, 5))}
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/90 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-zinc-800 hover:text-white"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Use my location"
          >
            {isLocating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          </button>
        </div>

        {/* Bottom action bar */}
        <div className="absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-700/60 bg-zinc-950/90 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
            {locationName && (
              <div className="max-w-[200px] truncate rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300">
                <MapPin size={12} className="mr-1 inline text-blue-400" />
                {locationName}
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={!bbox}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:shadow-blue-600/40 hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              Simulate on this Site
            </button>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-900/40 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500">
        <span>Zoom &amp; pan to align the blue box with the area you want to redesign. Real roads and waterways will be pulled into your layout.</span>
        <span className="font-semibold text-zinc-400">Map Service: OSM-backed backend search</span>
      </div>
    </div>
  )
}
