import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'
import { attachConsole, metric, open, PCTS, scrollPct } from './helpers'

// Gate g: zero console errors, zero failed requests.
for (const qs of ['?tier=high', '?tier=poster', '']) {
  test(`gate g: console and network clean (${qs || 'default'})`, async ({ page }) => {
    const c = await attachConsole(page)
    await open(page, qs)
    for (const pct of PCTS) await scrollPct(page, pct, 400)
    expect(c.errors, c.errors.join('\n')).toEqual([])
    expect(c.failed, c.failed.join('\n')).toEqual([])
  })
}

// Gate h: 3D. A software GPU may fail or run slowly here: that is reported as NOT VERIFIED, never as 60 fps.
test('gate h: 3D canvas not blank, draw calls < 100', async ({ page }) => {
  await open(page, '?tier=high')
  await page.waitForTimeout(2500)
  const info = await page.evaluate(() => {
    const L = (window as any).__lumo
    return { backend: L?.backend, maxCalls: L?.maxCalls, frames: L?.frames, canvas: !!document.querySelector('.gl canvas') }
  })
  expect(info.canvas).toBe(true)
  const handle = await page.addStyleTag({ content: '*{color:transparent !important}main,header,footer{visibility:hidden}' })
  const png = PNG.sync.read(await page.screenshot())
  await handle.evaluate((n) => n.remove())
  let bright = 0
  let min = 255, max = 0
  for (let i = 0; i < png.data.length; i += 16) {
    const l = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3
    min = Math.min(min, l); max = Math.max(max, l)
    if (l > 90) bright++
  }
  metric('3d', { ...info, brightSamples: bright, lumaRange: [Math.round(min), Math.round(max)] })
  expect(bright, 'canvas looks blank: no bright ring pixels').toBeGreaterThan(200)
  expect(info.maxCalls, `max draw calls ${info.maxCalls}`).toBeLessThan(100)
})

test('gate h: tier flags and renderer flag', async ({ page }) => {
  await open(page, '?tier=poster')
  expect(await page.locator('.gl canvas').count()).toBe(0)
  expect(await page.locator('.poster').isVisible()).toBe(true)
  await open(page, '?tier=low')
  expect(await page.locator('.gl canvas').count()).toBe(0)
  await scrollPct(page, 30, 600)
  const sy = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sy'))
  expect(Number(sy), 'low tier: CSS parallax variable should follow scroll').toBeGreaterThan(0)
  await open(page, '?tier=mid')
  expect(await page.evaluate(() => (window as any).__lumo.tier)).toBe('mid')
  await open(page, '?tier=high&renderer=webgl')
  expect(await page.evaluate(() => (window as any).__lumo.backend)).toBe('webgl')
})

test('gate h: reduced motion mounts no canvas and no Lenis', async ({ page }) => {
  await open(page, '', { reduced: true })
  expect(await page.locator('.gl canvas').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false)
  // all content readable, every CTA works
  expect(await page.getByText('Outer shell').first().isVisible()).toBe(true)
  expect(await page.getByText('Read one line').first().isVisible()).toBe(true)
})

test('gate h: hidden tab pauses the render loop', async ({ page }) => {
  await open(page, '?tier=high')
  await page.waitForTimeout(1200)
  const running = await page.evaluate(async () => {
    const a = (window as any).__lumo.frames
    await new Promise((r) => setTimeout(r, 700))
    return (window as any).__lumo.frames - a
  })
  expect(running, 'loop should be running while visible').toBeGreaterThan(2)
  const paused = await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 400))
    const a = (window as any).__lumo.frames
    await new Promise((r) => setTimeout(r, 900))
    return { delta: (window as any).__lumo.frames - a, flag: (window as any).__lumo.paused }
  })
  metric('hiddenTab', paused)
  expect(paused.flag).toBe(true)
  expect(paused.delta).toBeLessThanOrEqual(1)
})
