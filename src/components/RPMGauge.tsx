import { C } from '../utils/theme'

export default function RPMGauge({ rpm }: { rpm: number }) {
  const cx = 150, cy = 130, r = 95, max = 5
  const toRad = (d: number) => (d * Math.PI) / 180

  const arc = (a1: number, a2: number, rad = r): string => {
    const p1 = { x: cx + rad * Math.cos(toRad(a1)), y: cy - rad * Math.sin(toRad(a1)) }
    const p2 = { x: cx + rad * Math.cos(toRad(a2)), y: cy - rad * Math.sin(toRad(a2)) }
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${rad} ${rad} 0 ${(a1 - a2) > 180 ? 1 : 0} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  const v   = Math.max(0, Math.min(isNaN(rpm) ? 0 : rpm, max))
  const na  = 180 - (v / max) * 180
  const col = v > 3 ? C.green : v > 2.5 ? C.yellow : C.red
  const lbl = v > 3 ? '▲ PROFITABLE' : v > 2.5 ? '► MARGINAL' : v > 0 ? '▼ POOR RATE' : ''

  const tipX = cx + (r - 12) * Math.cos(toRad(na))
  const tipY = cy - (r - 12) * Math.sin(toRad(na))

  return (
    // viewBox height 215 — ensures status label at y=206 is fully visible (was 200, clipping text)
    <svg width="100%" viewBox="0 0 300 215">
      {/* Track */}
      <path d={arc(180, 0)} fill="none" stroke={C.border} strokeWidth="14" strokeLinecap="round" />

      {/* Zone fills */}
      <path d={arc(180, 90)} fill="none" stroke={C.red}    strokeWidth="14" opacity="0.22" />
      <path d={arc(90,  72)} fill="none" stroke={C.yellow} strokeWidth="14" opacity="0.22" />
      <path d={arc(72,   0)} fill="none" stroke={C.green}  strokeWidth="14" opacity="0.22" />

      {/* Active fill */}
      {v > 0 && (
        <path d={arc(180, Math.max(na, 0.01))}
              fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" opacity="0.92" />
      )}

      {/* Zone boundary ticks */}
      {[0, 2.5, 3, 5].map((val) => {
        const a = 180 - (val / max) * 180
        const cos = Math.cos(toRad(a)), sin = Math.sin(toRad(a))
        return (
          <line key={val}
            x1={cx + (r - 12) * cos} y1={cy - (r - 12) * sin}
            x2={cx + (r + 6)  * cos} y2={cy - (r + 6)  * sin}
            stroke={C.slateL} strokeWidth="1.5" opacity="0.35" />
        )
      })}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={tipX} y2={tipY} stroke={C.white} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="9"   fill={v > 0 ? col : C.slate} />
      <circle cx={cx} cy={cy} r="3.5" fill={C.white} />

      {/* Zone corner labels — outside the arc */}
      <text x="36"  y={cy + 17} textAnchor="middle" fill={C.red}    fontSize="10" opacity="0.7">$0</text>
      <text x={cx}  y="26"      textAnchor="middle" fill={C.yellow} fontSize="10" opacity="0.7">$2.50</text>
      <text x="264" y={cy + 17} textAnchor="middle" fill={C.green}  fontSize="10" opacity="0.7">$5+</text>

      {/* Value display — below baseline, needle cannot reach */}
      <text x={cx} y={cy + 40} textAnchor="middle"
            fill={v > 0 ? col : C.slate} fontSize="34" fontWeight="500" fontFamily="monospace">
        ${v.toFixed(2)}
      </text>
      <text x={cx} y={cy + 57} textAnchor="middle" fill={C.slate} fontSize="10" letterSpacing="3">
        TRUE RPM
      </text>

      {/* Status label — was clipped at old viewBox height 200, now visible at 215 */}
      {v > 0 && (
        <text x={cx} y={cy + 78} textAnchor="middle" fill={col} fontSize="12" fontWeight="600" letterSpacing="1.5">
          {lbl}
        </text>
      )}
    </svg>
  )
}
