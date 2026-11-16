import { useRef, useState, type FormEvent } from 'react'
import { copy } from '../content'

type St = 'idle' | 'invalid' | 'sending' | 'success' | 'demo' | 'error'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ENDPOINT = import.meta.env.VITE_WAITLIST_URL

export function Waitlist() {
  const [email, setEmail] = useState('')
  const [st, setSt] = useState<St>('idle')
  const input = useRef<HTMLInputElement>(null)
  const w = copy.waitlist

  async function send() {
    const v = email.trim()
    if (!EMAIL_RE.test(v)) {
      setSt('invalid')
      input.current?.focus()
      return
    }
    if (!ENDPOINT) {
      setSt('demo') // honest demo state: never pretend an email was saved
      return
    }
    setSt('sending')
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setSt('success')
    } catch {
      setSt('error')
    }
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send()
  }

  const status =
    st === 'sending' ? w.sending : st === 'success' ? w.success : st === 'demo' ? w.demo : st === 'error' ? w.error : ''
  const invalid = st === 'invalid'
  const done = st === 'success'

  return (
    <section id="waitlist" className="sec waitlist" aria-labelledby="waitlist-h">
      <div className="stage">
        <div className="waitlist-copy">
          <h2 id="waitlist-h" data-split>
            {w.title}
          </h2>
          <p className="lede" data-rise>
            {w.sub}
          </p>
          <form className="wl-form" onSubmit={onSubmit} noValidate data-state={st} data-rise>
            <label htmlFor="wl-email">{w.label}</label>
            <div className="wl-row">
              <input
                ref={input}
                id="wl-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (st === 'invalid') setSt('idle')
                }}
                aria-invalid={invalid}
                aria-describedby={invalid ? 'wl-hint wl-error' : 'wl-hint'}
                disabled={st === 'sending' || done}
                required
              />
              <button className="btn" type="submit" disabled={st === 'sending' || done} data-magnetic data-cursor>
                {w.button}
              </button>
            </div>
            <p id="wl-hint" className="fine">
              {w.hint}
            </p>
            <p id="wl-error" className="err" role="alert">
              {invalid ? w.invalid : ''}
            </p>
            <p id="wl-status" className="status" role="status" aria-live="polite">
              {status}
            </p>
            {st === 'demo' && <p className="fine">{w.demoNote}</p>}
            {st === 'error' && (
              <button type="button" className="btn btn--ghost" onClick={() => void send()}>
                {w.retry}
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
