import { useState, useEffect, useRef, useCallback } from 'react'
import { searchPlaces, shortName, subName, NominatimPlace } from '../utils/nominatim'
import { C, input } from '../utils/theme'

interface Props {
  value: string
  onChange: (text: string) => void
  onSelect: (place: NominatimPlace) => void
  placeholder?: string
  label?: string
}

export default function CityInput({ value, onChange, onSelect, placeholder, label }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<NominatimPlace[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync if parent resets value
  useEffect(() => { setQuery(value) }, [value])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const data = await searchPlaces(q)
      setResults(data)
      setOpen(data.length > 0)
      setActiveIdx(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (text: string) => {
    setQuery(text)
    onChange(text)
    clearTimeout(timer.current)
    // Debounce 600ms to respect Nominatim 1 req/sec rate limit
    timer.current = setTimeout(() => doSearch(text), 600)
  }

  const handleSelect = (place: NominatimPlace) => {
    const name = shortName(place)
    setQuery(name)
    onChange(name)
    onSelect(place)
    setResults([])
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]) }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <span style={{ fontSize: 11, color: C.slate, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
          {label}
        </span>
      )}

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true) }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type a city name…'}
          style={{
            ...input,
            borderColor: focused ? C.cyan : C.border,
            boxShadow: focused ? `0 0 0 2px ${C.cyan}22` : 'none',
            paddingRight: 36,
          }}
          autoComplete="off"
        />

        {/* Status indicator */}
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>
          {loading ? (
            <span style={{ color: C.slate }}>⋯</span>
          ) : query.length > 0 && !open ? (
            <span style={{ color: C.green, fontSize: 11 }}>✓</span>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: C.bgL, border: `1px solid ${C.border}`, borderRadius: 8,
          zIndex: 1000, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          {results.map((place, i) => (
            <div
              key={place.place_id}
              onClick={() => handleSelect(place)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i === activeIdx ? `${C.cyan}12` : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = `${C.cyan}10`; setActiveIdx(i) }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = i === activeIdx ? `${C.cyan}12` : 'transparent' }}
            >
              <div style={{ color: C.white, fontSize: 13, fontWeight: 500 }}>{shortName(place)}</div>
              <div style={{ color: C.slate, fontSize: 11, marginTop: 2 }}>{subName(place)}</div>
            </div>
          ))}
          <div style={{ padding: '6px 14px', fontSize: 10, color: C.slate, opacity: 0.6, borderTop: `1px solid ${C.border}` }}>
            Powered by OpenStreetMap · Nominatim
          </div>
        </div>
      )}
    </div>
  )
}
