import * as THREE from 'three/webgpu'
import { PAL } from './ring'

/**
 * Reflections: a PMREM baked from a tiny scene of four emissive strip lights.
 * No drei Environment / Lightformer. Built once, then reused as scene.environment.
 */
export async function buildEnv(renderer: any) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(PAL.ink)
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []

  const strip = (hex: string, k: number, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d)
    const m: any = new THREE.MeshBasicNodeMaterial()
    m.color = new THREE.Color(hex).multiplyScalar(k) // > 1 = HDR emissive
    m.toneMapped = false
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    scene.add(mesh)
    geos.push(g)
    mats.push(m)
  }
  strip(PAL.bone, 7, 9, 0.25, 1.2, 0, 4.2, 1.5) //   key strip above
  strip(PAL.accent, 4, 0.25, 6, 1.2, -5, 0.5, 1) //   cool strip, left
  strip(PAL.warm, 4.5, 0.25, 5, 1.2, 5, -0.5, 0) //   warm strip, right
  strip(PAL.mist, 3, 8, 0.2, 1, 0, -3.8, -2) //       low rim strip

  const pmrem: any = new THREE.PMREMGenerator(renderer)
  const rt: any = pmrem.fromSceneAsync ? await pmrem.fromSceneAsync(scene, 0.02, 0.1, 50) : pmrem.fromScene(scene, 0.02, 0.1, 50)

  return {
    texture: rt.texture as THREE.Texture,
    dispose() {
      rt.dispose?.()
      pmrem.dispose?.()
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
    },
  }
}
