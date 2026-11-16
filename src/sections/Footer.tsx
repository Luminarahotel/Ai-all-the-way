import { business, copy } from '../content'

export function Footer() {
  const f = copy.footer
  const p = copy.privacy
  return (
    <footer id="footer" className="footer">
      <div className="footer-top">
        <p className="footer-mark" aria-label={business.brand}>
          {business.brand}
        </p>
        <nav aria-label="Footer">
          <ul>
            <li>
              <a href="#top">{f.topLink}</a>
            </li>
            <li>
              <a href="#waitlist">{f.waitlistLink}</a>
            </li>
            <li>
              <a href="#privacy">{f.privacyLink}</a>
            </li>
          </ul>
        </nav>
      </div>

      <div id="privacy" className="privacy" role="region" aria-labelledby="privacy-h" tabIndex={-1}>
        <h2 id="privacy-h">{p.title}</h2>
        {p.paragraphs.map((t) => (
          <p key={t}>{t}</p>
        ))}
        {business.email && (
          <p>
            Contact: <a href={`mailto:${business.email}`}>{business.email}</a>
          </p>
        )}
      </div>

      <div className="footer-base">
        <p>
          &copy; {business.year} {business.company}
        </p>
        {business.address && <p>{business.address}</p>}
        {business.email && <p>{business.email}</p>}
        <p>{business.disclaimer}</p>
      </div>
    </footer>
  )
}
