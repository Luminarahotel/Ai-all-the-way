import * as THREE from 'three/webgpu'
import { dot, fract, length, mix, pass, sin, smoothstep, time, uniform, uv, vec2, clamp, float, color, pow } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { S, type Pt } from '../scroll/state'
import { measureRanges, uFromP } from '../scroll/ranges'
import { createRing, FINISH, PAL } from './ring'
import { buildEnv } from './env'
import { createParticles, LEVEL_Y } from './particles'
import { camCurve, sampleRow } from './path'
import type { Tier } from '../lib/tier'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Everything imperative lives here (no JSX), so React only owns the Canvas.
 * Returns update() / render() / dispose().
 */
export async function createWorld(renderer: any, scene: THREE.Scene, camera: THREE.PerspectiveCamera, tier: Tier) {
  scene.background = new THREE.Color(PAL.ink)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.info.autoReset = false

  const env = await buildEnv(renderer)
  scene.environment = env.texture
  ;(scene as any).environmentIntensity = 0.9

  const ring = createRing()
  scene.add(ring.group)

  const particles = createParticles(tier === 'high' ? 12000 : 5000)
  scene.add(particles.mesh)

  // accent glow behind the ring (waitlist): radial falloff in TSL, additive
  const uGlow = uniform(0)
  const glowGeo = new THREE.PlaneGeometry(1, 1)
  const glowMat: any = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const dist = length(uv().sub(0.5)).mul(2.0)
  const falloff = pow(clamp(float(1).sub(dist), 0.0, 1.0), 2.2)
  glowMat.colorNode = mix(color(PAL.accent), color(PAL.warm), 0.22)
  glowMat.opacityNode = falloff.mul(uGlow).mul(0.55)
  const glow = new THREE.Mesh(glowGeo, glowMat)
  glow.renderOrder = -1
  glow.frustumCulled = false
  scene.add(glow)

  // post: ONE system (three's own node pipeline), passes merged into a single output node
  let pipeline: any = null
  try {
    const PP = (THREE as any).RenderPipeline ?? (THREE as any).PostProcessing
    pipeline = new PP(renderer)
    const scenePass = pass(scene, camera)
    const c: any = scenePass.getTextureNode('output')
    const b: any = bloom(c, tier === 'high' ? 0.45 : 0.35, 0.55, 0.85)
    let out: any = c.add(b)
    if (tier === 'high') {
      const len = length(uv().sub(0.5))
      const vig = float(1).sub(smoothstep(0.3, 0.9, len.mul(1.25)).mul(0.55))
      const grain = fract(sin(dot(uv().add(time.mul(0.01)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5).mul(0.025)
      out = out.mul(vig).add(grain)
    }
    pipeline.outputNode = out
  } catch (e) {
    console.warn('post-processing unavailable, rendering directly', e)
    pipeline = null
  }

  // state
  let sp = -1
  let yaw = 0
  let started = false
  const finishCol = new THREE.Color(FINISH.silver.color)
  let fMetal = FINISH.silver.metalness
  let fRough = FINISH.silver.roughness
  const tmpC = new THREE.Color()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const look = new THREE.Vector3()
  const ringPos = new THREE.Vector3()
  const euler = new THREE.Euler(0, 0, 0, 'YXZ')

  const onPointer = (e: PointerEvent) => {
    S.px = (e.clientX / window.innerWidth) * 2 - 1
    S.py = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  const proj = (p: THREE.Vector3, o: Pt, w: number, h: number) => {
    v2.copy(p).project(camera)
    o.x = (v2.x * 0.5 + 0.5) * w
    o.y = (-v2.y * 0.5 + 0.5) * h
    o.v = v2.z < 1 ? 1 : 0
  }

  measureRanges()

  return {
    update(dt: number) {
      const w = window.innerWidth
      const h = window.innerHeight
      const aspect = w / h
      const narrow = aspect < 0.9
      dt = Math.min(dt, 0.1)

      if (!S.driven) {
        const max = Math.max(1, document.documentElement.scrollHeight - h)
        S.p = window.scrollY / max
      }
      if (sp < 0) sp = S.p
      sp = lerp(sp, S.p, 1 - Math.exp(-5 * dt)) // damping

      const u = uFromP(sp)
      const row = sampleRow(u)

      // camera rides the curve; hero gets cursor parallax
      camCurve.getPoint(Math.min(Math.max(u, 0), 1), v1)
      camera.position.copy(v1)
      look.set(0, 0, 0)
      camera.lookAt(look)
      camera.updateMatrixWorld()
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      up.setFromMatrixColumn(camera.matrixWorld, 1)
      const heroW = Math.max(0, 1 - u * 14)
      if (heroW > 0) {
        camera.position.addScaledVector(right, S.px * 0.28 * heroW).addScaledVector(up, -S.py * 0.18 * heroW)
        camera.lookAt(look)
        camera.updateMatrixWorld()
        right.setFromMatrixColumn(camera.matrixWorld, 0)
        up.setFromMatrixColumn(camera.matrixWorld, 1)
      }
      const dcam = camera.position.distanceTo(look)
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * dcam
      const halfW = halfH * aspect

      // ring: shifted with the camera curve so text never sits on it
      ringPos.copy(look)
      ringPos.addScaledVector(right, (narrow ? row.mx : row.dx) * halfW)
      ringPos.addScaledVector(up, (narrow ? row.my : row.dy) * halfH)
      ring.group.position.copy(ringPos)
      const sc = narrow ? row.scn : row.sc
      ring.group.scale.setScalar(sc)

      yaw += dt * row.spin
      const wrapped = Math.atan2(Math.sin(yaw), Math.cos(yaw))
      const yawTarget = 0.5
      euler.set(row.rx + S.py * -0.06 * heroW, lerp(wrapped, yawTarget, row.lk) + S.px * 0.12 * heroW, row.rz)
      ring.group.setRotationFromEuler(euler)
      const ex = narrow ? row.ex * 0.6 : row.ex
      ring.setExplode(ex)

      // finish: smooth lerp toward the chosen finish
      const f = FINISH[S.finish]
      const k = 1 - Math.exp(-6 * dt)
      finishCol.lerp(tmpC.set(f.color), k)
      fMetal = lerp(fMetal, f.metalness, k)
      fRough = lerp(fRough, f.roughness, k)
      ring.shellMat.color.copy(finishCol)
      ring.shellMat.metalness = fMetal
      ring.shellMat.roughness = fRough

      // particles
      const waveHalfW = Math.tan((camera.fov * Math.PI) / 360) * 7.4 * aspect
      particles.uWidth.value = waveHalfW * 0.86
      particles.uMorph.value = row.mo
      particles.uAlpha.value = row.pa
      particles.uRight.value.copy(right)
      particles.uUp.value.copy(up)
      particles.mesh.visible = row.pa > 0.01

      // glow
      uGlow.value = row.gl
      glow.visible = row.gl > 0.02
      glow.position.copy(ringPos).addScaledVector(v1.copy(camera.position).sub(ringPos).normalize(), -0.9)
      glow.quaternion.copy(camera.quaternion)
      glow.scale.setScalar(Math.max(0.01, 7.5 * sc))

      // publish projected anchors / stage rows / ring circle for the DOM
      S.ex = ex
      S.morph = row.mo
      for (let i = 0; i < 3; i++) {
        ring.anchorWorld(i, v1)
        proj(v1, S.anchors[i], w, h)
      }
      for (let i = 0; i < 4; i++) {
        v1.set(-particles.uWidth.value * 1.04, LEVEL_Y[i], 0)
        proj(v1, S.stages[i], w, h)
        S.stages[i].v = row.pa > 0.6 ? 1 : 0
      }
      proj(ringPos, S.ring as unknown as Pt, w, h)
      const rw = sc * Math.hypot(1.2, 1.45 * ex + 0.3)
      v1.copy(ringPos).addScaledVector(right, rw)
      v2.copy(v1).project(camera)
      const x2 = (v2.x * 0.5 + 0.5) * w
      S.ring.r = Math.abs(x2 - S.ring.x)
      S.ring.v = 1

      if (!started) {
        started = true
        S.ready = true
      }
    },
    render() {
      renderer.info.reset()
      if (pipeline) pipeline.render()
      else renderer.render(scene, camera)
      return renderer.info.render.calls as number
    },
    dispose() {
      window.removeEventListener('pointermove', onPointer)
      ring.dispose()
      particles.dispose()
      glowGeo.dispose()
      glowMat.dispose()
      env.dispose()
      pipeline?.dispose?.()
      scene.environment = null
      scene.remove(ring.group, particles.mesh, glow)
    },
  }
}
