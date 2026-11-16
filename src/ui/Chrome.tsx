import { business, copy } from '../content'

export function Header() {
  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label={`${business.brand}, back to top`}>
        {business.brand}
      </a>
      <a className="btn btn--small" href="#waitlist" data-magnetic data-cursor>
        {copy.cta}
      </a>
    </header>
  )
}

/** Static poster: the hero for reduced motion, low / poster tiers, software renderers, and until the 3D layer is ready. */
export function Poster({ hidden, parallax }: { hidden: boolean; parallax: boolean }) {
  return (
    <div className={`poster${hidden ? ' is-hidden' : ''}${parallax ? ' is-parallax' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 600 600" focusable="false">
        <defs>
          <radialGradient id="pg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8FA8FF" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#8FA8FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="290" fill="url(#pg)" />
        <g transform="rotate(-24 300 300)">
          <ellipse cx="300" cy="300" rx="190" ry="150" fill="none" stroke="#F2EFE9" strokeWidth="26" opacity="0.92" />
          <ellipse cx="300" cy="300" rx="190" ry="150" fill="none" stroke="#AAB4D4" strokeWidth="3" opacity="0.7" transform="translate(0 -9)" />
          <ellipse cx="300" cy="300" rx="158" ry="118" fill="none" stroke="#0E1220" strokeWidth="14" />
          <circle cx="442" cy="230" r="6" fill="#8FA8FF" />
        </g>
      </svg>
    </div>
  )
}

export function Cursor() {
  return <div className="cursor" aria-hidden="true" />
}
