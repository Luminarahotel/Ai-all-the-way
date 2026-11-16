const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')

export type TierFlag = 'high' | 'mid' | 'low' | 'poster'
const t = q.get('tier')
const r = q.get('renderer')

/** ?tier=high|mid|low|poster */
export const flagTier: TierFlag | null = t === 'high' || t === 'mid' || t === 'low' || t === 'poster' ? t : null
/** ?renderer=webgl|webgpu */
export const flagRenderer: 'webgl' | 'webgpu' | null = r === 'webgl' || r === 'webgpu' ? r : null
