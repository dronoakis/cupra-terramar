import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
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
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = useApp.getState()
    const dist = Math.abs(target.current - s.progress)
    /* adaptive: big scroll jumps settle fast so the camera never lags behind */
    const k = Math.min(1, dt * (4 + dist * 6))
    const cur = s.progress + (target.current - s.progress) * k
    if (Math.abs(cur - s.progress) > 1e-4) s.setProgress(cur)
  })
  return null
}

function Effects() {
  const bloomRef = useRef<any>(null)
  useFrame(() => {
    const p = useApp.getState().progress
    if (bloomRef.current) bloomRef.current.intensity = 0.45 + THREE.MathUtils.clamp((p - 3.4) / 1.5, 0, 1) * 0.55
  })
  return (
    <EffectComposer>
      <Bloom ref={bloomRef} intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
      <ChromaticAberration offset={[0.00055, 0.0004] as any} radialModulation modulationOffset={0.35} />
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
          shadows
          dpr={[1, 2]}
          camera={{ position: [1.2, 1.0, 3.4], fov: 40, near: 0.1, far: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
            scene.background = new THREE.Color('#0e0e12')
            const pmrem = new THREE.PMREMGenerator(gl)
            scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
          }}
        >
          <Backdrops />
          <Suspense fallback={null}>
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
