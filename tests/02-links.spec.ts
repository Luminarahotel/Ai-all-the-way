import { expect, test } from '@playwright/test'
import { metric, open } from './helpers'

// Gate d: every href and #anchor resolves, scrolls into view (motion + reduced motion), no dead or "#" links,
// target=_blank has rel=noopener, keyboard tab order is logical with visible focus.
for (const reduced of [false, true]) {
  test(`gate d: links resolve and scroll into view (${reduced ? 'reduced motion' : 'motion'})`, async ({ page }) => {
    await open(page, reduced ? '' : '?tier=poster', { reduced })
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => ({
        href: a.getAttribute('href')!,
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel') ?? '',
        text: (a.textContent ?? '').trim(),
      })),
    )
    expect(hrefs.length).toBeGreaterThan(4)
    for (const l of hrefs) {
      expect(l.href, `dead link "${l.text}"`).not.toBe('#')
      expect(l.href, `empty href "${l.text}"`).not.toBe('')
      if (l.target === '_blank') expect(l.rel).toContain('noopener')
      if (l.href.startsWith('#')) {
        const exists = await page.evaluate((h) => !!document.getElementById(h.slice(1)), l.href)
        expect(exists, `anchor ${l.href} has no target element`).toBe(true)
      }
    }
    // click each in-page link and confirm its target is in view
    const anchors = Array.from(new Set(hrefs.filter((h) => h.href.startsWith('#')).map((h) => h.href)))
    for (const a of anchors) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      if (a === '#top') {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(500)
      }
      await page.locator(`a[href="${a}"]`).first().click({ force: true })
      await page.waitForTimeout(2200)
      const inView = await page.evaluate((h) => {
        const el = document.getElementById(h.slice(1))!
        const r = el.getBoundingClientRect()
        return h === '#top' ? window.scrollY < 5 : r.top < window.innerHeight && r.bottom > 0
      }, a)
      expect(inView, `${a} did not scroll into view`).toBe(true)
    }
  })
}

test('gate d: keyboard tab order is logical and focus is visible', async ({ page }) => {
  await open(page, '?tier=poster')
  const seen: { tag: string; text: string; top: number; outline: string }[] = []
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab')
    seen.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const cs = getComputedStyle(el)
        return {
          tag: el.tagName,
          text: (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30),
          top: el.getBoundingClientRect().top + window.scrollY,
          outline: `${cs.outlineStyle} ${cs.outlineWidth}`,
        }
      }),
    )
  }
  expect(seen[0].text).toMatch(/skip to content/i)
  for (const s of seen) expect(s.outline, `no visible focus on ${s.text}`).not.toMatch(/^none/)
  const doc = seen.slice(2).map((s) => s.top)
  for (let i = 1; i < doc.length; i++) expect(doc[i] + 2, `tab order jumps backwards at "${seen[i + 2].text}"`).toBeGreaterThanOrEqual(doc[i - 1])
  metric('tabOrder', seen.map((s) => `${s.tag}:${s.text}`))
})
