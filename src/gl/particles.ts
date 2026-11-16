import * as THREE from 'three/webgpu'
import { attribute, clamp, cos, mix, positionGeometry, select, sin, smoothstep, time, uniform, vec3 } from 'three/tsl'
import { PAL } from './ring'

/** Deterministic PRNG so the dust field is identical on every load. */
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Illustrative night: [stage level, start x in 0..1]. 0 Awake, 1 REM, 2 Light, 3 Deep. Not measured data.
const NIGHT: [number, number][] = [
  [0, 0], [2, 0.05], [3, 0.12], [2, 0.26], [1, 0.34], [2, 0.42],
  [3, 0.5], [2, 0.62], [1, 0.7], [2, 0.78], [1, 0.86], [0, 0.96],
]
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}
export const LEVEL_Y = [0.975, 0.325, -0.325, -0.975] // Awake, REM, Light, Deep (world units)
const levelAt = (x: number) => {
  let l = NIGHT[0][0]
  for (let k = 1; k < NIGHT.length; k++) l += (NIGHT[k][0] - NIGHT[k - 1][0]) * sstep(NIGHT[k][1] - 0.012, NIGHT[k][1] + 0.012, x)
  return l // continuous 0..3
}
const yAtLevel = (l: number) => LEVEL_Y[0] + (LEVEL_Y[3] - LEVEL_Y[0]) * (l / 3)

/**
 * One draw call: an InstancedBufferGeometry of quads. The morph from scattered dust
 * to the sleep-stage waveform runs entirely on the GPU through TSL (uMorph).
 */
export function createParticles(count: number) {
  const rnd = mulberry32(2026)
  const scatter = new Float32Array(count * 3)
  const target = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const stage = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // dust: a wide soft volume around the origin
    const r = 2.5 + rnd() * 7
    const th = rnd() * Math.PI * 2
    const ph = Math.acos(2 * rnd() - 1)
    scatter.set([r * Math.sin(ph) * Math.cos(th) * 1.3, r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th) * 0.6 - 1], i * 3)
    // waveform: x in [-1, 1], scaled on the GPU by uWidth
    const x01 = (i + rnd()) / count
    const lvl = levelAt(x01)
    const gauss = (rnd() + rnd() + rnd() - 1.5) * 0.09
    target.set([x01 * 2 - 1, yAtLevel(lvl) + gauss, (rnd() - 0.5) * 0.3], i * 3)
    seed[i] = rnd()
    stage[i] = Math.min(3, Math.max(0, Math.round(lvl)))
  }

  const base = new THREE.PlaneGeometry(1, 1)
  const geo = new THREE.InstancedBufferGeometry()
  geo.index = base.index
  geo.setAttribute('position', base.getAttribute('position'))
  geo.setAttribute('uv', base.getAttribute('uv'))
  geo.setAttribute('aScatter', new THREE.InstancedBufferAttribute(scatter, 3))
  geo.setAttribute('aTarget', new THREE.InstancedBufferAttribute(target, 3))
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
  geo.setAttribute('aStage', new THREE.InstancedBufferAttribute(stage, 1))
  geo.instanceCount = count

  const uMorph = uniform(0)
  const uAlpha = uniform(0.2)
  const uWidth = uniform(4)
  const uRight = uniform(new THREE.Vector3(1, 0, 0))
  const uUp = uniform(new THREE.Vector3(0, 1, 0))

  const aS = attribute('aScatter', 'vec3')
  const aT = attribute('aTarget', 'vec3')
  const aSeed = attribute('aSeed', 'float')
  const aStage = attribute('aStage', 'float')

  const drift = vec3(
    sin(time.mul(0.3).add(aSeed.mul(40.0))),
    cos(time.mul(0.25).add(aSeed.mul(70.0))),
    sin(time.mul(0.2).add(aSeed.mul(20.0))),
  ).mul(0.22)
  const tgt = vec3(aT.x.mul(uWidth), aT.y, aT.z)
  const m = smoothstep(0.0, 1.0, clamp(uMorph.mul(1.25).sub(aSeed.mul(0.25)), 0.0, 1.0)) // staggered by seed
  const center = mix(aS.add(drift), tgt.add(drift.mul(0.12)), m)
  const size = mix(0.018, 0.02, m)

  const mat: any = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  mat.positionNode = center.add(uRight.mul(positionGeometry.x.mul(size))).add(uUp.mul(positionGeometry.y.mul(size)))

  const cW = uniform(new THREE.Color(PAL.warm))
  const cA = uniform(new THREE.Color(PAL.accent))
  const cM = uniform(new THREE.Color(PAL.mist))
  const cB = uniform(new THREE.Color(PAL.bone))
  const stageCol = select(aStage.lessThan(0.5), cW, select(aStage.lessThan(1.5), cA, select(aStage.lessThan(2.5), cM, cB)))
  mat.colorNode = mix(cM, stageCol, m)
  mat.opacityNode = uAlpha.mul(mix(0.55, 1.0, m)).mul(sin(time.mul(0.8).add(aSeed.mul(60.0))).mul(0.2).add(0.8))

  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -2

  return {
    mesh,
    uMorph,
    uAlpha,
    uWidth,
    uRight,
    uUp,
    dispose() {
      geo.dispose()
      base.dispose()
      mat.dispose()
    },
  }
}
