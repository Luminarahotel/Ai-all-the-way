import { expect, test, type Page } from '@playwright/test'
import { PNG } from 'pngjs'
import { anatomyStops, metric, open, PCTS, scrollPct, scrollTo, SIZES } from './helpers'

// Gate e: layout. Gate f: contrast by pixel sampling with the 3D layer composited.

const lum = (r: number, g: number, b: number) => {
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

async function layoutChecks(page: Page, label: string, w: number) {
  const r = await page.evaluate((narrow) => {
    const out: string[] = []
    const de = document.documentElement
    if (de.scrollWidth > window.innerWidth + 1) out.push(`horizontal scroll: ${de.scrollWidth} > ${window.innerWidth}`)
    const L = (window as any).__lumo
    const ring = L?.state?.ring
    const vw = window.innerWidth
    const vh = window.innerHeight
    // text over the ring (circle vs text rects). On narrow screens, the top band is masked, so only the circle test applies.
    if (ring?.v) {
      const els = Array.from(document.querySelectorAll('h1,h2,h3,p,li,label,.btn,button,input')) as HTMLElement[]
      for (const el of els) {
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.3 || el.closest('.label')) continue
        const rc = el.getBoundingClientRect()
        if (rc.width === 0 || rc.height === 0 || rc.bottom < 0 || rc.top > vh) continue
        const cx = Math.max(rc.left, Math.min(ring.x, rc.right))
        const cy = Math.max(rc.top, Math.min(ring.y, rc.bottom))
        if (Math.hypot(cx - ring.x, cy - ring.y) < ring.r * 0.92) out.push(`text over ring: <${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 30)}"`)
      }
    }
    // anatomy labels
    const labels = Array.from(document.querySelectorAll<HTMLElement>('.label'))
    const shown = labels.filter((l) => getComputedStyle(l).visibility !== 'hidden' && Number(getComputedStyle(l).opacity) > 0.5)
    const rects = shown.map((l) => l.getBoundingClientRect())
    shown.forEach((l, i) => {
      if (l.scrollHeight > l.clientHeight + 1) out.push(`label ${i} clipped: ${l.scrollHeight} > ${l.clientHeight}`)
      const rc = rects[i]
      if (rc.left < -1 || rc.top < -1 || rc.right > vw + 1 || rc.bottom > vh + 1) out.push(`label ${i} outside viewport`)
      for (let j = i + 1; j < shown.length; j++) {
        const o = rects[j]
        if (rc.left < o.right && rc.right > o.left && rc.top < o.bottom && rc.bottom > o.top) out.push(`labels ${i} and ${j} intersect`)
      }
    })
    return out
  }, w < 900)
  expect(r, `${label}: ${r.join(' | ')}`).toEqual([])
}

test('gate e: layout (no h-scroll, no text over ring, anatomy labels, CLS)', async ({ page }) => {
  let worstCls = 0
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h })
    await open(page, '?tier=high')
    for (const pct of PCTS) {
      await scrollPct(page, pct, 1400)
      await layoutChecks(page, `${s.w}px scroll ${pct}%`, s.w)
    }
    for (const [i, y] of (await anatomyStops(page)).entries()) {
      await scrollTo(page, y, 1400)
      await layoutChecks(page, `${s.w}px anatomy stop ${i}`, s.w)
    }
    worstCls = Math.max(worstCls, await page.evaluate(() => (window as any).__cls as number))
  }
  metric('cls', { worst: Number(worstCls.toFixed(4)), limit: 0.1 })
  expect(worstCls).toBeLessThan(0.1)
})

async function contrastAt(page: Page, label: string) {
  const items = await page.evaluate(() => {
    const out: { x: number; y: number; w: number; h: number; fg: number[]; text: string }[] = []
    const vh = window.innerHeight
    const vw = window.innerWidth
    const all = Array.from(document.querySelectorAll<HTMLElement>('body *'))
    for (const el of all) {
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0)
      if (!own) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      let op = 1
      for (let p: HTMLElement | null = el; p; p = p.parentElement) op *= Number(getComputedStyle(p).opacity)
      if (op < 0.85) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue
      const m = cs.color.match(/[\d.]+/g)!.map(Number)
      out.push({ x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(vw, r.right) - Math.max(0, r.left), h: Math.min(vh, r.bottom) - Math.max(0, r.top), fg: m, text: (el.textContent ?? '').trim().slice(0, 28) })
    }
    return out
  })
  // hide all text, screenshot the composited background (DOM + canvas), then restore
  const handle = await page.addStyleTag({ content: '*{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important}input::placeholder{color:transparent !important}' })
  const buf = await page.screenshot({ animations: 'disabled' })
  await handle.evaluate((n) => n.remove())
  const png = PNG.sync.read(buf)
  let worst = { ratio: 99, text: '' }
  for (const it of items) {
    const lums: number[] = []
    let sr = 0, sg = 0, sb = 0, n = 0
    for (let y = Math.floor(it.y); y < Math.ceil(it.y + it.h); y += 2) {
      for (let x = Math.floor(it.x); x < Math.ceil(it.x + it.w); x += 2) {
        if (x >= png.width || y >= png.height) continue
        const i = (png.width * y + x) << 2
        const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2]
        lums.push(lum(r, g, b))
        sr += r; sg += g; sb += b; n++
      }
    }
    if (!n) continue
    lums.sort((a, b) => a - b)
    const lo = lums[Math.floor(lums.length * 0.01)]
    const hi = lums[Math.min(lums.length - 1, Math.floor(lums.length * 0.99))]
    const a = it.fg.length > 3 ? it.fg[3] : 1
    const mean = [sr / n, sg / n, sb / n]
    const fg = it.fg.slice(0, 3).map((c, k) => c * a + mean[k] * (1 - a))
    const lf = lum(fg[0], fg[1], fg[2])
    const worstR = Math.min(ratio(lf, lo), ratio(lf, hi))
    if (worstR < worst.ratio) worst = { ratio: worstR, text: it.text }
  }
  return { label, ...worst }
}

test('gate f: contrast >= 4.5:1 by pixel sampling (3D layer composited)', async ({ page }) => {
  const results: { label: string; ratio: number; text: string }[] = []
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h })
    await open(page, '?tier=high')
    for (const pct of PCTS) {
      await scrollPct(page, pct, 1800)
      results.push(await contrastAt(page, `${s.w}px ${pct}%`))
    }
    for (const [i, y] of (await anatomyStops(page)).entries()) {
      await scrollTo(page, y, 1800)
      results.push(await contrastAt(page, `${s.w}px anatomy ${i}`))
    }
  }
  const tight = results.reduce((a, b) => (b.ratio < a.ratio ? b : a))
  metric('contrast', { frames: results.length, tightest: { ratio: Number(tight.ratio.toFixed(2)), at: tight.label, text: tight.text }, threshold: 4.5 })
  const bad = results.filter((r) => r.ratio < 4.5)
  expect(bad, bad.map((b) => `${b.label}: ${b.ratio.toFixed(2)} "${b.text}"`).join('\n')).toEqual([])
})
