import { test } from '@playwright/test'
import { anatomyStops, collectText, expectNoPlaceholder, open, PCTS, scrollPct, scrollTo, SIZES } from './helpers'

// Gate c: rendered-text gate. innerText + every hidden / overlay / tooltip text, no placeholder patterns.
const MODES = [
  { name: '3d', qs: '?tier=high', reduced: false },
  { name: 'poster', qs: '?tier=poster', reduced: false },
  { name: 'reduced-motion', qs: '', reduced: true },
]

for (const mode of MODES) {
  test(`gate c: rendered text, no placeholders (${mode.name})`, async ({ page }) => {
    for (const s of SIZES) {
      await page.setViewportSize({ width: s.w, height: s.h })
      await open(page, mode.qs, { reduced: mode.reduced })
      for (const pct of PCTS) {
        await scrollPct(page, pct, 700)
        expectNoPlaceholder(await collectText(page), `${mode.name} ${s.w}px scroll ${pct}%`)
      }
      if (mode.name === '3d') {
        for (const [i, y] of (await anatomyStops(page)).entries()) {
          await scrollTo(page, y, 700)
          expectNoPlaceholder(await collectText(page), `${mode.name} ${s.w}px anatomy stop ${i}`)
        }
      }
    }
  })
}

test('gate c: no placeholder text in any form state', async ({ page }) => {
  await open(page, '?tier=poster')
  const input = page.locator('#wl-email')
  const submit = page.getByRole('button', { name: 'Join the waitlist' }).last()
  await submit.click() // empty -> invalid
  expectNoPlaceholder(await collectText(page), 'form invalid (empty)')
  await input.fill('nope')
  await submit.click()
  expectNoPlaceholder(await collectText(page), 'form invalid (bad email)')
  await input.fill('person@mail.test')
  await submit.click() // demo state, no endpoint
  expectNoPlaceholder(await collectText(page), 'form demo')
})
