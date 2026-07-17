import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { PHASE_NAMES, PHASES, useApp } from '../store'

const BODY = [
  ['Midnight', '#0d0d10'], ['Glacier', '#e8e8ea'], ['Aurora Purple', '#4a2b52'],
  ['Copper', '#8a4a2a'], ['Ember', '#d4551f'], ['Titan', '#5a5a60'],
] as const
const AMB = [
  ['Copper', '#c8703b'], ['Petrol', '#1f9d9a'], ['Violet', '#7a3cff'],
  ['Crimson', '#ff2a4a'], ['Ice', '#3aa0ff'],
] as const

export function Overlay() {
  const { progress: loadPct } = useProgress()
  const ready = useApp((s) => s.ready)
  const started = useApp((s) => s.started)
  const setStarted = useApp((s) => s.setStarted)
  const progress = useApp((s) => s.progress)
  const cfgOpen = useApp((s) => s.cfgOpen)
  const setCfgOpen = useApp((s) => s.setCfgOpen)
  const bodyColor = useApp((s) => s.bodyColor)
  const setBodyColor = useApp((s) => s.setBodyColor)
  const ambientColor = useApp((s) => s.ambientColor)
  const setAmbientColor = useApp((s) => s.setAmbientColor)
  const toggleDoors = useApp((s) => s.toggleDoors)
  const toggleOrbit = useApp((s) => s.toggleOrbit)
  const toggleInterior = useApp((s) => s.toggleInterior)
  const interiorMode = useApp((s) => s.interiorMode)
  const looked = useApp((s) => s.looked)
  const autoOrbit = useApp((s) => s.autoOrbit)
  const doorsOpen = useApp((s) => s.doorsOpen)

  const [preGone, setPreGone] = useState(false)
  const [flash, setFlash] = useState(false)
  const pct = Math.min(100, Math.round(ready ? Math.max(loadPct, 99) : loadPct * 0.98))

  useEffect(() => {
    if (ready && pct >= 99) { const t = setTimeout(() => setPreGone(true), 650); return () => clearTimeout(t) }
  }, [ready, pct])

  const start = () => {
    if (started) return
    setFlash(true); setTimeout(() => setFlash(false), 120)
    setStarted(true)
    document.body.classList.add('cine')
  }

  const jump = (i: number) => {
    const ms = document.body.scrollHeight - innerHeight
    scrollTo({ top: (i / (PHASES.length - 1)) * ms * 0.92, behavior: 'smooth' })
  }

  const phaseIdx = Math.min(Math.round(progress), PHASE_NAMES.length - 1)

  /* reveal panels on intersection */
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.35 },
    )
    scrollRef.current?.querySelectorAll('.panel').forEach((p) => io.observe(p))
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* film grain + letterbox + flash */}
      <div className="grain" />
      <div className="lb lbT" /><div className="lb lbB" />
      <div className="flash" style={{ opacity: flash ? 0.8 : 0 }} />

      {/* preloader */}
      {!preGone && (
        <div className="pre" style={{ opacity: ready && pct >= 99 ? 0 : 1 }}>
          <div className="pm disp" style={{ ['--p' as any]: pct / 100 }}>CUPRA</div>
          <div className="ps">Terramar · Interactive 3D Film</div>
          <div className="pp">{pct}%</div>
        </div>
      )}

      {/* start engine */}
      {preGone && !started && (
        <div className="start show">
          <button className="sbtn" onClick={start} aria-label="Start engine">
            <span className="ring" />
            <span className="l1 disp">START</span>
            <span className="l2">PRESS TO IGNITE</span>
          </button>
          <div className="hint">Start the engine</div>
        </div>
      )}

      {/* HUD */}
      <header className={'hud' + (started ? ' show' : '')}>
        <div className="brand disp">CUPRA <small>TERRAMAR</small></div>
        <div className="phase"><span className="dot" /><span>{PHASE_NAMES[phaseIdx]}</span></div>
      </header>

      {/* rail */}
      <nav className={'rail' + (started ? ' show' : '')} aria-label="Chapters">
        {PHASE_NAMES.map((n, i) => (
          <button key={n} className={'rs' + (i === phaseIdx ? ' on' : '')} onClick={() => jump(i)}>
            <span>{n}</span>
          </button>
        ))}
      </nav>
      <div className="speed" style={{ width: `${(progress / (PHASES.length - 1)) * 100}%` }} />
      <div className={'cue' + (started && progress < 0.15 ? ' show' : '')}><span>Scroll</span><span className="bar" /></div>
      <div className={'spin360' + (started && !looked && (interiorMode || (progress > 2.9 && progress < 3.55)) ? ' show' : '')} aria-hidden="true">
        <svg viewBox="0 0 100 100" className="ring">
          <path d="M 50 12 A 38 38 0 1 1 18 66" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <polygon points="12,58 26,64 16,76" fill="currentColor" />
        </svg>
        <span className="deg">360°</span>
      </div>
      <button
        className={'lookHint' + (started && (interiorMode || (progress > 2.85 && progress < 3.55)) ? ' show' : '')}
        onClick={toggleInterior}
        aria-label="Look around the cabin"
      >
        <span className="mouseIc"><span className="wheel" /></span>
        Hold and drag to look around
      </button>

      {/* configurator */}
      <button className={'cfgT' + (started ? ' show' : '')} onClick={() => setCfgOpen(!cfgOpen)}>Configurator</button>
      <aside className={'cfg' + (cfgOpen ? ' open' : '')}>
        <h3 className="disp">Configurator</h3>
        <div className="sub">Terramar VZ · Live 3D</div>
        <div className="grp">
          <div className="gl">Body</div>
          <div className="swatches">
            {BODY.map(([nm, hex]) => (
              <button key={hex} className={'sw' + (bodyColor === hex ? ' sel' : '')} style={{ background: hex }}
                onClick={() => setBodyColor(hex)} aria-label={nm}>
                <span className="nm">{nm}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grp">
          <div className="gl">Environment</div>
          <div className="chips">
            {([['STUDIO', 0], ['DAY', 1], ['SUNSET', 2], ['NIGHT', 4], ['RAIN', 5]] as const).map(([n, i]) => (
              <button key={n} className={'chip' + (phaseIdx === i ? ' sel' : '')} onClick={() => jump(i)}>{n}</button>
            ))}
          </div>
        </div>
        <div className="grp">
          <div className="gl">Ambient Light</div>
          <div className="chips">
            {AMB.map(([nm, hex]) => (
              <button key={hex} className={'chip' + (ambientColor === hex ? ' sel' : '')} onClick={() => setAmbientColor(hex)}>{nm}</button>
            ))}
          </div>
        </div>
        <div className="grp">
          <div className="gl">Presentation</div>
          <div className="chips">
            <button className={'chip' + (autoOrbit ? ' sel' : '')} onClick={toggleOrbit}>Auto-orbit</button>
            <button className={'chip' + (doorsOpen ? ' sel' : '')} onClick={toggleDoors}>Doors</button>
            <button className={'chip' + (interiorMode ? ' sel' : '')} onClick={toggleInterior}>Interior</button>
          </div>
        </div>
      </aside>

      {/* scroll story */}
      <main ref={scrollRef} className="scroll">
        <section className="panel">
          <div className="eyebrow">The Unexpected</div>
          <h2 className="disp">Terramar</h2>
          <p className="lead">The CUPRA urban sport crossover. The story begins in the silence of the studio — where light first touches metal.</p>
        </section>
        <section className="panel right">
          <div className="eyebrow">Daybreak</div>
          <h2 className="disp">Born<br />to Move</h2>
          <p className="lead">Daylight reveals its character: purple metallic comes alive in motion, mirroring the horizon in every line.</p>
          <div className="spec">
            <div><span className="n disp">2.0 TSI</span><span className="l">Engine</span></div>
            <div><span className="n disp">265</span><span className="l">PS</span></div>
            <div><span className="n disp">5.9s</span><span className="l">0–100</span></div>
          </div>
        </section>
        <section className="panel">
          <div className="eyebrow">Golden Hour</div>
          <h2 className="disp">Sculpted<br />in Light</h2>
          <p className="lead">Golden hour — the moment this form was designed for. Copper highlights glide across the shoulders of the body.</p>
        </section>
        <section className="panel center">
          <div className="eyebrow">Step Inside</div>
          <h2 className="disp">Driver<br />First</h2>
          <p className="lead">A cockpit built around the driver: sport bucket seats, copper stitching, and sunset light pouring through the glass.</p>
        </section>
        <section className="panel right">
          <div className="eyebrow">After Dark</div>
          <h2 className="disp">Night<br />Instinct</h2>
          <p className="lead">When the sun goes down, the light signature awakens. Three triangles — a gaze you can\u2019t mistake.</p>
          <div className="spec">
            <div><span className="n disp">4Drive</span><span className="l">AWD</span></div>
            <div><span className="n disp">DCC</span><span className="l">Adaptive</span></div>
          </div>
        </section>
        <section className="panel">
          <div className="eyebrow">Storm</div>
          <h2 className="disp">Rain Never<br />Stops Us</h2>
          <p className="lead">Downpour, wet asphalt, mirror reflections. All-wheel drive stays composed in any element.</p>
        </section>
        <section className="panel center finale">
          <div className="eyebrow">CUPRA</div>
          <h2 className="disp">Crafted<br />to Perform</h2>
          <div className="fsub">Terramar</div>
        </section>
      </main>
    </>
  )
}
