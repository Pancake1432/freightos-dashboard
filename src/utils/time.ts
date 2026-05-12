export function addHoursToISO(isoStr: string, hours: number): Date {
  return new Date(new Date(isoStr).getTime() + hours * 3_600_000)
}

export function fmtHours(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`
}

export function fmtTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function fmtFull(date: Date): string {
  return `${fmtDate(date)} at ${fmtTime(date)}`
}

export function nowISO(): string {
  const d = new Date(); d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}
