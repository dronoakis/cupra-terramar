import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { easeInOut, useApp } from '../store'

const CAM: Array<[[number, number, number], [number, number, number], number]> = [
  [[0, 1.7, 9.5], [0, 1.0, 0], 38],
  [[6.5, 1.4, 5.5], [0, 0.95, 0], 34],
  [[-5.5, 1.1, 6.5], [0, 1.0, 0], 40],
  [[-7, 1.8, -4], [0, 1.0, 0], 34],
  [[0, 2.6, 8], [0, 0.95, 0], 42],
  [[0, 2.1, 11], [0, 1.0, 0], 36],
]

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

    /* mouse parallax */
    par.current.x += (state.pointer.x * 0.5 - par.current.x) * Math.min(1, dt * 4)
    par.current.y += (state.pointer.y * 0.5 - par.current.y) * Math.min(1, dt * 4)
    vPos.x += par.current.x * 1.4
    vPos.y += par.current.y * 0.8

    camera.position.lerp(vPos, Math.min(1, dt * 3.2))
    camera.lookAt(vTgt)
    const pc = camera as THREE.PerspectiveCamera
    if (Math.abs(pc.fov - fov) > 0.01) { pc.fov = THREE.MathUtils.lerp(pc.fov, fov, Math.min(1, dt * 3)); pc.updateProjectionMatrix() }
  })

  return null
}
