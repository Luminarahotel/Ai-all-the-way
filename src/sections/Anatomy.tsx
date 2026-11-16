import { useEffect, useRef, type CSSProperties } from 'react'
import { copy } from '../content'
import { S } from '../scroll/state'
import { useTier } from '../tierContext'
import { layoutLabels, NARROW_BP } from '../lib/labelLayout'

// fixed sides, so labels never jump across the ring: shell right, sensor left, battery right
const SIDES: ('left' | 'right')[] = ['right', 'left', 'right']

export function Anatomy() {
  const { pinned } = useTier()
  const stage = useRef<HTMLDivElement>(null)
  const labels = useRef<(HTMLLIElement | null)[]>([])
  const paths = useRef<(SVGPathElement | null)[]>([])
  const dots = useRef<(SVGCircleElement | null)[]>([])

  useEffect(() => {
    if (!pinned) return
    let raf = 0
    let heights = [0, 0, 0]
    let lastW = 0
    let lastH = 0
    const measure = () => {
      heights = labels.current.map((el) => (el ? el.offsetHeight : 0))
    }
    const loop = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (vw !== lastW || vh !== lastH) {
        lastW = vw
        lastH = vh
        measure()
      }
      const vis = Math.min(1, Math.max(0, (S.ex - 0.12) / 0.45))
      const out = layoutLabels({ anchors: S.anchors, heights, sides: SIDES, vw, vh })
      const narrow = vw < NARROW_BP
      labels.current.forEach((el, i) => {
        if (!el || !out[i]) return
        el.style.width = `${out[i].w}px`
        el.style.transform = `translate(${out[i].x}px, ${out[i].y}px)`
        el.style.opacity = String(vis)
        el.style.visibility = vis > 0.01 ? 'visible' : 'hidden'
        const a = S.anchors[i]
        const p = paths.current[i]
        const d = dots.current[i]
        if (p) {
          const ax = narrow ? out[i].attachX : out[i].attachX
          const ay = narrow ? out[i].attachY : out[i].attachY
          p.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)}`)
          p.style.opacity = String(vis)
        }
        if (d) {
          d.setAttribute('cx', a.x.toFixed(1))
          d.setAttribute('cy', a.y.toFixed(1))
          d.style.opacity = String(vis)
        }
      })
      raf = requestAnimationFrame(loop)
    }
    measure()
    document.fonts?.ready.then(measure)
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [pinned])

  return (
    <section id="anatomy" className="sec anatomy pin" style={{ '--h': '420vh' } as CSSProperties} aria-labelledby="anatomy-h">
      <div className="stage" ref={stage}>
        <div className="a-head">
          <h2 id="anatomy-h" data-split>
            {copy.anatomy.title}
          </h2>
          <p className="a-intro">{copy.anatomy.intro}</p>
        </div>
        {pinned && (
          <svg className="leaders" aria-hidden="true" focusable="false">
            {copy.anatomy.layers.map((l, i) => (
              <g key={l.name}>
                <path ref={(el) => { paths.current[i] = el }} className="leader" />
                <circle ref={(el) => { dots.current[i] = el }} r="4" className="leader-dot" />
              </g>
            ))}
          </svg>
        )}
        <ul className="labels">
          {copy.anatomy.layers.map((l, i) => (
            <li key={l.name} className="label" ref={(el) => { labels.current[i] = el }} style={pinned ? { opacity: 0, visibility: 'hidden' } : undefined}>
              <h3>{l.name}</h3>
              <p>{l.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
