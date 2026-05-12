import { C, card } from '../utils/theme'

/**
 * Embeds your usa-zone-map.html (public/zone-map.html) directly inside the
 * FreightOS dashboard as a full-height iframe.
 *
 * Vite serves everything in /public at the root, so the iframe src resolves
 * correctly in both dev (/) and GitHub Pages (/freightos-dashboard/).
 */
export default function ZoneTool() {
  // import.meta.env.BASE_URL = '/' in dev, '/freightos-dashboard/' on GH Pages
  const src = `${import.meta.env.BASE_URL}zone-map.html`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3.5rem)' }}>
      {/* Header strip */}
      <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <h2 style={{ color: C.cyan, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
          Zone &amp; Time Zone Map
        </h2>
        <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
          DAT ZIP zones (Z0–Z9) · US time zones with live clocks · click states to build zone lists
        </p>
      </div>

      {/* Full-height iframe — the map HTML is fully self-contained */}
      <div style={{
        flex: 1,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 520,
      }}>
        <iframe
          src={src}
          title="DAT ZIP Zone + Time Zone Map"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          // allow clipboard so the "Copy" button inside the map works
          allow="clipboard-write"
        />
      </div>
    </div>
  )
}
