import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PHASES, easeInOut, useApp } from '../store'
import { CarModel } from './CarModel'

const cA = new THREE.Color(), cB = new THREE.Color()
const lerpC = (a: string, b: string, t: number, out: THREE.Color) => out.copy(cA.set(a)).lerp(cB.set(b), t)

export function Stage() {
  const lite = useApp((s) => s.lite)
  const keyRef = useRef<THREE.DirectionalLight>(null!)
  const hemiRef = useRef<THREE.HemisphereLight>(null!)
  const rimRef = useRef<THREE.DirectionalLight>(null!)
  const fillRef = useRef<THREE.DirectionalLight>(null!)
  const ambARef = useRef<THREE.PointLight>(null!)
  const ambBRef = useRef<THREE.PointLight>(null!)
  const groundMat = useRef<THREE.MeshStandardMaterial>(null!)
  const fogRef = useRef<THREE.FogExp2>(null!)
  const { gl, scene } = useThree()

  const roughTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d')!
    const img = g.createImageData(512, 512)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 150 + Math.random() * 105
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6)
    return t
  }, [])

  const shadowTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(128, 128, 10, 128, 128, 120)
    grd.addColorStop(0, 'rgba(0,0,0,.85)'); grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state, dt) => {
    const raw = useApp.getState().progress
    const p = isFinite(raw) && raw >= 0 ? raw : 0
    const i = Math.min(Math.max(0, Math.floor(p)), PHASES.length - 2)
    const t = easeInOut(THREE.MathUtils.clamp(p - i, 0, 1))
    const A = PHASES[i] ?? PHASES[0], B = PHASES[i + 1] ?? PHASES[PHASES.length - 1]

    lerpC(A.bg, B.bg, t, scene.background as THREE.Color)
    lerpC(A.fog, B.fog, t, fogRef.current.color)
    fogRef.current.density = THREE.MathUtils.lerp(A.fogD, B.fogD, t)
    gl.toneMappingExposure = THREE.MathUtils.lerp(A.exposure, B.exposure, t)

    keyRef.current.intensity = THREE.MathUtils.lerp(A.key[1], B.key[1], t)
    lerpC(A.key[0], B.key[0], t, keyRef.current.color)
    hemiRef.current.intensity = THREE.MathUtils.lerp(A.hemiI, B.hemiI, t)
    lerpC(A.hemiSky, B.hemiSky, t, hemiRef.current.color)
    lerpC(A.hemiGround, B.hemiGround, t, hemiRef.current.groundColor)

    const flash = ((CarModel as any).rimFlash?.current ?? 0) as number
    rimRef.current.intensity = THREE.MathUtils.lerp(A.rim[1], B.rim[1], t) + Math.sin(flash * Math.PI) * 1.8
    lerpC(A.rim[0], B.rim[0], t, rimRef.current.color)
    fillRef.current.intensity = THREE.MathUtils.lerp(A.fill[1], B.fill[1], t)
    lerpC(A.fill[0], B.fill[0], t, fillRef.current.color)

    groundMat.current.roughness = THREE.MathUtils.lerp(A.groundRough, B.groundRough, t)

    /* ambient underglow: on at night+, colored via configurator */
    const night = THREE.MathUtils.clamp((p - 3.4) / 0.8, 0, 1)
    const amb = useApp.getState().ambientColor
    ambARef.current.color.set(amb); ambBRef.current.color.set(amb)
    ambARef.current.intensity = night * 1.3
    ambBRef.current.intensity = night * 1.3
  })

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={['#0a0a0c', 0.014]} />
      <hemisphereLight ref={hemiRef} intensity={0.55} />
      <directionalLight
        ref={keyRef}
        position={[4.5, 9, 5.5]}
        intensity={2.6}
        castShadow
        shadow-mapSize-width={lite ? 512 : 2048}
        shadow-mapSize-height={lite ? 512 : 2048}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0003}
      />
      <directionalLight ref={rimRef} position={[-6, 4, -6]} intensity={1.4} color="#c8703b" />
      <directionalLight ref={fillRef} position={[-4, 3, 7]} intensity={0.5} color="#88aaff" />
      <pointLight ref={ambARef} position={[2.6, 0.5, 2.6]} intensity={0} distance={9} decay={2} />
      <pointLight ref={ambBRef} position={[-2.6, 0.5, -2.6]} intensity={0} distance={9} decay={2} />

      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial
          ref={groundMat}
          color="#0b0b0e"
          roughness={0.22}
          metalness={0.92}
          roughnessMap={roughTex}
          envMapIntensity={2.2}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} renderOrder={1}>
        <planeGeometry args={[6.4, 3.4]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.85} />
      </mesh>

      <CarModel />
      <Rain />
    </>
  )
}

const RAIN_N = 1200
function Rain() {
  const ref = useRef<THREE.Points>(null!)
  const vel = useMemo(() => Float32Array.from({ length: RAIN_N }, () => 0.25 + Math.random() * 0.35), [])
  const positions = useMemo(() => {
    const a = new Float32Array(RAIN_N * 3)
    for (let i = 0; i < RAIN_N; i++) {
      a[i * 3] = (Math.random() - 0.5) * 22
      a[i * 3 + 1] = Math.random() * 15
      a[i * 3 + 2] = (Math.random() - 0.5) * 22
    }
    return a
  }, [])

  useFrame((_, dt) => {
    const p = useApp.getState().progress
    const amt = THREE.MathUtils.clamp((p - 4.5) / 1.0, 0, 1) * THREE.MathUtils.clamp(1 - (p - 6) * 1.6, 0, 1)
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = amt * 0.55
    if (amt <= 0.01) return
    const pos = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < RAIN_N; i++) {
      pos[i * 3 + 1] -= vel[i] * 60 * Math.min(dt, 0.05)
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 15
        pos[i * 3] = (Math.random() - 0.5) * 22
        pos[i * 3 + 2] = (Math.random() - 0.5) * 22
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#aac4e0" size={0.045} transparent opacity={0} depthWrite={false} />
    </points>
  )
}
