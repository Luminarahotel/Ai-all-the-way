import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { metric, open, scrollPct } from './helpers'

// Gate j: axe-core, zero serious or critical.
const cases = [
  { name: 'poster', qs: '?tier=poster', reduced: false },
  { name: '3d', qs: '?tier=high', reduced: false },
  { name: 'reduced', qs: '', reduced: true },
]
const summary: Record<string, unknown> = {}

for (const c of cases) {
  test(`gate j: axe (${c.name})`, async ({ page }) => {
    await open(page, c.qs, { reduced: c.reduced })
    for (const pct of [0, 50, 100]) {
      await scrollPct(page, pct, 900)
      const res = await new AxeBuilder({ page }).analyze()
      const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      summary[`${c.name}@${pct}`] = { violations: res.violations.length, seriousOrCritical: bad.length, incomplete: res.incomplete.length }
      expect(bad.map((b) => `${b.id}: ${b.nodes.length} node(s) ${b.help}`), `${c.name} at ${pct}%`).toEqual([])
    }
    metric(`axe-${c.name}`, summary)
  })
}

test('gate j: axe on the invalid form state', async ({ page }) => {
  await open(page, '?tier=poster')
  await page.locator('#waitlist button[type=submit]').click()
  const res = await new AxeBuilder({ page }).include('#waitlist').analyze()
  const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map((b) => b.id)).toEqual([])
})
