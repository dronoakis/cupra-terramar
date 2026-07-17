import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PHASES, easeInOut, useApp } from '../store'

/* Kling-generated environment plates. Missing files are skipped gracefully. */
const FILES = ['/backdrops/bg-1.jpg', '/backdrops/bg-2.jpg', '/backdrops/bg-3.jpg', '/backdrops/bg-4.jpg', '/backdrops/bg-5.jpg']
const MAP = [0, 1, 2, 3, 4, 0] // phase index → plate index (finale reuses studio)

export function Backdrops() {
  const { camera, scene } = useThree()
  const rig = useRef(new THREE.Group())
  const matA = useRef<THREE.MeshBasicMaterial>(null!)
  const matB = useRef<THREE.MeshBasicMaterial>(null!)
  const [textures, setTextures] = useState<(THREE.Texture | null)[]>([null, null, null, null, null])

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    FILES.forEach((url, i) => {
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace
          setTextures((prev) => { const n = [...prev]; n[i] = t; return n })
        },
        undefined,
        () => { /* plate absent — keep gradient background */ },
      )
    })
  }, [])

  /* attach rig to camera so plates always fill the view from any angle */
  useEffect(() => {
    scene.add(camera)
    camera.add(rig.current)
    rig.current.position.set(0, 0, -90)
    return () => { camera.remove(rig.current); scene.remove(camera) }
  }, [camera, scene])

  useFrame((state) => {
    const p = useApp.getState().progress
    const i = Math.min(Math.floor(p), PHASES.length - 2)
    const t = easeInOut(THREE.MathUtils.clamp(p - i, 0, 1))
    const texA = textures[MAP[i]]
    const texB = textures[MAP[i + 1]]

    if (matA.current) {
      matA.current.map = texA
      matA.current.opacity = texA ? (1 - t) * 0.85 : 0
      matA.current.needsUpdate = true
    }
    if (matB.current) {
      matB.current.map = texB
      matB.current.opacity = texB ? t * 0.85 : 0
      matB.current.needsUpdate = true
    }
    /* subtle counter-parallax for depth */
    rig.current.position.x = -state.pointer.x * 4
    rig.current.position.y = -state.pointer.y * 2.5
  })

  return (
    <group ref={rig as any}>
      <mesh renderOrder={-20}>
        <planeGeometry args={[260, 100]} />
        <meshBasicMaterial ref={matA} transparent opacity={0} depthWrite={false} depthTest={true} fog={false} color="#8f8b88" toneMapped={false} />
      </mesh>
      <mesh renderOrder={-19}>
        <planeGeometry args={[260, 100]} />
        <meshBasicMaterial ref={matB} transparent opacity={0} depthWrite={false} depthTest={true} fog={false} color="#8f8b88" toneMapped={false} />
      </mesh>
    </group>
  )
}
