import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing'
import { Stage } from './components/Stage'
import { Backdrops } from './components/Backdrops'
import { CameraRig } from './components/CameraRig'
import { Overlay } from './components/Overlay'
import { PHASES, useApp } from './store'

/* syncs window scroll → phase progress with smoothing */
function ScrollSync() {
  const target = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      const ms = document.body.scrollHeight - innerHeight
      target.current = (ms > 0 ? scrollY / ms : 0) * (PHASES.length - 1)
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => removeEventListener('scroll', onScroll)
  }, [])
  useFrame((_, dt) => {
    const s = useApp.getState()
    const cur = s.progress + (target.current - s.progress) * Math.min(1, Math.min(dt, 0.05) * 4)
    if (Math.abs(cur - s.progress) > 1e-4) s.setProgress(cur)
  })
  return null
}

function Effects() {
  const p = useApp((s) => s.progress)
  const bloomI = 0.45 + THREE.MathUtils.clamp((p - 2.4) / 1.5, 0, 1) * 0.55
  return (
    <EffectComposer>
      <DepthOfField focusDistance={0.012} focalLength={0.06} bokehScale={2.5} />
      <Bloom intensity={bloomI} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
      <Noise opacity={0.045} />
      <Vignette eskil={false} offset={0.28} darkness={0.78} />
    </EffectComposer>
  )
}

export default function App() {
  return (
    <>
      <div className="stage">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [1.2, 1.0, 3.4], fov: 40, near: 0.1, far: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
            scene.background = new THREE.Color('#0e0e12')
          }}
        >
          <Backdrops />
          <Suspense fallback={null}>
            <Environment resolution={256} frames={1}>
              <Lightformer intensity={3} rotation-x={Math.PI / 2} position={[0, 5, 0]} scale={[12, 12, 1]} />
              <Lightformer intensity={1.6} rotation-y={Math.PI / 2} position={[-6, 1.5, 0]} scale={[8, 2, 1]} color="#ffffff" />
              <Lightformer intensity={1.2} rotation-y={-Math.PI / 2} position={[6, 1.5, 0]} scale={[8, 2, 1]} color="#e6935a" />
              <Lightformer intensity={0.8} rotation-y={Math.PI} position={[0, 1.5, -7]} scale={[10, 1.5, 1]} color="#88aaff" />
            </Environment>
            <Stage />
          </Suspense>
          <CameraRig />
          <ScrollSync />
          <Effects />
        </Canvas>
      </div>
      <Overlay />
    </>
  )
}
