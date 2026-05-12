import { useState, useEffect } from 'react'
import CityInput from './CityInput'
import { shortName } from '../utils/nominatim'
import { fetchRoute, haversineMiles, OSRMResult } from '../utils/osrm'
import { calcHOS, calcMultiStopETAs, StopETA } from '../utils/hos'
import { addHoursToISO, fmtHours, fmtTime, fmtDate, fmtFull, nowISO } from '../utils/time'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { SharedRoute, MultiStopRouteData } from '../types'
import { C, card, label } from '../utils/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedETA {
  originText: string; originLat: number | null; originLng: number | null
  destText:   string; destLat:   number | null; destLng:   number | null
  departure:  string
}

interface Props {
  multiStopRoute?:   MultiStopRouteData | null
  onClearMultiStop?: () => void
  onRouteCalculated?: (r: SharedRoute) => void
}

function Row({ lbl, value, color, bold }: { lbl: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.slate, fontSize: 13 }}>{lbl}</span>
      <span style={{ color: color ?? (bold ? C.white : C.slateL), fontSize: 13, fontFamily: 'monospace', fontWeight: bold ? 500 : 400 }}>{value}</span>
    </div>
  )
}

// ─── Dwell stepper control ────────────────────────────────────────────────────

function DwellStepper({
  label: lbl, value, onChange, min = 0, max = 12,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div>
      <span style={{ fontSize: 11, color: C.slate, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>{lbl}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onChange(Math.max(min, +(value - 0.5).toFixed(1)))}
          style={{ width: 34, height: 42, border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgLL, color: C.white, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>−</button>
        <div style={{ background: C.bgLL, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', color: C.cyan, fontSize: 14, minWidth: 52, textAlign: 'center' }}>
          {value}h
        </div>
        <button onClick={() => onChange(Math.min(max, +(value + 0.5).toFixed(1)))}
          style={{ width: 34, height: 42, border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgLL, color: C.white, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>＋</button>
      </div>
    </div>
  )
}

// ─── Multi-stop timeline view ─────────────────────────────────────────────────

function MultiStopView({
  route, departure, setDeparture, onClear,
}: {
  route:       MultiStopRouteData
  departure:   string
  setDeparture: (v: string) => void
  onClear:     () => void
}) {
  const [stopDwell, setStopDwell] = useState(3)   // intermediate pickup/drop dwell
  const [destDwell, setDestDwell] = useState(3)   // final destination dwell

  const stopETAs: StopETA[] = calcMultiStopETAs(
    route.points, route.legs, departure, stopDwell, destDwell
  )

  const origin      = stopETAs[0]
  const destination = stopETAs[stopETAs.length - 1]
  const hasIntermediates = route.points.length > 2
  const totalElapsed = stopETAs.reduce((sum, s) => sum + s.legElapsed + s.dwellHours, 0)
  const totalBreaks  = stopETAs.reduce((sum, s) => sum + s.legBreaks, 0)
  const totalResets  = stopETAs.reduce((sum, s) => sum + s.legResets, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: C.cyan, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Multi-Stop ETA</h2>
          <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
            {route.points[0].name.split(',')[0]} → {route.points[route.points.length - 1].name.split(',')[0]}
            &nbsp;·&nbsp;{route.legs.length} legs · {route.totalMiles.toLocaleString()} mi total
          </p>
        </div>
        <button onClick={onClear} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.slate, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Back to simple mode
        </button>
      </div>

      {/* ── Controls ── */}
      <div style={{ ...card, marginBottom: 16, display: 'grid', gridTemplateColumns: `1fr ${hasIntermediates ? 'auto auto' : 'auto'}`, gap: 16, alignItems: 'end' }}>
        <div>
          <span style={{ fontSize: 11, color: C.slate, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Departure Date &amp; Time</span>
          <input type="datetime-local" value={departure} onChange={(e) => setDeparture(e.target.value)}
            style={{ background: C.bgLL, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'inherit', colorScheme: 'dark', boxSizing: 'border-box' }} />
        </div>

        {/* Only show stop dwell if there are intermediate stops */}
        {hasIntermediates && (
          <DwellStepper label="Stop dwell (pickup)" value={stopDwell} onChange={setStopDwell} min={0.5} />
        )}

        {/* Destination dwell always shown */}
        <DwellStepper label="Destination dwell (drop)" value={destDwell} onChange={setDestDwell} min={0} />
      </div>

      {/* ── Stop-by-stop timeline + summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Timeline */}
        <div style={card}>
          {stopETAs.map((stop, i) => {
            const isOrig  = stop.isOrigin
            const isDest  = stop.isDestination
            const dotColor = isOrig ? C.green : isDest ? C.red : C.cyan
            const warnColor = stop.hosWarning === 'reset' ? C.red : stop.hosWarning === 'break' ? C.yellow : null
            const nextLeg   = !isDest && route.legs[i]
            const nextStop  = !isDest ? stopETAs[i + 1] : null

            return (
              <div key={i}>
                {/* ── Stop card ── */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: dotColor, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: `0 0 10px ${dotColor}50` }}>{i + 1}</div>
                    {!isDest && <div style={{ width: 2, flex: 1, background: C.border, minHeight: 12, marginTop: 4 }} />}
                  </div>

                  <div style={{ flex: 1, paddingBottom: isDest ? 0 : 4 }}>
                    {/* Stop header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <span style={{ fontSize: 10, color: dotColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                          {isOrig ? 'Origin' : isDest ? 'Destination (Drop)' : `Stop ${i}`}
                        </span>
                        <div style={{ color: C.white, fontSize: 14, fontWeight: 500 }}>{stop.name.split(',')[0]}</div>
                        <div style={{ color: C.slate, fontSize: 11 }}>{stop.name.split(',').slice(1, 3).join(',').trim()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {isOrig ? 'Departs' : 'Arrives'}
                        </div>
                        <div style={{ color: isOrig ? C.cyan : dotColor, fontFamily: 'monospace', fontSize: 18, fontWeight: 500 }}>
                          {isOrig
                            ? (stop.departureDate ? fmtTime(stop.departureDate) : '—')
                            : (stop.arrivalDate   ? fmtTime(stop.arrivalDate)   : '—')}
                        </div>
                        <div style={{ color: C.slateL, fontSize: 12 }}>
                          {isOrig
                            ? (stop.departureDate ? fmtDate(stop.departureDate) : '—')
                            : (stop.arrivalDate   ? fmtDate(stop.arrivalDate)   : '—')}
                        </div>
                      </div>
                    </div>

                    {/* ── Dwell box for intermediate stops ── */}
                    {!isOrig && !isDest && stop.arrivalDate && stop.departureDate && (
                      <div style={{ background: C.bgLL, borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: C.slate, fontSize: 11 }}>Dwell: </span>
                          <span style={{ color: C.yellow, fontFamily: 'monospace', fontSize: 12 }}>{stop.dwellHours}h</span>
                          <span style={{ color: C.slate, fontSize: 11 }}> (pickup)</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Departs</div>
                          <div style={{ color: C.cyan, fontFamily: 'monospace', fontSize: 14, fontWeight: 500 }}>{fmtTime(stop.departureDate)}</div>
                          <div style={{ color: C.slateL, fontSize: 11 }}>{fmtDate(stop.departureDate)}</div>
                        </div>
                      </div>
                    )}

                    {/* ── Dwell + Ready time for DESTINATION ── */}
                    {isDest && stop.arrivalDate && stop.dwellHours > 0 && stop.departureDate && (
                      <div style={{
                        background: `${C.green}10`, border: `1px solid ${C.green}30`,
                        borderRadius: 8, padding: '10px 14px', marginTop: 8,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ color: C.slate, fontSize: 11, marginBottom: 2 }}>
                            Unloading / drop dwell:
                            <span style={{ color: C.yellow, fontFamily: 'monospace', marginLeft: 6 }}>{stop.dwellHours}h</span>
                          </div>
                          <div style={{ color: C.slate, fontSize: 11 }}>Driver ready after unloading</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: C.green, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Ready</div>
                          <div style={{ color: C.green, fontFamily: 'monospace', fontSize: 20, fontWeight: 600 }}>
                            {fmtTime(stop.departureDate)}
                          </div>
                          <div style={{ color: C.green, fontSize: 12, opacity: 0.8 }}>
                            {fmtDate(stop.departureDate)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Leg connector ── */}
                {!isDest && nextLeg && nextStop && (
                  <div style={{ display: 'flex', gap: 14, margin: '4px 0' }}>
                    <div style={{ width: 28, flexShrink: 0 }} />
                    <div style={{
                      flex: 1, padding: '8px 12px',
                      background: warnColor ? `${warnColor}10` : C.bgLL,
                      borderRadius: 8, border: `1px solid ${warnColor ? `${warnColor}40` : C.border}`,
                      marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>
                          <span style={{ color: C.slate, fontSize: 11 }}>Leg {i + 1}: </span>
                          <span style={{ color: C.cyan, fontFamily: 'monospace', fontSize: 12 }}>{nextLeg.miles} mi</span>
                        </span>
                        <span>
                          <span style={{ color: C.slate, fontSize: 11 }}>Drive: </span>
                          <span style={{ color: C.slateL, fontFamily: 'monospace', fontSize: 12 }}>{fmtHours(nextStop.legElapsed)}</span>
                        </span>
                      </div>
                      {nextStop.hosWarning !== 'none' && (
                        <span style={{ color: warnColor!, fontSize: 11, fontWeight: 500 }}>
                          {nextStop.hosWarning === 'reset'
                            ? `⚠ ${nextStop.legResets}× 10-hr HOS reset`
                            : `⚠ ${nextStop.legBreaks}× 30-min break`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card}>
            <p style={{ ...label, marginBottom: 12 }}>Trip Summary</p>
            <Row lbl="Total Distance"    value={`${route.totalMiles.toLocaleString()} mi`} />
            <Row lbl="Stops"             value={`${route.points.length}`} />
            {hasIntermediates && <Row lbl="Stop Dwell (each)" value={`${stopDwell}h`} color={C.yellow} />}
            <Row lbl="Destination Dwell" value={destDwell > 0 ? `${destDwell}h` : 'None set'} color={destDwell > 0 ? C.yellow : C.slate} />
            <Row lbl="30-min Breaks"     value={totalBreaks > 0 ? `${totalBreaks} required` : 'None needed'} color={totalBreaks > 0 ? C.yellow : C.green} />
            <Row lbl="10-hr HOS Resets"  value={totalResets > 0 ? `${totalResets} required` : 'None needed'} color={totalResets > 0 ? C.red : C.green} />
            <Row lbl="Total Elapsed"     value={fmtHours(totalElapsed)} bold />

            {destination.arrivalDate && (
              <div style={{ marginTop: 14 }}>
                <div style={{ color: C.slate, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Arrives Destination</div>
                <div style={{ color: C.cyan, fontFamily: 'monospace', fontSize: 24, fontWeight: 500 }}>{fmtTime(destination.arrivalDate)}</div>
                <div style={{ color: C.slateL, fontSize: 13, marginTop: 2 }}>{fmtDate(destination.arrivalDate)}</div>
              </div>
            )}

            {/* Ready time callout */}
            {destination.departureDate && destDwell > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: `${C.green}12`, border: `1px solid ${C.green}40` }}>
                <div style={{ color: C.green, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>Driver Ready</div>
                <div style={{ color: C.green, fontFamily: 'monospace', fontSize: 22, fontWeight: 600 }}>{fmtTime(destination.departureDate)}</div>
                <div style={{ color: C.green, fontSize: 12, opacity: 0.8 }}>{fmtDate(destination.departureDate)}</div>
                <div style={{ color: C.slate, fontSize: 11, marginTop: 4 }}>After {destDwell}h unloading</div>
              </div>
            )}
          </div>

          <div style={{ ...card, padding: '1rem' }}>
            <p style={{ color: C.cyan, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>HOS Rules Applied</p>
            {[
              'Max 11 hrs driving per on-duty period',
              '30-min break after 8 hrs driving',
              '10-hr off-duty reset after 11-hr limit',
              `Stop dwell (${stopDwell}h) resets 30-min break`,
              'Speed assumption: 55 mph average',
            ].map((r) => (
              <div key={r} style={{ display: 'flex', gap: 6, marginBottom: 5, fontSize: 11, color: C.slate }}>
                <span style={{ color: C.cyan, flexShrink: 0 }}>•</span>{r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Simple city-pair view ────────────────────────────────────────────────────

function SimpleView({ onRouteCalculated }: { onRouteCalculated?: (r: SharedRoute) => void }) {
  const [saved, setSaved] = useLocalStorage<SavedETA>('freightos_eta', {
    originText: '', originLat: null, originLng: null,
    destText:   '', destLat:   null, destLng:   null,
    departure:  nowISO(),
  })

  const [osrmResult, setOsrmResult] = useState<OSRMResult | null>(null)
  const [miles,      setMiles]      = useState<number | null>(null)
  const [distSource, setDistSource] = useState<'osrm' | 'estimate' | null>(null)
  const [fetching,   setFetching]   = useState(false)
  const [distErr,    setDistErr]    = useState<string | null>(null)

  useEffect(() => {
    if (saved.originLat === null || saved.destLat === null) return
    const oLat = saved.originLat!, oLng = saved.originLng!
    const dLat = saved.destLat!,   dLng = saved.destLng!
    setFetching(true); setDistErr(null); setOsrmResult(null); setMiles(null); setDistSource(null)
    fetchRoute({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng })
      .then((r) => { setOsrmResult(r); setMiles(r.distanceMiles); setDistSource('osrm'); onRouteCalculated?.({ originName: saved.originText, destName: saved.destText, originLat: oLat, originLng: oLng, destLat: dLat, destLng: dLng, miles: r.distanceMiles }) })
      .catch((e: Error) => { const est = haversineMiles(oLat, oLng, dLat, dLng); setMiles(est); setDistSource('estimate'); setDistErr(`OSRM unavailable — using estimate (${e.message})`) })
      .finally(() => setFetching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.originLat, saved.originLng, saved.destLat, saved.destLng])

  const hos         = miles !== null ? calcHOS(miles) : null
  const arrivalDate = hos ? addHoursToISO(saved.departure, hos.elapsed) : null
  const departDate  = new Date(saved.departure)
  const stColor = !hos ? C.slate : hos.resets > 0 ? C.red : hos.breaks > 0 ? C.yellow : C.green
  const stText  = !hos ? '' : hos.resets > 0 ? 'HOS Reset Required — Plan Overnight' : hos.breaks > 0 ? 'On Schedule — Break Required' : 'On Time — No stops needed'

  const timeline = [
    { lbl: 'Depart',  time: fmtTime(departDate), date: fmtDate(departDate), color: C.cyan },
    ...(hos && hos.breaks > 0 ? [{ lbl: `${hos.breaks}× 30-min Break`, time: 'En route', date: 'FMCSA required', color: C.yellow }] : []),
    ...(hos && hos.resets > 0 ? [{ lbl: `${hos.resets}× 10-hr Reset`,  time: 'Overnight', date: 'Off-duty', color: C.red }] : []),
    ...(hos && arrivalDate    ? [{ lbl: 'Arrive', time: fmtTime(arrivalDate), date: fmtDate(arrivalDate), color: C.green }] : []),
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: C.cyan, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>HOS-Aware ETA Predictor</h2>
        <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
          City autocomplete · distance via OSRM · inputs saved locally
          &nbsp;· or use <strong style={{ color: C.cyan }}>Send to ETA →</strong> from the Map Tool for multi-stop ETAs
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <CityInput label="Origin City" value={saved.originText} onChange={(t) => setSaved((s) => ({ ...s, originText: t, originLat: null, originLng: null }))} onSelect={(p) => setSaved((s) => ({ ...s, originText: shortName(p), originLat: parseFloat(p.lat), originLng: parseFloat(p.lon) }))} placeholder="e.g. Chicago, IL" />
        <CityInput label="Destination City" value={saved.destText} onChange={(t) => setSaved((s) => ({ ...s, destText: t, destLat: null, destLng: null }))} onSelect={(p) => setSaved((s) => ({ ...s, destText: shortName(p), destLat: parseFloat(p.lat), destLng: parseFloat(p.lon) }))} placeholder="e.g. Dallas, TX" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <span style={label}>Departure Date &amp; Time</span>
          <input type="datetime-local" value={saved.departure} onChange={(e) => setSaved((s) => ({ ...s, departure: e.target.value }))} style={{ background: C.bgLL, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'inherit', colorScheme: 'dark', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={label}>Distance (auto-calculated)</span>
          <div style={{ background: C.bgLL, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            {fetching ? <span style={{ color: C.slate }}>Calculating…</span>
              : miles !== null ? (<><span style={{ color: C.cyan, fontFamily: 'monospace', fontWeight: 500 }}>{miles.toLocaleString()} mi</span><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{osrmResult && <span style={{ color: C.slate, fontSize: 12 }}>{osrmResult.durationText} drive</span>}<span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: distSource === 'osrm' ? `${C.green}20` : `${C.yellow}20`, color: distSource === 'osrm' ? C.green : C.yellow, border: `1px solid ${distSource === 'osrm' ? C.green : C.yellow}40` }}>{distSource === 'osrm' ? 'OSRM' : 'Est.'}</span></div></>)
              : <span style={{ color: C.slate }}>Select both cities above</span>}
          </div>
          {distErr && <div style={{ marginTop: 4, fontSize: 11, color: C.yellow }}>{distErr}</div>}
        </div>
      </div>

      {hos && arrivalDate ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ ...card, textAlign: 'center', padding: '1.75rem 1.5rem' }}>
            <div style={{ color: C.slate, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Estimated Arrival</div>
            <div style={{ fontSize: 52, fontWeight: 500, fontFamily: 'monospace', color: C.cyan, lineHeight: 1, marginBottom: 4 }}>{fmtTime(arrivalDate)}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: C.slateL, marginBottom: 4 }}>{fmtDate(arrivalDate)}</div>
            {saved.originText && saved.destText && <div style={{ color: C.slate, fontSize: 12, marginBottom: 16 }}>{saved.originText.split(',')[0]} → {saved.destText.split(',')[0]}</div>}
            <div style={{ padding: '11px 16px', borderRadius: 10, background: `${stColor}15`, border: `1px solid ${stColor}60`, color: stColor, fontSize: 13, fontWeight: 500, marginBottom: 18 }}>{stText}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: C.slate, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Timeline</div>
              {timeline.map(({ lbl, time, date, color }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div style={{ color, fontSize: 12, fontWeight: 500 }}>{lbl}</div><div style={{ color: C.slate, fontSize: 11 }}>{date}</div></div>
                  <span style={{ color, fontFamily: 'monospace', fontSize: 13 }}>{time}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <p style={{ ...label, marginBottom: 12 }}>HOS Breakdown</p>
            <Row lbl="Distance" value={`${miles!.toLocaleString()} mi`} />
            <Row lbl="Source" value={distSource === 'osrm' ? 'OSRM road routing' : 'Haversine estimate'} color={distSource === 'osrm' ? C.green : C.yellow} />
            <Row lbl="Speed (avg)" value="55 mph" />
            {osrmResult && <Row lbl="Real-world drive" value={osrmResult.durationText} />}
            <Row lbl="Pure Drive Time" value={fmtHours(hos.pure)} />
            <Row lbl="30-min Breaks" value={hos.breaks > 0 ? `${hos.breaks} required` : 'None needed'} color={hos.breaks > 0 ? C.yellow : C.green} />
            <Row lbl="10-hr HOS Resets" value={hos.resets > 0 ? `${hos.resets} required` : 'None needed'} color={hos.resets > 0 ? C.red : C.green} />
            <Row lbl="Total Transit" value={fmtHours(hos.elapsed)} bold />
            <Row lbl="Departure" value={fmtFull(departDate)} />
            <Row lbl="Arrival" value={fmtFull(arrivalDate)} color={C.cyan} bold />
            <div style={{ marginTop: 12, fontSize: 11, color: C.slate, opacity: 0.55 }}>💾 Saved locally — won't be lost on refresh</div>
          </div>
        </div>
      ) : !fetching && (
        <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⏱️</div>
          <div style={{ color: C.slate, fontSize: 14 }}>Select origin and destination cities to calculate ETA</div>
          <div style={{ color: C.slate, fontSize: 12, marginTop: 8, opacity: 0.6 }}>
            Or use <strong style={{ color: C.cyan }}>Send to ETA →</strong> from the Map Tool for multi-stop ETAs with per-stop times
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ETAPredictor({ multiStopRoute, onClearMultiStop, onRouteCalculated }: Props) {
  const [saved, setSaved] = useLocalStorage<{ departure: string }>('freightos_eta_dep', { departure: nowISO() })

  if (multiStopRoute) {
    return (
      <MultiStopView
        route={multiStopRoute}
        departure={saved.departure}
        setDeparture={(d) => setSaved({ departure: d })}
        onClear={onClearMultiStop ?? (() => {})}
      />
    )
  }
  return <SimpleView onRouteCalculated={onRouteCalculated} />
}
