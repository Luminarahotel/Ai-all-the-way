import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { createWorld } from './world'
import { S } from '../scroll/state'
import type { Tier } from '../lib/tier'

interface Props {
  tier: Tier
  renderer: 'auto' | 'webgl' | 'webgpu'
  small: boolean
  onReady: () => void
  onFail: () => void
}

class Boundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('3D layer failed, falling back to poster', err)
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function World({ tier, onReady }: { tier: Tier; onReady: () => void }) {
  const { gl, scene, camera } = useThree()
  const world = useRef<Awaited<ReturnType<typeof createWorld>> | null>(null)

  useEffect(() => {
    let dead = false
    let created: Awaited<ReturnType<typeof createWorld>> | null = null
    createWorld(gl, scene, camera as THREE.PerspectiveCamera, tier).then((w) => {
      if (dead) {
        w.dispose()
        return
      }
      created = w
      world.current = w
      const L = window.__lumo
      if (L) {
        L.ready = true
        L.backend = (gl as any).backend?.isWebGPUBackend ? 'webgpu' : 'webgl'
      }
      onReady()
    })
    return () => {
      dead = true
      world.current = null
      created?.dispose() // geometries, materials, textures, pipeline
    }
  }, [gl, scene, camera, tier, onReady])

  // priority 1 = we own the render call (post-processing pipeline)
  useFrame((state, dt) => {
    const w = world.current
    if (!w) return
    w.update(dt)
    const calls = w.render()
    const L = window.__lumo
    if (L) {
      L.frames++
      L.drawCalls = calls
      L.maxCalls = Math.max(L.maxCalls, calls)
    }
  }, 1)
  return null
}

export default function SceneRoot({ tier, renderer, small, onReady, onFail }: Props) {
  const [running, setRunning] = useState(true)
  const wrap = useRef<HTMLDivElement>(null)
  const visible = useRef(true)
  const tabVisible = useRef(!document.hidden)

  useEffect(() => {
    window.__lumo = Object.assign(window.__lumo ?? {}, {
      state: S,
      tier,
      ready: false,
      backend: '',
      frames: 0,
      drawCalls: 0,
      maxCalls: 0,
      paused: false,
    })
    const apply = () => {
      const run = visible.current && tabVisible.current
      setRunning(run)
      if (window.__lumo) window.__lumo.paused = !run
    }
    const onVis = () => {
      tabVisible.current = !document.hidden
      apply()
    }
    document.addEventListener('visibilitychange', onVis)
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting
      apply()
    })
    if (wrap.current) io.observe(wrap.current)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      io.disconnect()
    }
  }, [tier])

  const dprCap = small ? 1.5 : 2
  return (
    <div className="gl" aria-hidden="true" ref={wrap}>
      <Boundary onFail={onFail}>
        <Canvas
          frameloop={running ? 'always' : 'never'}
          dpr={[1, dprCap]}
          camera={{ fov: 35, near: 0.1, far: 60, position: [0, 0, 6.4] }}
          gl={async (props: any) => {
            const r: any = new THREE.WebGPURenderer({
              canvas: props.canvas,
              antialias: tier === 'high',
              powerPreference: 'high-performance',
              forceWebGL: renderer === 'webgl',
            } as any)
            await r.init()
            return r
          }}
        >
          <World tier={tier} onReady={onReady} />
        </Canvas>
      </Boundary>
    </div>
  )
}
