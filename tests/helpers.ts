import { expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

export const PLACEHOLDER = /\[PLACEHOLDER|PLACEHOLDER:|\bTODO\b|\bTBD\b|lorem|example\.com|coming soon/i

export const SIZES = [
  { w: 375, h: 667 },
  { w: 768, h: 1024 },
  { w: 1440, h: 900 },
]
export const PCTS = [0, 10, 25, 40, 50, 60, 75, 90, 100]

export function metric(name: string, data: unknown) {
  mkdirSync('test-results', { recursive: true })
  writeFileSync(`test-results/metric-${name}.json`, JSON.stringify({ [name]: data }, null, 2))
}

export async function open(page: Page, qs = '', opts: { reduced?: boolean } = {}) {
  if (opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    ;(window as any).__cls = 0
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {}
  })
  await page.goto('/' + qs)
  await page.waitForSelector('h1')
  await page.evaluate(() => document.fonts.ready)
  if (/tier=(high|mid)/.test(qs)) {
    await page.waitForFunction(() => (window as any).__lumo?.ready === true, undefined, { timeout: 90_000 })
  } else {
    await page.waitForTimeout(800)
  }
}

export const maxScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)

export async function scrollTo(page: Page, y: number, settle = 1600) {
  await page.evaluate((v) => window.scrollTo(0, v), y)
  await page.waitForTimeout(settle)
}

export async function scrollPct(page: Page, pct: number, settle = 1600) {
  const max = await maxScroll(page)
  await scrollTo(page, Math.round((max * pct) / 100), settle)
}

/** start / middle / end of the pinned anatomy section, in scroll px */
export async function anatomyStops(page: Page) {
  return page.evaluate(() => {
    const el = document.getElementById('anatomy')!
    const top = el.getBoundingClientRect().top + window.scrollY
    const span = Math.max(1, el.offsetHeight - window.innerHeight)
    return [0, 0.15, 0.3, 0.45, 0.5, 0.6, 0.75, 0.9, 1].map((f) => Math.round(top + span * f))
  })
}

/** Everything a reader or assistive tech could see: innerText, hidden / opacity-0 text, labels, tooltips, attributes. */
export async function collectText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const parts: string[] = [document.body.innerText, document.title]
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) {
      const p = n.parentElement
      if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) continue
      parts.push(n.textContent ?? '')
    }
    document.querySelectorAll('[aria-label],[title],[alt],[placeholder],[aria-description],[data-tooltip]').forEach((el) => {
      for (const a of ['aria-label', 'title', 'alt', 'placeholder', 'aria-description', 'data-tooltip']) {
        const v = el.getAttribute(a)
        if (v) parts.push(v)
      }
    })
    document.querySelectorAll('meta[name=description],meta[property^="og:"]').forEach((m) => parts.push(m.getAttribute('content') ?? ''))
    return parts.join('\n')
  })
}

export function expectNoPlaceholder(text: string, where: string) {
  const m = text.match(PLACEHOLDER)
  expect(m, `placeholder text "${m?.[0]}" found at ${where}`).toBeNull()
}

export async function attachConsole(page: Page) {
  const errors: string[] = []
  const failed: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.url()} HTTP ${r.status()}`)
  })
  return { errors, failed }
}
