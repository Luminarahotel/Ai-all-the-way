import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { S } from '../scroll/state'
import { measureRanges } from '../scroll/ranges'
import { initPointer } from './pointer'

/**
 * Loaded as its own chunk after first paint, and never for prefers-reduced-motion.
 * Easing vocabulary used here: power4.out, power3.inOut, expo.out, back.out(1.4), none.
 */
export function initMotion(opts: { pinned: boolean }) {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (t: number) => lenis.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  // ONE shared progress: ScrollTrigger over the whole document writes S.p
  S.driven = true
  const master = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      S.p = self.progress
    },
  })
  S.p = master.progress

  const remeasure = () => measureRanges()
  remeasure()
  ScrollTrigger.addEventListener('refresh', remeasure)
  document.fonts?.ready.then(() => {
    remeasure()
    ScrollTrigger.refresh()
  })
  const ro = new ResizeObserver(() => ScrollTrigger.refresh())
  ro.observe(document.body)

  // Large line-by-line reveals inside overflow-hidden masks
  const splits: SplitText[] = []
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const step = el.dataset.step !== undefined ? Number(el.dataset.step) : -1
    const sec = el.closest<HTMLElement>('.sec')
    let tween: gsap.core.Tween | null = null
    const split = SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        tween = gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: 0.08, paused: true })
        return tween
      },
    })
    splits.push(split)
    if (step >= 0 && opts.pinned && sec) {
      // lines inside a pinned stage: revealed as the section scrolls, both directions
      ScrollTrigger.create({
        trigger: sec,
        start: () => `top top-=${Math.round(step * window.innerHeight * 0.5)}`,
        onEnter: () => tween?.play(),
        onLeaveBack: () => tween?.reverse(),
      })
    } else {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        onEnter: () => tween?.play(),
      })
    }
  })

  // Body fade + rise
  document.querySelectorAll<HTMLElement>('[data-rise]').forEach((el) => {
    gsap.set(el, { opacity: 0, y: 24 })
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power4.out' }),
    })
  })

  // How it works: scroll-driven timeline
  const how = document.querySelector<HTMLElement>('#how')
  if (how) {
    const steps = how.querySelectorAll<HTMLElement>('[data-step-card]')
    const fill = how.querySelector<HTMLElement>('.track-fill')
    gsap.set(steps, { opacity: 0.3, y: 12 })
    if (fill) gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' })
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: how,
        start: opts.pinned ? 'top top' : 'top 70%',
        end: opts.pinned ? 'bottom bottom' : 'bottom 60%',
        scrub: true,
      },
    })
    if (fill) tl.to(fill, { scaleX: 1, ease: 'none', duration: 3 }, 0)
    steps.forEach((s, i) => tl.to(s, { opacity: 1, y: 0, ease: 'power3.inOut', duration: 0.6 }, i * 1))
  }

  // Pause Lenis, the GSAP ticker and (via the scene) the render loop when the tab is hidden
  const onVis = () => {
    if (document.hidden) {
      gsap.ticker.sleep()
      lenis.stop()
    } else {
      gsap.ticker.wake()
      lenis.start()
    }
    ;(window as any).__lumo && ((window as any).__lumo.motionPaused = document.hidden)
  }
  document.addEventListener('visibilitychange', onVis)

  const stopPointer = initPointer()
  ScrollTrigger.refresh()

  return () => {
    stopPointer()
    document.removeEventListener('visibilitychange', onVis)
    ro.disconnect()
    splits.forEach((s) => s.revert())
    ScrollTrigger.getAll().forEach((t) => t.kill())
    gsap.ticker.remove(tick)
    lenis.destroy()
    S.driven = false
  }
}
