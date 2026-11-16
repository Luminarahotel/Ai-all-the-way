import type { Finish } from '../content'

export interface Pt {
  x: number
  y: number
  v: number
}

/**
 * One shared state object. Lenis + ScrollTrigger write S.p (0-1).
 * The 3D scene reads it every frame through damping, and writes projected
 * anchors back so DOM labels can follow the 3D objects.
 */
export const S = {
  p: 0,
  driven: false, // true once Lenis/ScrollTrigger own S.p
  bp: [] as [number, number][], // [scroll progress, curve u] breakpoints measured from the DOM
  ex: 0, // explode amount 0-1 (from the scene)
  morph: 0, // particle morph 0-1 (from the scene)
  finish: 'silver' as Finish,
  anchors: [
    { x: 0, y: 0, v: 0 },
    { x: 0, y: 0, v: 0 },
    { x: 0, y: 0, v: 0 },
  ] as Pt[],
  stages: [
    { x: 0, y: 0, v: 0 },
    { x: 0, y: 0, v: 0 },
    { x: 0, y: 0, v: 0 },
    { x: 0, y: 0, v: 0 },
  ] as Pt[],
  ring: { x: 0, y: 0, r: 0, v: 0 },
  px: 0,
  py: 0,
  ready: false,
}
