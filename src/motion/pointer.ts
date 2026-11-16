import { S } from '../scroll/state'

/**
 * Fine pointers only: one custom cursor state (over the ring or any [data-cursor])
 * and magnetic CTAs (80px radius, max 10px). Plain rAF, no libraries.
 */
export function initPointer() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {}
  const dot = document.querySelector<HTMLElement>('.cursor')
  const root = document.documentElement
  root.classList.add('fine-pointer')

  let tx = -100
  let ty = -100
  let cx = -100
  let cy = -100
  let raf = 0
  const mags = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'))

  const onMove = (e: PointerEvent) => {
    tx = e.clientX
    ty = e.clientY
    const t = e.target as Element | null
    let active = !!t?.closest('[data-cursor]')
    if (!active && S.ring.v) {
      const dx = tx - S.ring.x
      const dy = ty - S.ring.y
      active = Math.hypot(dx, dy) < S.ring.r * 0.9
    }
    dot?.classList.toggle('is-active', active)
    for (const m of mags) {
      const r = m.getBoundingClientRect()
      const mx = r.left + r.width / 2
      const my = r.top + r.height / 2
      const d = Math.hypot(tx - mx, ty - my)
      if (d < 80) {
        const x = Math.max(-10, Math.min(10, (tx - mx) * 0.25))
        const y = Math.max(-10, Math.min(10, (ty - my) * 0.25))
        m.style.transform = `translate(${x}px, ${y}px)`
      } else if (m.style.transform) {
        m.style.transform = ''
      }
    }
  }
  const loop = () => {
    cx += (tx - cx) * 0.2
    cy += (ty - cy) * 0.2
    if (dot) dot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`
    raf = requestAnimationFrame(loop)
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  raf = requestAnimationFrame(loop)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    root.classList.remove('fine-pointer')
  }
}
