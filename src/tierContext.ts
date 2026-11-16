import { createContext, useContext } from 'react'
import type { Tier } from './lib/tier'

export interface Ctx {
  tier: Tier | null
  pinned: boolean // sticky, scrubbed layout (only when a 3D tier is active)
}
export const TierCtx = createContext<Ctx>({ tier: null, pinned: false })
export const useTier = () => useContext(TierCtx)
