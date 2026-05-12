import type React from 'react'

export const C = {
  bg: '#0a192f',
  bgL: '#112240',
  bgLL: '#172a45',
  border: '#1e3a5f',
  cyan: '#64ffda',
  slate: '#8892b0',
  slateL: '#a8b2d8',
  white: '#ccd6f6',
  green: '#4ade80',
  yellow: '#fbbf24',
  red: '#f87171',
} as const

export const card: React.CSSProperties = {
  background: C.bgL,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '1.25rem',
}

export const input: React.CSSProperties = {
  background: C.bgLL,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.white,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

export const label: React.CSSProperties = {
  fontSize: 11,
  color: C.slate,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
  display: 'block',
}
