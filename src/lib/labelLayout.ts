/**
 * Anatomy label layout. Pure function, so it can be unit-reasoned and tested.
 *
 * Rules:
 *  - sort by anchor y
 *  - enforce a step between label tops larger than the tallest box (tallest + gap)
 *  - clamp inside the viewport
 *  - on narrow screens, stack at the bottom
 */
export interface LayoutIn {
  anchors: { x: number; y: number }[]
  heights: number[]
  sides: ('left' | 'right')[] // fixed per label so labels never jump sides
  vw: number
  vh: number
}
export interface LayoutOut {
  x: number
  y: number
  w: number
  attachX: number
  attachY: number
}

export const NARROW_BP = 900

export function layoutLabels(inp: LayoutIn): LayoutOut[] {
  const { anchors, heights, sides, vw, vh } = inp
  const n = anchors.length
  const out: LayoutOut[] = new Array(n)
  const margin = Math.max(16, Math.round(vw * 0.035))
  const gap = 14
  const tallest = Math.max(...heights, 0)
  const step = tallest + gap
  const topLimit = 72 // below the fixed header

  if (vw < NARROW_BP) {
    const w = vw - margin * 2
    const order = [...Array(n).keys()].sort((a, b) => anchors[a].y - anchors[b].y)
    let y = vh - margin - heights[order[n - 1]]
    for (let k = n - 1; k >= 0; k--) {
      const i = order[k]
      if (k < n - 1) y -= step
      out[i] = { x: margin, y, w, attachX: margin + 18, attachY: y }
    }
    return out
  }

  const w = Math.min(300, Math.max(190, vw * 0.22))
  for (const side of ['left', 'right'] as const) {
    const idx = [...Array(n).keys()].filter((i) => sides[i] === side).sort((a, b) => anchors[a].y - anchors[b].y)
    if (!idx.length) continue
    const ys = idx.map((i) => anchors[i].y - heights[i] / 2)
    for (let k = 1; k < ys.length; k++) ys[k] = Math.max(ys[k], ys[k - 1] + step)
    const last = idx.length - 1
    const bottomMax = vh - margin - heights[idx[last]]
    if (ys[last] > bottomMax) {
      ys[last] = bottomMax
      for (let k = last - 1; k >= 0; k--) ys[k] = Math.min(ys[k], ys[k + 1] - step)
    }
    if (ys[0] < topLimit) {
      ys[0] = topLimit
      for (let k = 1; k < ys.length; k++) ys[k] = Math.max(ys[k], ys[k - 1] + step)
    }
    idx.forEach((i, k) => {
      const x = side === 'left' ? margin : vw - margin - w
      out[i] = {
        x,
        y: ys[k],
        w,
        attachX: side === 'left' ? x + w : x,
        attachY: ys[k] + 16,
      }
    })
  }
  return out
}
