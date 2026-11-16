import { flagRenderer, flagTier } from './flags'

/**
 * high   = full effects (bloom + vignette + grain)
 * mid    = bloom only, fewer particles
 * low    = no post, no 3D: poster with CSS parallax
 * poster = no 3D, no parallax (reduced motion, software renderers, ?tier=poster)
 */
export type Tier = 'high' | 'mid' | 'low' | 'poster'

export interface TierResult {
  tier: Tier
  renderer: 'auto' | 'webgl' | 'webgpu'
  reason: string
  coarse: boolean // touch device: the canvas waits for first interaction
  small: boolean // mobile-sized: DPR cap 1.5
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i

function glInfo(): { ok: boolean; renderer: string } {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return { ok: false, renderer: '' }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, renderer: name }
  } catch {
    return { ok: false, renderer: '' }
  }
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export async function resolveTier(): Promise<TierResult> {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = coarse || window.innerWidth < 768
  const renderer = flagRenderer ?? 'auto'
  const base = { renderer, coarse, small } as const

  if (prefersReducedMotion()) return { ...base, tier: 'poster', reason: 'prefers-reduced-motion' }

  const gl = glInfo()
  if (!gl.ok) return { ...base, tier: 'poster', reason: 'no WebGL' }

  if (flagTier) {
    // an explicit debug flag still respects "no WebGL", but not the software check
    return { ...base, tier: flagTier, reason: `?tier=${flagTier}` }
  }
  if (SOFTWARE.test(gl.renderer)) return { ...base, tier: 'poster', reason: `software renderer (${gl.renderer})` }

  try {
    const { getGPUTier } = await import('detect-gpu')
    const g = await getGPUTier({ benchmarksURL: '/gpu-benchmarks' })
    if (g.tier >= 3) return { ...base, tier: 'high', reason: `detect-gpu tier ${g.tier}` }
    if (g.tier === 2) return { ...base, tier: 'mid', reason: 'detect-gpu tier 2' }
    return { ...base, tier: 'low', reason: `detect-gpu tier ${g.tier}` }
  } catch {
    return { ...base, tier: 'mid', reason: 'detect-gpu unavailable, defaulting to mid' }
  }
}
