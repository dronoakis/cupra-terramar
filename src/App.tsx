import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
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
  const bloomI = 0.45 + THREE.MathUtils.clamp((p - 3.4) / 1.5, 0, 1) * 0.55
  return (
    <EffectComposer>
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
