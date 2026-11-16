import * as THREE from 'three/webgpu'
import { color, sin, smoothstep, time, uv } from 'three/tsl'
import type { Finish } from '../content'

// Only the six palette tokens are used anywhere in the scene.
export const PAL = {
  ink: '#07080C',
  deep: '#0E1220',
  mist: '#AAB4D4',
  bone: '#F2EFE9',
  accent: '#8FA8FF',
  warm: '#FFC48A',
}

export const FINISH: Record<Finish, { color: string; metalness: number; roughness: number }> = {
  silver: { color: PAL.bone, metalness: 1.0, roughness: 0.22 },
  graphite: { color: PAL.deep, metalness: 0.55, roughness: 0.34 },
  gold: { color: PAL.warm, metalness: 1.0, roughness: 0.28 },
}

/**
 * Procedural ring from tori. 3 meshes = 3 draw calls.
 *  shell   : the visible band
 *  sensor  : thin inner band that sits against the skin
 *  battery : partial arc that hides inside the shell until it comes apart
 */
export function createRing() {
  const group = new THREE.Group()
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []

  const shellGeo = new THREE.TorusGeometry(1, 0.15, 48, 160)
  const shellMat: any = new THREE.MeshPhysicalNodeMaterial({
    color: FINISH.silver.color,
    metalness: FINISH.silver.metalness,
    roughness: FINISH.silver.roughness,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
  })
  const shell = new THREE.Mesh(shellGeo, shellMat)
  shell.scale.z = 1.7

  const sensorGeo = new THREE.TorusGeometry(0.78, 0.055, 32, 128)
  const sensorMat: any = new THREE.MeshStandardNodeMaterial({ color: PAL.deep, metalness: 0.4, roughness: 0.45 })
  // small accent dots around the band that breathe slowly
  const dots = smoothstep(0.82, 1.0, sin(uv().x.mul(Math.PI * 2 * 22)))
  const pulse = sin(time.mul(1.4)).mul(0.25).add(0.75)
  sensorMat.emissiveNode = color(PAL.accent).mul(dots.mul(0.9).add(0.08)).mul(pulse)
  const sensor = new THREE.Mesh(sensorGeo, sensorMat)
  sensor.scale.z = 1.5

  const batteryGeo = new THREE.TorusGeometry(0.93, 0.065, 24, 96, Math.PI * 1.25)
  const batteryMat: any = new THREE.MeshStandardNodeMaterial({ color: PAL.mist, metalness: 0.45, roughness: 0.4 })
  batteryMat.emissiveNode = color(PAL.warm).mul(0.14)
  const battery = new THREE.Mesh(batteryGeo, batteryMat)
  battery.scale.z = 1.1
  const batteryBaseRot = -0.3 * Math.PI
  battery.rotation.z = batteryBaseRot

  group.add(shell, sensor, battery)
  geos.push(shellGeo, sensorGeo, batteryGeo)
  mats.push(shellMat, sensorMat, batteryMat)

  const a = (deg: number, r: number) => new THREE.Vector3(Math.cos(deg * (Math.PI / 180)) * r, Math.sin(deg * (Math.PI / 180)) * r, 0)
  // anchors in mesh-local space: [mesh, local point]. Order matches the DOM labels.
  const anchorDefs: [THREE.Object3D, THREE.Vector3][] = [
    [shell, a(40, 1.15)], //   outer shell, upper right
    [sensor, a(180, 0.835)], // sensor band, left
    [battery, a(34, 0.93)], //  battery arc, lower right (arc starts at -54 deg in world)
  ]

  const _v = new THREE.Vector3()
  return {
    group,
    shell,
    sensorMat,
    shellMat,
    /** 0 = assembled, 1 = fully apart along the ring axis */
    setExplode(e: number) {
      shell.position.z = e * 1.45
      battery.position.z = -e * 1.45
      battery.rotation.z = batteryBaseRot + e * 0.25
      sensor.rotation.z = -e * 0.15
    },
    anchorWorld(i: number, out: THREE.Vector3) {
      const [mesh, p] = anchorDefs[i]
      mesh.updateWorldMatrix(true, false)
      return out.copy(_v.copy(p)).applyMatrix4(mesh.matrixWorld)
    },
    dispose() {
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
    },
  }
}
