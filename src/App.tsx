import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { copy } from './content'
import { resolveTier, prefersReducedMotion, type TierResult } from './lib/tier'
import { TierCtx } from './tierContext'
import { Header, Poster, Cursor } from './ui/Chrome'
import { Hero, Problem, Science, Materials, How } from './sections/Sections'
import { Anatomy } from './sections/Anatomy'
import { Waitlist } from './sections/Waitlist'
import { Footer } from './sections/Footer'

// 3D chunk, loaded after first paint. If the chunk fails to load, the poster stays.
const SceneRoot = lazy(() =>
  import('./gl/SceneRoot').catch(() => ({ default: (() => null) as unknown as typeof import('./gl/SceneRoot').default })),
)

export default function App() {
  const [res, setRes] = useState<TierResult | null>(null)
  const [canvasOn, setCanvasOn] = useState(false)
  const [glReady, setGlReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // 1. decide the tier after first paint
  useEffect(() => {
    let alive = true
    const go = () => resolveTier().then((r) => alive && setRes(r))
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      alive = false
    }
  }, [])

  const is3d = !!res && (res.tier === 'high' || res.tier === 'mid') && !failed
  const pinned = is3d

  // 2. mount the canvas: immediately on desktop, on first interaction for touch devices
  useEffect(() => {
    if (!is3d || !res) return
    const start = () => setCanvasOn(true)
    if (!res.coarse) {
      const id = window.setTimeout(start, 60)
      return () => clearTimeout(id)
    }
    const evs = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'] as const
    evs.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }))
    return () => evs.forEach((e) => window.removeEventListener(e, start))
  }, [is3d, res])

  // 3. layout flag for sticky stages
  useEffect(() => {
    const el = document.documentElement
    if (pinned) el.setAttribute('data-pin', '1')
    else el.removeAttribute('data-pin')
    el.setAttribute('data-tier', res ? res.tier : 'pending')
  }, [pinned, res])

  // 4. motion chunk (Lenis, ScrollTrigger, SplitText): never for reduced motion
  useEffect(() => {
    if (!res || prefersReducedMotion()) return
    let stop: (() => void) | undefined
    let alive = true
    import('./motion').then((m) => {
      if (alive) stop = m.initMotion({ pinned })
    })
    return () => {
      alive = false
      stop?.()
    }
  }, [res, pinned])

  // 5. low tier: CSS parallax on the poster (a single custom property)
  useEffect(() => {
    if (res?.tier !== 'low') return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => document.documentElement.style.setProperty('--sy', String(window.scrollY)))
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [res])

  const onReady = useCallback(() => setGlReady(true), [])
  const onFail = useCallback(() => {
    setFailed(true)
    setCanvasOn(false)
  }, [])

  return (
    <TierCtx.Provider value={{ tier: res ? res.tier : null, pinned }}>
      <div id="top" tabIndex={-1} />
      <a className="skip" href="#main">
        {copy.skip}
      </a>
      <Header />
      <Poster hidden={glReady} parallax={res?.tier === 'low'} />
      {canvasOn && res && (res.tier === 'high' || res.tier === 'mid') && (
        <Suspense fallback={null}>
          <SceneRoot tier={res.tier} renderer={res.renderer} small={res.small} onReady={onReady} onFail={onFail} />
        </Suspense>
      )}
      <main id="main">
        <Hero />
        <Problem />
        <Anatomy />
        <Science />
        <Materials />
        <How />
        <Waitlist />
      </main>
      <Footer />
      <Cursor />
    </TierCtx.Provider>
  )
}
