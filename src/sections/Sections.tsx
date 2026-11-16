import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { business, copy, type Finish } from '../content'
import { S } from '../scroll/state'
import { useTier } from '../tierContext'
import { useState } from 'react'

const h = (v: string) => ({ '--h': v }) as CSSProperties

export function Hero() {
  const words = copy.hero.title.split(' ')
  return (
    <section id="hero" className="sec hero" aria-labelledby="hero-h">
      <div className="stage">
        <p className="eyebrow">{copy.hero.eyebrow}</p>
        <h1 id="hero-h" className="hero-title">
          {words.map((w, i) => (
            <span key={i}>
              <span className="w">
                <span style={{ '--i': i } as CSSProperties}>{w}</span>
              </span>{' '}
            </span>
          ))}
        </h1>
        <p className="lede">{copy.hero.sub}</p>
        <a className="btn" href="#waitlist" data-magnetic data-cursor>
          {copy.cta}
        </a>
      </div>
    </section>
  )
}

export function Problem() {
  const { pinned } = useTier()
  return (
    <section id="problem" className="sec problem pin" style={h('280vh')} aria-labelledby="problem-h">
      <div className="stage">
        <div className="problem-lines">
          {copy.problem.lines.map((line, i) =>
            i === 0 ? (
              <h2 key={i} id="problem-h" className="big" data-split data-step={i}>
                {line}
              </h2>
            ) : (
              <p key={i} className="big" data-split data-step={i}>
                {line}
              </p>
            ),
          )}
        </div>
        {!pinned && null}
      </div>
    </section>
  )
}

export function Science() {
  const { pinned } = useTier()
  const labels = useRef<(HTMLLIElement | null)[]>([])

  // stage labels follow the projected rows of the waveform
  useEffect(() => {
    if (!pinned) return
    let raf = 0
    const loop = () => {
      S.stages.forEach((p, i) => {
        const el = labels.current[i]
        if (!el) return
        el.style.transform = `translate(${Math.max(12, p.x)}px, ${p.y}px) translateY(-50%)`
        el.style.opacity = String(p.v * Math.min(1, S.morph * 1.6))
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [pinned])

  return (
    <section id="science" className="sec science pin" style={h('260vh')} aria-labelledby="science-h">
      <div className="stage">
        <div className="science-copy panel">
          <h2 id="science-h" data-split>
            {copy.science.title}
          </h2>
          <p data-rise>{copy.science.body}</p>
          <p className="fine" data-rise>
            {copy.science.validation}
          </p>
        </div>

        {pinned ? (
          <ul className="stage-labels" aria-label="Sleep stages">
            {copy.science.stages.map((s, i) => (
              <li key={s} ref={(el) => { labels.current[i] = el }} className="stage-label">
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <StaticHypnogram />
        )}
        <p className="caption">{copy.science.caption}</p>
      </div>
    </section>
  )
}

/** Static fallback for poster tiers and reduced motion: same four stages, drawn as an SVG line. */
function StaticHypnogram() {
  const ys = [30, 80, 130, 180]
  const path = 'M0 30 L40 30 L60 130 L130 180 L200 130 L240 80 L290 130 L350 180 L430 130 L480 80 L540 130 L600 80 L650 30 L700 30'
  return (
    <figure className="hypno">
      <svg viewBox="0 0 700 210" role="img" aria-label="Illustration of a night of sleep moving between Awake, REM, Light and Deep.">
        {ys.map((y, i) => (
          <g key={y}>
            <line x1="90" x2="700" y1={y} y2={y} stroke="#AAB4D4" strokeOpacity="0.25" />
            <text x="0" y={y + 4} fill="#AAB4D4" fontSize="14" fontFamily="'Hanken Grotesk', system-ui, sans-serif">
              {copy.science.stages[i]}
            </text>
          </g>
        ))}
        <path d={path} transform="translate(90 0) scale(0.87 1)" fill="none" stroke="#8FA8FF" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </figure>
  )
}

export function Materials() {
  const { pinned } = useTier()
  const [sel, setSel] = useState<Finish>('silver')
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const list = copy.materials.finishes
  const current = list.find((f) => f.id === sel)!

  useEffect(() => {
    S.finish = sel
  }, [sel])

  const onKey = (e: KeyboardEvent, i: number) => {
    let n = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % list.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + list.length) % list.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = list.length - 1
    else return
    e.preventDefault()
    setSel(list[n].id)
    refs.current[n]?.focus()
  }

  const fill = { silver: '#F2EFE9', graphite: '#0E1220', gold: '#FFC48A' }[sel]

  return (
    <section id="materials" className="sec materials pin" style={h('200vh')} aria-labelledby="materials-h">
      <div className="stage">
        <div className="materials-copy">
          <h2 id="materials-h" data-split>
            {copy.materials.title}
          </h2>
          <p data-rise>{copy.materials.intro}</p>
          <div role="radiogroup" aria-label={copy.materials.label} className="finishes">
            {list.map((f, i) => (
              <button
                key={f.id}
                ref={(el) => { refs.current[i] = el }}
                type="button"
                role="radio"
                aria-checked={sel === f.id}
                tabIndex={sel === f.id ? 0 : -1}
                className="finish"
                data-cursor
                onClick={() => setSel(f.id)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className={`swatch swatch--${f.id}`} aria-hidden="true" />
                {f.name}
              </button>
            ))}
          </div>
          <p className="finish-copy" aria-live="polite" id="finish-copy">
            {current.text}
          </p>
          <p className="fine">{copy.materials.note}</p>
        </div>
        {!pinned && (
          <svg className="finish-glyph" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <g transform="rotate(-24 100 100)">
              <ellipse cx="100" cy="100" rx="64" ry="50" fill="none" stroke={fill} strokeWidth="12" style={{ transition: 'stroke .6s cubic-bezier(.645,.045,.355,1)' }} />
            </g>
          </svg>
        )}
      </div>
    </section>
  )
}

export function How() {
  return (
    <section id="how" className="sec how pin" style={h('260vh')} aria-labelledby="how-h">
      <div className="stage">
        <div className="how-inner panel">
          <h2 id="how-h" data-split>
            {copy.how.title}
          </h2>
          <div className="track" aria-hidden="true">
            <span className="track-fill" />
          </div>
          <ol className="steps">
            {copy.how.steps.map((s, i) => (
              <li key={s.name} className="step" data-step-card>
                <span className="step-n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{s.name}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <a className="btn" href="#waitlist" data-magnetic data-cursor>
            {copy.cta}
          </a>
        </div>
      </div>
    </section>
  )
}

export { business }
