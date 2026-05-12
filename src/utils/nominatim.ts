// Nominatim — OpenStreetMap's free geocoding API. No API key required.
// Rate limit: 1 request/second. Components debounce searches to stay safe.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/

export interface NominatimPlace {
  place_id: string
  display_name: string
  lat: string
  lon: string
  class: string
  type: string
  importance: number
}

/** Search for places by name. Returns up to 6 results. */
export async function searchPlaces(query: string): Promise<NominatimPlace[]> {
  if (!query.trim() || query.length < 2) return []

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '6',
    addressdetails: '0',
    'accept-language': 'en',
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)

  const data: NominatimPlace[] = await res.json()
  return data
}

/** Returns a compact 2–3 part name from a full display_name */
export function shortName(place: NominatimPlace): string {
  return place.display_name.split(',').slice(0, 3).join(', ').trim()
}

/** Returns just the sub-region info (parts 3–5) for secondary display */
export function subName(place: NominatimPlace): string {
  const parts = place.display_name.split(',')
  return parts.slice(1, 4).join(', ').trim()
}
