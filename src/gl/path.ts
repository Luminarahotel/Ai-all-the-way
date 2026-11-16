import * as THREE from 'three/webgpu'

/**
 * One table, 15 rows at u = i/14. The camera curve (CatmullRomCurve3) and every
 * object parameter are sampled with the SAME u, so camera and object never disagree.
 *
 * Section -> rows:  hero 0-1 | problem 1-3 | anatomy 3-8 | science 8-10 | materials 10-12 | how 12-13 | waitlist 13-14
 *
 * dx/dy: ring offset as a fraction of the half-width / half-height at the ring distance (desktop).
 * mx/my: same for narrow (portrait) screens. Text sits on the opposite side so it never covers the ring.
 */
export interface Row {
  az: number
  el: number
  d: number
  dx: number
  dy: number
  mx: number
  my: number
  sc: number
  scn: number
  rx: number
  rz: number
  spin: number
  lk: number
  ex: number
  mo: number
  pa: number
  gl: number
}

const T = (
  az: number, el: number, d: number,
  dx: number, dy: number, mx: number, my: number,
  sc: number, scn: number,
  rx: number, rz: number,
  spin: number, lk: number,
  ex: number, mo: number, pa: number, gl: number,
): Row => ({ az, el, d, dx, dy, mx, my, sc, scn, rx, rz, spin, lk, ex, mo, pa, gl })

export const ROWS: Row[] = [
  //  az   el    d     dx    dy   mx   my     sc    scn   rx    rz     spin lk  ex    mo pa   gl
  T(  0,   3,  6.4,   .40,   0,   0,  .46,   1.0,  .62,  .50, -.25,  .22, 0,  0,    0, .14, .15), // 0  hero
  T(  4,   3,  6.5,   .42, .02,   0,  .46,   1.0,  .62,  .55, -.25,  .20, 0,  0,    0, .14, .15), // 1  hero end / problem start
  T( -8,   6,  7.2,   .62, .12,   0,  .60,   .62,  .40,  .90,  .30,  .12, 0,  0,    0, .12, .12), // 2  ring recedes and tilts
  T(  0,   0,  6.6,     0,   0,   0,  .34,   .92,  .55,  .35,    0,    0, 1,  0,    0, .10, .15), // 3  anatomy start
  T(-45,   8,  6.8,     0,   0,   0,  .34,   .92,  .55,  .35,    0,    0, 1, .55,   0, .10, .18), // 4  comes apart
  T( -5,  12,  6.8,     0,   0,   0,  .34,   .92,  .55,  .35,    0,    0, 1, 1,     0, .10, .20), // 5  fully apart
  T( 40,   6,  6.8,     0,   0,   0,  .34,   .92,  .55,  .35,    0,    0, 1, 1,     0, .10, .20), // 6  orbit
  T( 10,   0,  6.6,     0,   0,   0,  .34,   .92,  .55,  .35,    0,    0, 1, .1,    0, .10, .18), // 7  reassembled
  T(  0,   0,  7.4,  -.80, .70,   0,  .86,   .22,  .16,  .50,  .20,  .30, 0,  0,    0, .35, .10), // 8  ring steps aside, science start
  T(  0,   0,  7.4,  -.80, .70,   0,  .86,   .22,  .16,  .50,  .20,  .30, 0,  0,    1, 1.0, .10), // 9  waveform formed
  T(  2,  -2,  7.4,  -.80, .70,   0,  .86,   .22,  .16,  .50,  .20,  .30, 0,  0,    1, 1.0, .10), // 10 hold, materials start
  T(-10,   4,  6.2,  -.40,   0,   0,  .42,   1.2,  .72,  .40,  .15,  .35, 0,  0,    0, .12, .25), // 11 materials
  T(  8,   6,  6.2,  -.40,   0,   0,  .42,   1.2,  .72,  .40,  .15,  .35, 0,  0,    0, .10, .25), // 12 materials end / how start
  T(  0,  10,  7.0,   .72, -.28,  0,  .82,   .38,  .26,  .70,    0,  .30, 0,  0,    0, .10, .20), // 13 how end / waitlist start
  T(  0,   0,  6.4,     0, .42,   0,  .42,   .80,  .60,  .30,    0,    0, 1,  0,    0, .12, 1.0), // 14 waitlist: ring settles
]

const D = Math.PI / 180
const orb = (r: Row) =>
  new THREE.Vector3(
    Math.sin(r.az * D) * Math.cos(r.el * D) * r.d,
    Math.sin(r.el * D) * r.d,
    Math.cos(r.az * D) * Math.cos(r.el * D) * r.d,
  )

export const camCurve = new THREE.CatmullRomCurve3(ROWS.map(orb), false, 'centripetal')

const KEYS = Object.keys(ROWS[0]) as (keyof Row)[]
const out: Row = { ...ROWS[0] }

/** Linear interpolation of every numeric parameter at u in [0,1]. */
export function sampleRow(u: number): Row {
  const f = Math.min(Math.max(u, 0), 1) * (ROWS.length - 1)
  const i = Math.min(Math.floor(f), ROWS.length - 2)
  const t = f - i
  const a = ROWS[i]
  const b = ROWS[i + 1]
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t
  return out
}
