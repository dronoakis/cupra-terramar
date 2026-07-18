import { create } from 'zustand'

export type EnvKey = 'STUDIO' | 'DAY' | 'SUNSET' | 'INTERIOR' | 'NIGHT' | 'RAIN' | 'FINALE'

interface AppState {
  ready: boolean
  started: boolean
  progress: number        // scroll progress 0..5 (phase space)
  bodyColor: string
  ambientColor: string
  doorsOpen: boolean
  autoOrbit: boolean
  interiorMode: boolean
  looked: boolean
  frontPos: [number, number, number] | null
  cabinPose: { pos: [number, number, number]; tgt: [number, number, number] } | null
  trunkPose: { pos: [number, number, number]; tgt: [number, number, number] } | null
  trunkOpen: boolean
  cfgOpen: boolean
  jumpTo: number | null   // request scroll jump to phase index
  setReady: (v: boolean) => void
  setStarted: (v: boolean) => void
  setProgress: (v: number) => void
  setBodyColor: (v: string) => void
  setAmbientColor: (v: string) => void
  toggleDoors: () => void
  toggleOrbit: () => void
  toggleInterior: () => void
  setLooked: (v: boolean) => void
  setFrontPos: (v: [number, number, number]) => void
  setCabinPose: (v: { pos: [number, number, number]; tgt: [number, number, number] }) => void
  setTrunkPose: (v: { pos: [number, number, number]; tgt: [number, number, number] }) => void
  toggleTrunk: () => void
  setCfgOpen: (v: boolean) => void
  setJumpTo: (v: number | null) => void
}

export const useApp = create<AppState>((set) => ({
  ready: false,
  started: false,
  progress: 0,
  bodyColor: '#4a2b52',
  ambientColor: '#c8703b',
  doorsOpen: false,
  autoOrbit: false,
  interiorMode: false,
  looked: false,
  frontPos: null,
  cabinPose: null,
  trunkPose: null,
  trunkOpen: false,
  cfgOpen: false,
  jumpTo: null,
  setReady: (v) => set({ ready: v }),
  setStarted: (v) => set({ started: v }),
  setProgress: (v) => set({ progress: v }),
  setBodyColor: (v) => set({ bodyColor: v }),
  setAmbientColor: (v) => set({ ambientColor: v }),
  toggleDoors: () => set((s) => ({ doorsOpen: !s.doorsOpen })),
  toggleOrbit: () => set((s) => ({ autoOrbit: !s.autoOrbit })),
  toggleInterior: () => set((s) => ({ interiorMode: !s.interiorMode, trunkOpen: false })),
  setLooked: (v) => set({ looked: v }),
  setFrontPos: (v) => set({ frontPos: v }),
  setCabinPose: (v) => set({ cabinPose: v }),
  setTrunkPose: (v) => set({ trunkPose: v }),
  /* trunk and cabin views are mutually exclusive */
  toggleTrunk: () => set((s) => ({ trunkOpen: !s.trunkOpen, interiorMode: false })),
  setCfgOpen: (v) => set({ cfgOpen: v }),
  setJumpTo: (v) => set({ jumpTo: v }),
}))

export const PHASE_NAMES: EnvKey[] = ['STUDIO', 'DAY', 'SUNSET', 'INTERIOR', 'NIGHT', 'RAIN', 'FINALE']

export interface PhaseDef {
  bg: string; fog: string; fogD: number; exposure: number
  key: [string, number]; hemiSky: string; hemiGround: string; hemiI: number
  rim: [string, number]; fill: [string, number]
  groundRough: number
}

export const PHASES: PhaseDef[] = [
  { bg: '#0e0e12', fog: '#0a0a0c', fogD: 0.014, exposure: 1.05, key: ['#ffffff', 2.3], hemiSky: '#ffffff', hemiGround: '#202024', hemiI: 0.55, rim: ['#c8703b', 1.4], fill: ['#88aaff', 0.5], groundRough: 0.28 },
  { bg: '#8fb3d9', fog: '#b9d3ea', fogD: 0.008, exposure: 1.15, key: ['#fff6e6', 3.1], hemiSky: '#bcd8ff', hemiGround: '#5a6a55', hemiI: 1.05, rim: ['#ffffff', 1.0], fill: ['#ffffff', 0.6], groundRough: 0.22 },
  { bg: '#d97a44', fog: '#c9663c', fogD: 0.012, exposure: 1.1, key: ['#ffb066', 2.9], hemiSky: '#ffb87a', hemiGround: '#3a2540', hemiI: 0.9, rim: ['#ff7a3c', 2.2], fill: ['#6a4a8a', 0.7], groundRough: 0.3 },
  { bg: '#181014', fog: '#140d10', fogD: 0.02, exposure: 1.0, key: ['#ffc890', 1.6], hemiSky: '#c98a5a', hemiGround: '#1a1014', hemiI: 0.8, rim: ['#ff8a4c', 1.6], fill: ['#6a4a8a', 0.6], groundRough: 0.3 },
  { bg: '#05060a', fog: '#070912', fogD: 0.02, exposure: 0.95, key: ['#9fb4ff', 1.1], hemiSky: '#2a3350', hemiGround: '#05060a', hemiI: 0.5, rim: ['#c8703b', 2.5], fill: ['#3b56aa', 0.9], groundRough: 0.16 },
  { bg: '#0a0e14', fog: '#0c1017', fogD: 0.03, exposure: 0.9, key: ['#8fa8d8', 1.0], hemiSky: '#33405a', hemiGround: '#080a10', hemiI: 0.5, rim: ['#5a7fb0', 1.8], fill: ['#4466aa', 1.0], groundRough: 0.06 },
  { bg: '#0b0b10', fog: '#08080c', fogD: 0.016, exposure: 1.05, key: ['#ffffff', 2.2], hemiSky: '#ffffff', hemiGround: '#1a1a1e', hemiI: 0.6, rim: ['#c8703b', 2.0], fill: ['#88aaff', 0.5], groundRough: 0.25 },
]

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
