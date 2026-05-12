import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRoute } from '../utils/osrm'
import CityInput from './CityInput'
import { shortName } from '../utils/nominatim'
import { SharedRoute, MultiStopRouteData } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { C, card } from '../utils/theme'

const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
const STOP_COLORS = [C.cyan, '#a78bfa', '#fb923c', '#f472b6', '#34d399', '#60a5fa']

interface StopState { id: string; text: string; lat: number | null; lng: number | null }
interface SavedMap {
  originText: string; originLat: number | null; originLng: number | null
  destText:   string; destLat:   number | null; destLng:   number | null
  stops: StopState[]
}
interface RouteResult {
  totalMiles:  number
  durationText: string
  legs: { from: string; to: string; miles: number }[]
}
interface Props {
  sharedRoute:     SharedRoute | null
  onSendToETA?:   (r: MultiStopRouteData) => void
  /** Fires with total route miles whenever a route is calculated — used to populate RPM Calc */
  onMilesReady?:  (miles: number) => void
}

function stopColor(i: number, total: number) {
  if (i === 0)         return C.green
  if (i === total - 1) return C.red
  return STOP_COLORS[(i - 1) % STOP_COLORS.length]
}

export default function MapTool({ sharedRoute, onSendToETA, onMilesReady }: Props) {
  const mapDiv    = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)

  const [saved, setSaved] = useLocalStorage<SavedMap>('freightos_map', {
    originText: '', originLat: null, originLng: null,
    destText: '',   destLat:   null, destLng:   null,
    stops: [],
  })
  const [stops, setStopsState] = useState<StopState[]>(saved.stops ?? [])
  const setStops = useCallback((fn: StopState[] | ((p: StopState[]) => StopState[])) => {
    setStopsState((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      setSaved((s) => ({ ...s, stops: next }))
      return next
    })
  }, [setSaved])

  const [result,  setResult]  = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Init Leaflet ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return
    const map = L.map(mapDiv.current, { center: [39.5, -98.35], zoom: 4 })
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18, subdomains: 'abcd' }).addTo(map)
    layersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; layersRef.current = null }
  }, [])

  // ── Draw route on map ─────────────────────────────────────────────────────
  const drawRoute = useCallback((
    osrmResult: Awaited<ReturnType<typeof fetchRoute>>,
    labels: string[]
  ) => {
    if (!mapRef.current || !layersRef.current) return
    layersRef.current.clearLayers()
    const total = osrmResult.waypointCoords.length

    const line = L.geoJSON(osrmResult.geometry as GeoJSON.GeoJsonObject, {
      style: { color: C.cyan, weight: 4, opacity: 0.88 },
    }).addTo(layersRef.current)

    osrmResult.waypointCoords.forEach(([lat, lng], i) => {
      const col = stopColor(i, total)
      L.circleMarker([lat, lng], { radius: 11, fillColor: col, color: C.bg, weight: 2.5, fillOpacity: 0.92 })
        .bindPopup(`<b style="color:${col}">${i === 0 ? 'Origin' : i === total - 1 ? 'Destination' : `Stop ${i}`}</b><br/>${labels[i] ?? ''}`)
        .addTo(layersRef.current!)
    })

    mapRef.current.fitBounds(line.getBounds(), { padding: [50, 50] })
  }, [])

  // ── Fire OSRM request ─────────────────────────────────────────────────────
  const routePoints = useCallback(async (
    pts: Array<{ lat: number; lng: number; label: string }>
  ) => {
    if (pts.length < 2) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetchRoute(
        pts[0], pts[pts.length - 1],
        pts.slice(1, -1).map((p) => ({ lat: p.lat, lng: p.lng }))
      )
      drawRoute(res, pts.map((p) => p.label))
      const r: RouteResult = {
        totalMiles:   res.distanceMiles,
        durationText: res.durationText,
        legs: res.legs.map((leg, i) => ({
          from:  pts[i].label.split(',')[0],
          to:    pts[i + 1].label.split(',')[0],
          miles: leg.miles,
        })),
      }
      setResult(r)
      // ── Send total miles to RPM Calculator ──────────────────────────────
      onMilesReady?.(res.distanceMiles)
    } catch (e) { setError((e as Error).message) }
    finally      { setLoading(false) }
  }, [drawRoute, onMilesReady])

  // ── Sync shared route from ETA tab ────────────────────────────────────────
  useEffect(() => {
    if (!sharedRoute || !mapRef.current) return
    setSaved((s) => ({
      ...s,
      originText: sharedRoute.originName, originLat: sharedRoute.originLat, originLng: sharedRoute.originLng,
      destText:   sharedRoute.destName,   destLat:   sharedRoute.destLat,   destLng:   sharedRoute.destLng,
    }))
    routePoints([
      { lat: sharedRoute.originLat, lng: sharedRoute.originLng, label: sharedRoute.originName },
      { lat: sharedRoute.destLat,   lng: sharedRoute.destLng,   label: sharedRoute.destName },
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedRoute])

  const addStop    = () => setStops((p) => [...p, { id: crypto.randomUUID(), text: '', lat: null, lng: null }])
  const removeStop = (id: string) => setStops((p) => p.filter((s) => s.id !== id))
  const updateStop = (id: string, patch: Partial<StopState>) =>
    setStops((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const handleShowRoute = () => {
    const pts: Array<{ lat: number; lng: number; label: string }> = []
    if (saved.originLat !== null && saved.originLng !== null)
      pts.push({ lat: saved.originLat, lng: saved.originLng, label: saved.originText })
    stops.forEach((s) => {
      if (s.lat !== null && s.lng !== null)
        pts.push({ lat: s.lat, lng: s.lng, label: s.text })
    })
    if (saved.destLat !== null && saved.destLng !== null)
      pts.push({ lat: saved.destLat, lng: saved.destLng, label: saved.destText })
    routePoints(pts)
  }

  const handleSendToETA = () => {
    if (!result || !onSendToETA) return
    const allNames = [saved.originText, ...stops.map((s) => s.text), saved.destText]
    const points = allNames.map((name, i) => ({
      name,
      isOrigin:      i === 0,
      isDestination: i === allNames.length - 1,
    }))
    onSendToETA({
      points,
      legs: result.legs.map((leg) => ({ from: leg.from, to: leg.to, miles: leg.miles })),
      totalMiles: result.totalMiles,
    })
  }

  const allResolved = saved.originLat !== null && saved.destLat !== null &&
    stops.every((s) => s.lat !== null)

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: C.cyan, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Map Tool</h2>
        <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
          Multi-stop routing · miles auto-sent to Profit Calculator · inputs saved locally
        </p>
      </div>

      {/* ── Stop builder ────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 12 }}>
        <StopRow label="Origin" color={C.green} num={1} total={stops.length + 2}>
          <CityInput
            value={saved.originText}
            onChange={(t) => setSaved((s) => ({ ...s, originText: t, originLat: null, originLng: null }))}
            onSelect={(p) => setSaved((s) => ({ ...s, originText: shortName(p), originLat: parseFloat(p.lat), originLng: parseFloat(p.lon) }))}
            placeholder="e.g. Chicago, IL"
          />
        </StopRow>

        {stops.map((stop, i) => (
          <StopRow key={stop.id} label={`Stop ${i + 1}`} color={STOP_COLORS[i % STOP_COLORS.length]} num={i + 2} total={stops.length + 2} onRemove={() => removeStop(stop.id)}>
            <CityInput
              value={stop.text}
              onChange={(t) => updateStop(stop.id, { text: t, lat: null, lng: null })}
              onSelect={(p) => updateStop(stop.id, { text: shortName(p), lat: parseFloat(p.lat), lng: parseFloat(p.lon) })}
              placeholder="e.g. St. Louis, MO"
            />
          </StopRow>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 10px', marginLeft: 14 }}>
          <div style={{ width: 1, height: 20, background: C.border, marginLeft: 3 }} />
          <button onClick={addStop} style={{ background: 'transparent', border: `1px dashed ${C.border}`, color: C.slate, borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            ＋ Add Stop
          </button>
        </div>

        <StopRow label="Destination" color={C.red} num={stops.length + 2} total={stops.length + 2} isLast>
          <CityInput
            value={saved.destText}
            onChange={(t) => setSaved((s) => ({ ...s, destText: t, destLat: null, destLng: null }))}
            onSelect={(p) => setSaved((s) => ({ ...s, destText: shortName(p), destLat: parseFloat(p.lat), destLng: parseFloat(p.lon) }))}
            placeholder="e.g. Dallas, TX"
          />
        </StopRow>

        {/* Action buttons */}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleShowRoute} disabled={!allResolved || loading}
            style={{ padding: '11px 24px', borderRadius: 8, border: `1px solid ${C.cyan}`, background: allResolved && !loading ? `${C.cyan}18` : 'transparent', color: allResolved && !loading ? C.cyan : C.slate, fontSize: 14, cursor: allResolved && !loading ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}>
            {loading ? 'Routing…' : `Show Route${stops.length > 0 ? ` (${stops.length + 2} stops)` : ''}`}
          </button>

          {result && (
            <button onClick={handleSendToETA}
              style={{ padding: '11px 24px', borderRadius: 8, border: `1px solid ${C.green}`, background: `${C.green}18`, color: C.green, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⏱</span> Send to ETA →
            </button>
          )}

          {result && (
            <div style={{ fontSize: 12, color: C.slate, marginLeft: 4 }}>
              <span style={{ color: C.cyan, fontFamily: 'monospace' }}>{result.totalMiles.toLocaleString()} mi</span>
              {' '}→ auto-sent to{' '}
              <span style={{ color: C.green }}>📊 Profit Calc</span>
            </div>
          )}
        </div>
      </div>

      {/* Route summary */}
      {result && (
        <div style={{ ...card, marginBottom: 12, padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: result.legs.length > 1 ? 12 : 0 }}>
            <Stat label="Total Miles"  value={`${result.totalMiles.toLocaleString()} mi`} color={C.cyan} />
            <Stat label="Drive Time"   value={result.durationText} />
            <Stat label="Stops"        value={`${stops.length + 2} points`} />
          </div>
          {result.legs.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              {result.legs.map((leg, i) => (
                <div key={i} style={{ background: C.bgLL, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                  <span style={{ color: C.slate }}>{leg.from} → {leg.to}</span>
                  <span style={{ color: C.cyan, fontFamily: 'monospace', marginLeft: 8 }}>{leg.miles} mi</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ ...card, marginBottom: 12, padding: '0.75rem 1.25rem', color: C.red, fontSize: 13, border: `1px solid ${C.red}40`, background: `${C.red}10` }}>⚠ {error}</div>
      )}

      <div style={{ ...card, padding: 0, overflow: 'hidden', position: 'relative', height: 480 }}>
        <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />
        {!result && !loading && (
          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{ background: `${C.bgL}ee`, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', color: C.slate, fontSize: 12, whiteSpace: 'nowrap' }}>
              Select cities and click Show Route
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StopRow({ label, color, num, total, isLast, onRemove, children }: {
  label: string; color: string; num: number; total: number
  isLast?: boolean; onRemove?: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 2 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 22 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.bg, fontWeight: 700, flexShrink: 0 }}>{num}</div>
        {!isLast && <div style={{ width: 2, flex: 1, background: C.border, marginTop: 4, marginBottom: 4, minHeight: 12 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 8 }}>
        <span style={{ fontSize: 10, color: C.slate, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>{children}</div>
          {onRemove && (
            <button onClick={onRemove} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.red, borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ color: C.slate, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ color: color ?? C.white, fontSize: 14, fontFamily: 'monospace', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
