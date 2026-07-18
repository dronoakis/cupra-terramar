import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { MeshoptDecoder } from 'three-stdlib'
import { useApp } from '../store'

const MODEL_URL = '/cupra-terramar.glb'

export function CarModel() {
  const group = useRef<THREE.Group>(null!)
  const gltf = useGLTF(MODEL_URL, undefined, undefined, (loader: any) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  }) as any
  const { actions, mixer } = useAnimations(gltf.animations, group)

  const bodyColor = useApp((s) => s.bodyColor)
  const doorsOpen = useApp((s) => s.doorsOpen)
  const autoOrbit = useApp((s) => s.autoOrbit)
  const started = useApp((s) => s.started)
  const setReady = useApp((s) => s.setReady)

  const paintMats = useRef<THREE.MeshPhysicalMaterial[]>([])
  const drlWhite = useRef<THREE.MeshStandardMaterial[]>([])
  const drlMeshes = useRef<THREE.Object3D[]>([])
  const tailMeshes = useRef<THREE.Object3D[]>([])
  const drlRed = useRef<THREE.MeshStandardMaterial[]>([])
  const targetColor = useRef(new THREE.Color(bodyColor))
  const rimFlash = useRef(0)

  /* one-time setup: normalize, collect materials, register explodables */
  useMemo(() => {
    const root: THREE.Object3D = gltf.scene
    root.traverse((o: any) => {
      if (!o.isMesh) return
      o.castShadow = true
      const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m: any) => {
        if (!m) return
        const n = (m.name || '').toLowerCase()
        /* painted body panels: dedicated paint materials + baked exterior atlases
           (doors / tailgate are exported as *_ANIM_EXT_*_SingleMaterial with a
           greyscale texture, so tinting via material.color recolours them) */
        const isPaint =
          n.includes('carpaint') ||
          (n.includes('anim_ext_') && n.includes('singlematerial'))
        if (isPaint) {
          m.clearcoat = 1
          m.clearcoatRoughness = 0.06
          m.envMapIntensity = 1.5
          if (!paintMats.current.includes(m)) paintMats.current.push(m)
        }
        if (n.includes('glass')) m.envMapIntensity = 1.4
        if (n.includes('lightswhite')) { m.emissive = new THREE.Color('#ffe9c4'); m.emissiveIntensity = 0; drlWhite.current.push(m); drlMeshes.current.push(o) }
        if (n.includes('lightsred')) { m.emissive = new THREE.Color('#ff2020'); m.emissiveIntensity = 0; drlRed.current.push(m); tailMeshes.current.push(o) }
      })
    })

    /* fallback: if paint materials were renamed by an optimizer, detect them by clearcoat */
    if (!paintMats.current.length) {
      root.traverse((o: any) => {
        if (!o.isMesh) return
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m: any) => {
          if (m && m.clearcoat > 0 && m.color && !paintMats.current.includes(m)) {
            m.clearcoat = 1
            m.clearcoatRoughness = 0.06
            m.envMapIntensity = 1.5
            paintMats.current.push(m)
          }
        })
      })
    }

    /* center & scale to length 5, sit on ground */
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const s = 5 / Math.max(size.x, size.y, size.z)
    root.scale.setScalar(s)
    root.updateMatrixWorld(true)
    const b2 = new THREE.Box3().setFromObject(root)
    const c2 = b2.getCenter(new THREE.Vector3())
    root.position.set(-c2.x, -b2.min.y, -c2.z)

  }, [gltf])

  useEffect(() => {
    setReady(true)
    /* cabin camera pose from named anchor nodes: steering wheel, both front seats, headlight */
    const root: THREE.Object3D = gltf.scene
    root.updateMatrixWorld(true)
    const centerOf = (...names: string[]) => {
      for (const nm of names) {
        const n = root.getObjectByName(nm)
        if (n) return new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3())
      }
      return null
    }
    const sw = centerOf('Combined_ALIAS_SteeringWheel', 'ALIAS_SteeringWheel')
    const fl = centerOf('Combined_ALIAS_Seat_FL', 'ALIAS_Seat_FL')
    const fr = centerOf('Combined_ALIAS_Seat_FR', 'ALIAS_Seat_FR')
    const hl = centerOf('Combined_ALIAS_Headlight', 'ALIAS_Headlight')
    if (sw && fl && fr && hl) {
      const seatMid = fl.clone().add(fr).multiplyScalar(0.5)
      const fwd = hl.clone().sub(seatMid); fwd.y = 0; fwd.normalize()
      const camY = sw.y + 0.32                    // just above the wheel rim, at headrest level
      const tgt = seatMid.clone().addScaledVector(fwd, 2.2)
      useApp.getState().setCabinPose({
        pos: [seatMid.x, camY, seatMid.z],
        tgt: [tgt.x, sw.y - 0.26, tgt.z],         // pitched down onto the dash
      })
    }
  }, [setReady])

  /* body color: cinematic transition target */
  useEffect(() => {
    targetColor.current.set(bodyColor)
    rimFlash.current = 1
  }, [bodyColor])

  /* doors */
  useEffect(() => {
    Object.values(actions).forEach((a: any) => {
      if (!a) return
      a.clampWhenFinished = true
      a.setLoop(THREE.LoopOnce, 1)
      a.paused = false
      a.timeScale = doorsOpen ? 1 : -1
      if (doorsOpen) { a.reset(); a.play() }
      else { a.play(); if (a.time === 0) a.time = a.getClip().duration }
    })
  }, [doorsOpen, actions])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    /* paint lerp */
    paintMats.current.forEach((m) => m.color.lerp(targetColor.current, Math.min(1, d * 3)))
    if (rimFlash.current > 0) rimFlash.current = Math.max(0, rimFlash.current - d * 0.7)

    /* DRL: night phases + after ignition */
    const p = useApp.getState().progress
    const night = THREE.MathUtils.clamp((p - 3.4) / 0.8, 0, 1)
    const ign = started ? 1 : 0
    const v = Math.max(night, ign * THREE.MathUtils.clamp(1 - p * 2, 0.35, 1))
    drlWhite.current.forEach((m) => (m.emissiveIntensity = v * 2.2))
    drlRed.current.forEach((m) => (m.emissiveIntensity = v * 1.6))

    /* idle sway before start / auto orbit */
    if (!started) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.15
    else if (autoOrbit) group.current.rotation.y += d * 0.25
  })

  /* expose rim flash for lights rig via store-free ref hack */
  ;(CarModel as any).rimFlash = rimFlash

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, undefined, undefined, (loader: any) => loader.setMeshoptDecoder(MeshoptDecoder))
