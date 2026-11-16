import { S } from './state'

const U = (i: number) => i / 14 // the camera/object table has 15 rows, 14 intervals

/**
 * Measures section ranges from the DOM (never hard-coded) and stores
 * [progress, u] breakpoints in S.bp. Called on load, font load and resize.
 *
 * Mapping: each pinned section spans [top, top + height - viewport] in scroll px.
 * Between sections u holds, so the camera never cuts or jumps.
 */
export function measureRanges() {
  const vh = window.innerHeight
  const max = Math.max(1, document.documentElement.scrollHeight - vh)
  const el = (id: string) => document.getElementById(id)
  const top = (id: string) => {
    const e = el(id)
    return e ? e.getBoundingClientRect().top + window.scrollY : NaN
  }
  const secs: { id: string; a: number; b: number }[] = [
    { id: 'problem', a: 1, b: 3 },
    { id: 'anatomy', a: 3, b: 8 },
    { id: 'science', a: 8, b: 10 },
    { id: 'materials', a: 10, b: 12 },
    { id: 'how', a: 12, b: 13 },
  ]
  const pts: [number, number][] = [[0, 0]]
  for (const s of secs) {
    const t = top(s.id)
    const h = el(s.id)?.offsetHeight ?? 0
    if (Number.isNaN(t)) continue
    pts.push([t, U(s.a)])
    pts.push([t + Math.max(1, h - vh), U(s.b)])
  }
  const wl = top('waitlist')
  if (!Number.isNaN(wl)) pts.push([wl, U(13)])
  pts.push([max, 1])
  // enforce strictly increasing x
  for (let i = 1; i < pts.length; i++) pts[i][0] = Math.max(pts[i][0], pts[i - 1][0] + 0.5)
  S.bp = pts.map(([x, u]) => [Math.min(1, x / max), u] as [number, number])
}

export function uFromP(p: number): number {
  const b = S.bp
  if (b.length < 2) return p
  if (p <= b[0][0]) return b[0][1]
  for (let i = 1; i < b.length; i++) {
    if (p <= b[i][0]) {
      const [x0, u0] = b[i - 1]
      const [x1, u1] = b[i]
      const t = (p - x0) / Math.max(1e-6, x1 - x0)
      return u0 + (u1 - u0) * t
    }
  }
  return b[b.length - 1][1]
}
