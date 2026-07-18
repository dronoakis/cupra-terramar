import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { easeInOut, useApp } from '../store'

const CAM: Array<[[number, number, number], [number, number, number], number]> = [
  [[0, 1.5, 7.6], [0, 1.0, 0], 38],
  [[5.2, 1.3, 4.4], [0, 0.95, 0], 34],
  [[-4.4, 1.0, 5.2], [0, 1.0, 0], 40],
  [[0.02, 1.48, 0], [-2.18, 0.9, 0], 70],   // interior fallback (front = -X for this model)
  [[-5.6, 1.6, -3.2], [0, 1.0, 0], 34],
  [[0, 2.2, 6.6], [0, 0.95, 0], 42],
  [[0, 1.9, 8.8], [0, 1.0, 0], 36],
]

const seatPos = new THREE.Vector3(0.02, 1.48, 0)
const seatTgt = new THREE.Vector3(-2.18, 0.9, 0)
function refineInterior(pose: { pos: [number, number, number]; tgt: [number, number, number] } | null) {
  if (!pose) return
  seatPos.fromArray(pose.pos)
  seatTgt.fromArray(pose.tgt)
  CAM[3][0] = pose.pos
  CAM[3][1] = pose.tgt
}

const vPos = new THREE.Vector3(), vTgt = new THREE.Vector3()
const vA = new THREE.Vector3(), vB = new THREE.Vector3()
const introFrom = new THREE.Vector3(1.2, 1.0, 3.4)

/* scroll dwell: camera holds the interior frame over a wide scroll span */
function dwellRemap(p: number) {
  if (p < 2.6) return p
  if (p < 2.9) return 2.6 + ((p - 2.6) / 0.3) * 0.4   // fast approach into cabin
  if (p < 3.45) return 3.0                             // freeze frame inside
  if (p < 3.95) return 3.0 + ((p - 3.45) / 0.5) * 1.0  // leave toward night
  return p
}

export function CameraRig() {
  const { camera, gl } = useThree()
  const introT = useRef(-1)
  const startedPrev = useRef(false)
  const par = useRef({ x: 0, y: 0 })
  const look = useRef({ yaw: 0, pitch: 0, drag: false, lx: 0, ly: 0 })
  const interiorActive = useRef(false)
  const lastP = useRef(0)
  const dwellMix = useRef(1)   // 1 = freeze-frame active (scrolling down), 0 = pass-through (scrolling up)
  const prevP = useRef(0)
  const smSpeed = useRef(0)

  /* drag-to-look inside the cabin */
  useEffect(() => {
    const el = gl.domElement.ownerDocument
    const down = (e: PointerEvent) => {
      if (!interiorActive.current) return
      look.current.drag = true
      look.current.lx = e.clientX; look.current.ly = e.clientY
      useApp.getState().setLooked(true)
    }
    const move = (e: PointerEvent) => {
      if (!look.current.drag || !interiorActive.current) return
      look.current.yaw -= (e.clientX - look.current.lx) * 0.0035
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - (e.clientY - look.current.ly) * 0.0025, -0.55, 0.5)
      look.current.lx = e.clientX; look.current.ly = e.clientY
    }
    const up = () => { look.current.drag = false }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
  }, [gl])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = useApp.getState()
    const p = s.progress

    if (s.started && !startedPrev.current) { startedPrev.current = true; introT.current = 0 }
    if (introT.current >= 0 && introT.current < 1) introT.current = Math.min(1, introT.current + dt / 2.4)

    refineInterior(s.cabinPose)

    /* fast scrolling disables the interior freeze so the camera never feels stuck */
    const speed = Math.abs(p - prevP.current) / Math.max(dt, 0.001)
    prevP.current = p
    smSpeed.current += (speed - smSpeed.current) * Math.min(1, dt * 6)
    const dwellW = THREE.MathUtils.clamp(1 - (smSpeed.current - 0.5) / 0.9, 0, 1)
    const pc0 = THREE.MathUtils.lerp(p, dwellRemap(p), dwellW)
    const wasActive = interiorActive.current
    interiorActive.current = s.interiorMode || (dwellW > 0.55 && p > 2.85 && p < 3.5)
    if (wasActive && !interiorActive.current) s.setLooked(false)

    const i = Math.min(Math.floor(pc0), CAM.length - 2)
    const t = easeInOut(THREE.MathUtils.clamp(pc0 - i, 0, 1))
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
      fov = 70
    }

    /* mouse-look inside the cabin */
    if (interiorActive.current) {
      const dir = vTgt.clone().sub(seatPos)
      const len = dir.length()
      dir.normalize()
      const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), look.current.yaw)
      dir.applyQuaternion(yawQ)
      const side = new THREE.Vector3(-dir.z, 0, dir.x)
      const pitchQ = new THREE.Quaternion().setFromAxisAngle(side, look.current.pitch)
      dir.applyQuaternion(pitchQ)
      vTgt.copy(seatPos).addScaledVector(dir, len)
    } else {
      look.current.yaw *= 0.92
      look.current.pitch *= 0.92
    }

    /* mouse parallax */
    par.current.x += (state.pointer.x * 0.5 - par.current.x) * Math.min(1, dt * 4)
    par.current.y += (state.pointer.y * 0.5 - par.current.y) * Math.min(1, dt * 4)
    const pk = interiorActive.current ? (look.current.drag ? 0 : 0.18) : 1
    vPos.x += par.current.x * 1.4 * pk
    vPos.y += par.current.y * 0.8 * pk

    camera.position.lerp(vPos, Math.min(1, dt * (interiorActive.current ? 6 : 3.2)))
    camera.lookAt(vTgt)
    const pc = camera as THREE.PerspectiveCamera
    if (Math.abs(pc.fov - fov) > 0.01) { pc.fov = THREE.MathUtils.lerp(pc.fov, fov, Math.min(1, dt * 3)); pc.updateProjectionMatrix() }
  })

  return null
}
