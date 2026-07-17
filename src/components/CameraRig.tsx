import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { easeInOut, useApp } from '../store'

const CAM: Array<[[number, number, number], [number, number, number], number]> = [
  [[0, 1.5, 7.6], [0, 1.0, 0], 38],
  [[5.2, 1.3, 4.4], [0, 0.95, 0], 34],
  [[-4.4, 1.0, 5.2], [0, 1.0, 0], 40],
  [[-0.35, 1.24, 0.34], [2.5, 1.1, 0.2], 58],   // interior (refined dynamically from headlights)
  [[-5.6, 1.6, -3.2], [0, 1.0, 0], 34],
  [[0, 2.2, 6.6], [0, 0.95, 0], 42],
  [[0, 1.9, 8.8], [0, 1.0, 0], 36],
]

const seatPos = new THREE.Vector3(-0.35, 1.24, 0.34)
const seatTgt = new THREE.Vector3(2.5, 1.1, 0.2)
function refineInterior(front: [number, number, number] | null) {
  if (!front) return
  const dir = new THREE.Vector3(front[0], 0, front[2]).normalize()
  const side = new THREE.Vector3(-dir.z, 0, dir.x) // driver side offset
  seatPos.copy(dir).multiplyScalar(-0.45).addScaledVector(side, 0.34).setY(1.24)
  seatTgt.copy(dir).multiplyScalar(2.6).addScaledVector(side, 0.15).setY(1.08)
  CAM[3][0] = [seatPos.x, seatPos.y, seatPos.z]
  CAM[3][1] = [seatTgt.x, seatTgt.y, seatTgt.z]
}

const vPos = new THREE.Vector3(), vTgt = new THREE.Vector3()
const vA = new THREE.Vector3(), vB = new THREE.Vector3()
const introFrom = new THREE.Vector3(1.2, 1.0, 3.4)

export function CameraRig() {
  const { camera } = useThree()
  const introT = useRef(-1)
  const startedPrev = useRef(false)
  const par = useRef({ x: 0, y: 0 })

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = useApp.getState()
    const p = s.progress

    if (s.started && !startedPrev.current) { startedPrev.current = true; introT.current = 0 }
    if (introT.current >= 0 && introT.current < 1) introT.current = Math.min(1, introT.current + dt / 2.4)

    refineInterior(s.frontPos)

    const i = Math.min(Math.floor(p), CAM.length - 2)
    const t = easeInOut(THREE.MathUtils.clamp(p - i, 0, 1))
    vPos.copy(vA.fromArray(CAM[i][0])).lerp(vB.fromArray(CAM[i + 1][0]), t)
    vTgt.copy(vA.fromArray(CAM[i][1])).lerp(vB.fromArray(CAM[i + 1][1]), t)
    let fov = THREE.MathUtils.lerp(CAM[i][2], CAM[i + 1][2], t)

    if (introT.current >= 0 && introT.current < 1) {
      vPos.lerpVectors(introFrom, vPos, easeInOut(introT.current))
    } else if (!s.started) {
      vPos.copy(introFrom)
      vTgt.set(0, 1.0, 0)
      fov = 40
    }

    /* configurator interior mode overrides scroll framing */
    if (s.interiorMode && s.started) {
      vPos.copy(seatPos)
      vTgt.copy(seatTgt)
      fov = 58
    }

    /* mouse parallax */
    par.current.x += (state.pointer.x * 0.5 - par.current.x) * Math.min(1, dt * 4)
    par.current.y += (state.pointer.y * 0.5 - par.current.y) * Math.min(1, dt * 4)
    const pk = s.interiorMode || (p > 2.5 && p < 3.5) ? 0.25 : 1
    vPos.x += par.current.x * 1.4 * pk
    vPos.y += par.current.y * 0.8 * pk

    camera.position.lerp(vPos, Math.min(1, dt * 3.2))
    camera.lookAt(vTgt)
    const pc = camera as THREE.PerspectiveCamera
    if (Math.abs(pc.fov - fov) > 0.01) { pc.fov = THREE.MathUtils.lerp(pc.fov, fov, Math.min(1, dt * 3)); pc.updateProjectionMatrix() }
  })

  return null
}
