import { C } from '../utils/theme'

type View = 'map' | 'profit' | 'eta' | 'zones'

const NAV: Array<{ id: View; emoji: string; label: string }> = [
  { id: 'map',    emoji: '🗺️',  label: 'Map Tool'     },
  { id: 'profit', emoji: '📊',  label: 'Profit Calc'  },
  { id: 'eta',    emoji: '⏱️',  label: 'ETA Predictor'},
  { id: 'zones',  emoji: '🗂️',  label: 'Zone Map'     },
]

export default function Sidebar({
  active,
  setActive,
}: {
  active: View
  setActive: (v: View) => void
}) {
  return (
    <nav
      style={{
        width: 215,
        background: C.bgL,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: `${C.cyan}20`, border: `1px solid ${C.cyan}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}
          >
            🚚
          </div>
          <div>
            <div style={{ color: C.white, fontSize: 15, fontWeight: 500 }}>FreightOS</div>
            <div style={{ color: C.slate, fontSize: 10 }}>Driver Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ padding: '1rem 0.75rem', flex: 1 }}>
        <div
          style={{
            color: C.slate, fontSize: 10, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '4px 12px 10px',
          }}
        >
          Navigation
        </div>

        {NAV.map(({ id, emoji, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '11px 14px', borderRadius: 8,
              border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left',
              marginBottom: 2, fontFamily: 'inherit',
              background: active === id ? `${C.cyan}18` : 'transparent',
              color:      active === id ? C.cyan : C.slate,
              borderLeft: `2px solid ${active === id ? C.cyan : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${C.border}` }}>
        <div style={{ color: C.slate, fontSize: 10, marginBottom: 2 }}>100% Free · No API Keys</div>
        <div style={{ color: C.slate, fontSize: 10, opacity: 0.5 }}>OSM · OSRM · Leaflet · D3</div>
      </div>
    </nav>
  )
}
