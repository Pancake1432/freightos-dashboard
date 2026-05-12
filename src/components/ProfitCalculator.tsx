import { useEffect } from 'react'
import RPMGauge from './RPMGauge'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { C, card, input, label } from '../utils/theme'

interface Saved { miles: string; payout: string }

interface Props {
  /** Miles passed in from the Map Tool route calculation — auto-fills the input */
  mapMiles?: number | null
}

function Row({ lbl, value, color, bold }: { lbl: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.slate, fontSize: 13 }}>{lbl}</span>
      <span style={{ color: color ?? (bold ? C.white : C.slateL), fontSize: 13, fontFamily: 'monospace', fontWeight: bold ? 500 : 400 }}>{value}</span>
    </div>
  )
}

export default function ProfitCalculator({ mapMiles }: Props) {
  const [saved, setSaved] = useLocalStorage<Saved>('freightos_profit', { miles: '', payout: '' })

  // When MapTool sends new miles, auto-fill the field
  useEffect(() => {
    if (mapMiles != null && mapMiles > 0) {
      setSaved((s) => ({ ...s, miles: String(mapMiles) }))
    }
  }, [mapMiles, setSaved])

  const miles  = parseFloat(saved.miles)  || 0
  const payout = parseFloat(saved.payout) || 0
  const rpm    = miles > 0 ? payout / miles : 0

  const alertColor = rpm > 3 ? C.green : rpm > 2.5 ? C.yellow : C.red
  const alertText  =
    rpm > 3    ? '✓ Exceeds profitability threshold'
    : rpm > 2.5 ? '⚠ Marginal — negotiate if possible'
    : rpm > 0   ? '✕ Below minimum rate threshold'
    : ''

  const fromMap = mapMiles != null && mapMiles > 0 && String(mapMiles) === saved.miles

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: C.cyan, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
          Profitability Calculator
        </h2>
        <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
          True Rate Per Mile · inputs auto-saved locally
        </p>
      </div>

      {/* ── Inputs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Total Miles */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={label}>Total Miles (loaded + deadhead)</span>
            {fromMap && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: `${C.cyan}18`, border: `1px solid ${C.cyan}40`,
                color: C.cyan, letterSpacing: '0.04em',
              }}>
                🗺 from map
              </span>
            )}
          </div>
          <input
            type="number"
            value={saved.miles}
            onChange={(e) => setSaved((s) => ({ ...s, miles: e.target.value }))}
            placeholder="e.g. 525"
            style={input}
            min="0"
          />
        </div>

        {/* Payout */}
        <div>
          <span style={label}>Gross Payout ($)</span>
          <input
            type="number"
            value={saved.payout}
            onChange={(e) => setSaved((s) => ({ ...s, payout: e.target.value }))}
            placeholder="e.g. 1800"
            style={input}
            min="0"
          />
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Gauge card */}
        <div style={card}>
          <RPMGauge rpm={rpm} />
          {alertText && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginTop: 8,
              background: `${alertColor}18`, border: `1px solid ${alertColor}50`,
              color: alertColor, fontSize: 13, fontWeight: 500, textAlign: 'center',
            }}>
              {alertText}
            </div>
          )}
        </div>

        {/* Summary card */}
        <div style={card}>
          <p style={{ ...label, marginBottom: 12 }}>Load Summary</p>

          <Row lbl="Total Miles"  value={miles  > 0 ? `${miles.toLocaleString()} mi` : '—'} bold />
          <Row lbl="Gross Payout" value={payout > 0 ? `$${payout.toLocaleString()}`  : '—'} />

          {/* True RPM hero */}
          <div style={{
            padding: '16px 0 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ color: C.slateL, fontSize: 15, fontWeight: 500 }}>True RPM</span>
            <span style={{
              fontSize: 30, fontWeight: 500, fontFamily: 'monospace',
              color: rpm > 3 ? C.green : rpm > 2.5 ? C.yellow : rpm > 0 ? C.red : C.slate,
            }}>
              {rpm > 0 ? `$${rpm.toFixed(3)}` : '—'}
            </span>
          </div>

          {/* Earnings note */}
          {rpm > 0 && (
            <div style={{ padding: '12px 0 4px', color: C.slateL, fontSize: 13 }}>
              You earn{' '}
              <span style={{ color: C.white, fontFamily: 'monospace', fontWeight: 500 }}>
                ${rpm.toFixed(3)}
              </span>
              {' '}per mile driven.
            </div>
          )}

          {/* Threshold legend */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              ['> $3.00',       'Excellent', C.green],
              ['$2.50 – $3.00', 'Marginal',  C.yellow],
              ['< $2.50',       'Poor',      C.red],
            ] as const).map(([range, lbl, color]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, opacity: 0.85, flexShrink: 0 }} />
                <span style={{ color: C.slateL }}>{lbl}</span>
                <span style={{ color, fontFamily: 'monospace', marginLeft: 'auto' }}>{range}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: C.slate, opacity: 0.55 }}>
            💾 Saved locally — survives page refresh
          </div>
        </div>
      </div>
    </div>
  )
}
