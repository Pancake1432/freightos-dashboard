// ─── Single-route HOS ────────────────────────────────────────────────────────

export interface HOSResult {
  elapsed: number
  pure:    number
  breaks:  number
  resets:  number
}

export function calcHOS(miles: number): HOSResult | null {
  if (!miles || miles <= 0) return null
  const { elapsed, pure, breaks, resets } = _runLegs([miles], 0)
  return { elapsed, pure, breaks, resets }
}

// ─── Multi-stop HOS ──────────────────────────────────────────────────────────

export interface StopETA {
  name:            string
  isOrigin:        boolean
  isDestination:   boolean
  legMiles:        number
  legDriveHours:   number
  legElapsed:      number
  legBreaks:       number
  legResets:       number
  arrivalDate:     Date | null   // null for origin
  dwellHours:      number        // 0 only if no dwell set
  departureDate:   Date | null   // for destination: "ready time"
  cumulativeMiles: number
  hosWarning:      'none' | 'break' | 'reset'
}

/**
 * Calculate per-stop ETAs for a multi-stop route.
 *
 * @param dwellHoursPerStop  - dwell at each INTERMEDIATE stop (pickup/delivery)
 * @param destDwellHours     - dwell at the DESTINATION (final drop/unloading)
 *
 * HOS rules applied:
 *   - 11 h max driving per on-duty period
 *   - 30-min break after 8 h driving
 *   - 10-hr off-duty reset after 11-h limit
 *   - dwell ≥ 30 min resets the 30-min break counter
 *   - dwell ≥ 10 h resets the full 11-h driving counter
 */
export function calcMultiStopETAs(
  points:           Array<{ name: string; isOrigin: boolean; isDestination: boolean }>,
  legs:             Array<{ miles: number }>,
  departureISO:     string,
  dwellHoursPerStop: number = 3,
  destDwellHours:    number = 0
): StopETA[] {
  const results: StopETA[] = []
  let sinceBreak  = 0
  let today       = 0
  let currentTime = new Date(departureISO)
  let cumMiles    = 0

  // Origin — no driving leg arriving here
  results.push({
    name: points[0].name, isOrigin: true, isDestination: false,
    legMiles: 0, legDriveHours: 0, legElapsed: 0, legBreaks: 0, legResets: 0,
    arrivalDate: null, dwellHours: 0, departureDate: currentTime,
    cumulativeMiles: 0, hosWarning: 'none',
  })

  for (let i = 0; i < legs.length; i++) {
    const legMiles = legs[i].miles
    const point    = points[i + 1]
    const isLast   = i === legs.length - 1
    cumMiles      += legMiles

    // ── Simulate this driving leg ─────────────────────────────────────────
    let remaining = legMiles, legElapsed = 0, legBreaks = 0, legResets = 0

    while (remaining > 0.01) {
      const hCanDrive = Math.min(8 - sinceBreak, 11 - today)
      const dist      = hCanDrive * 55

      if (dist >= remaining) {
        const t = remaining / 55
        legElapsed += t; sinceBreak += t; today += t; remaining = 0
      } else {
        legElapsed += hCanDrive; sinceBreak += hCanDrive; today += hCanDrive; remaining -= dist
        if (today >= 11) { legElapsed += 10; today = 0; sinceBreak = 0; legResets++ }
        else             { legElapsed += 0.5; sinceBreak = 0; legBreaks++ }
      }
    }

    const arrivalDate = new Date(currentTime.getTime() + legElapsed * 3_600_000)

    // ── Dwell at this stop ────────────────────────────────────────────────
    // Intermediate stops: use dwellHoursPerStop
    // Final destination:  use destDwellHours (the actual drop/unloading dwell)
    const dwell = isLast ? destDwellHours : dwellHoursPerStop
    const hosWarning: StopETA['hosWarning'] = legResets > 0 ? 'reset' : legBreaks > 0 ? 'break' : 'none'

    // Apply HOS effects of dwell
    if (dwell >= 10)  { today = 0; sinceBreak = 0 }
    else if (dwell >= 0.5) { sinceBreak = 0 }

    // departureDate = "ready time" for destination, or actual departure for intermediate
    const departureDate = dwell > 0
      ? new Date(arrivalDate.getTime() + dwell * 3_600_000)
      : null

    results.push({
      name: point.name, isOrigin: false, isDestination: isLast,
      legMiles, legDriveHours: legMiles / 55, legElapsed,
      legBreaks, legResets, arrivalDate, dwellHours: dwell,
      departureDate, cumulativeMiles: cumMiles, hosWarning,
    })

    if (!isLast && departureDate) currentTime = departureDate
    else if (!isLast) currentTime = arrivalDate
  }

  return results
}

// ─── Internal helper ─────────────────────────────────────────────────────────

function _runLegs(legsMiles: number[], dwellH: number): HOSResult {
  let sinceBreak = 0, today = 0, elapsed = 0, pure = 0, breaks = 0, resets = 0
  for (let li = 0; li < legsMiles.length; li++) {
    let remaining = legsMiles[li]
    pure += remaining / 55
    while (remaining > 0.01) {
      const hD = Math.min(8 - sinceBreak, 11 - today), d = hD * 55
      if (d >= remaining) {
        const t = remaining / 55; elapsed += t; sinceBreak += t; today += t; remaining = 0
      } else {
        elapsed += hD; sinceBreak += hD; today += hD; remaining -= d
        if (today >= 11) { elapsed += 10; today = 0; sinceBreak = 0; resets++ }
        else             { elapsed += 0.5; sinceBreak = 0; breaks++ }
      }
    }
    if (li < legsMiles.length - 1) {
      elapsed += dwellH
      if (dwellH >= 10) { today = 0; sinceBreak = 0 } else if (dwellH >= 0.5) { sinceBreak = 0 }
    }
  }
  return { elapsed, pure, breaks, resets }
}
