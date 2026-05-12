// OSRM — Open Source Routing Machine public demo. No API key required.
// Supports multiple waypoints (multi-stop routes).

export interface OSRMResult {
  distanceMiles:   number
  distanceMeters:  number
  durationSecs:    number
  durationText:    string
  geometry:        GeoJSON.LineString
  waypointCoords:  [number, number][]   // [lat, lng] per waypoint
  legs:            OSRMLeg[]
}

export interface OSRMLeg {
  miles:        number
  meters:       number
  durationSecs: number
}

const BASE    = 'https://router.project-osrm.org/route/v1/driving'
const TIMEOUT = 12_000

/** Fetch a driving route. Pass intermediate waypoints in the `via` array. */
export async function fetchRoute(
  origin: { lat: number; lng: number },
  dest:   { lat: number; lng: number },
  via:    Array<{ lat: number; lng: number }> = []
): Promise<OSRMResult> {
  const allPoints = [origin, ...via, dest]
  const coordStr  = allPoints.map((p) => `${p.lng},${p.lat}`).join(';')
  const url       = `${BASE}/${coordStr}?overview=full&geometries=geojson&steps=false`

  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)

  let res: Response
  try {
    res = await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)

  const data = await res.json() as {
    code: string; message?: string
    routes: Array<{
      distance: number; duration: number
      geometry: GeoJSON.LineString
      legs: Array<{ distance: number; duration: number }>
    }>
    waypoints: Array<{ location: [number, number]; name: string }>
  }

  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.message ?? data.code}`)

  const route = data.routes[0]

  const legs: OSRMLeg[] = route.legs.map((leg) => ({
    miles:        Math.round(leg.distance / 1609.344),
    meters:       Math.round(leg.distance),
    durationSecs: Math.round(leg.duration),
  }))

  return {
    distanceMiles:  Math.round(route.distance / 1609.344),
    distanceMeters: Math.round(route.distance),
    durationSecs:   Math.round(route.duration),
    durationText:   fmtDuration(route.duration),
    geometry:       route.geometry,
    waypointCoords: data.waypoints.map((wp) => [wp.location[1], wp.location[0]]),
    legs,
  }
}

/** Haversine straight-line estimate × 1.25 road factor — fallback when OSRM is down */
export function haversineMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R    = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
               Math.sin(dLng / 2) ** 2
  return Math.round(3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25)
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
