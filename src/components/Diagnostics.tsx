import { Component, ReactNode, useEffect, useState } from 'react'

/* Surfaces load/render failures instead of leaving a stuck preloader. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('[scene]', error) }
  render() {
    if (!this.state.error) return this.props.children
    return null
  }
}

export function Diagnostics() {
  const [msg, setMsg] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const onErr = (e: ErrorEvent) => setMsg('Error: ' + (e.message || 'unknown'))
    const onRej = (e: PromiseRejectionEvent) => {
      const r: any = e.reason
      setMsg('Failed to load: ' + (r?.message || String(r)))
    }
    const onLost = (e: Event) => { e.preventDefault(); setMsg('WebGL context lost — the GPU ran out of memory. Try ?quality=lite') }
    addEventListener('error', onErr)
    addEventListener('unhandledrejection', onRej)
    addEventListener('webglcontextlost', onLost, true)

    /* if nothing has rendered after 25s, tell the user rather than spinning forever */
    const t = setTimeout(() => setSlow(true), 25000)
    return () => {
      removeEventListener('error', onErr)
      removeEventListener('unhandledrejection', onRej)
      removeEventListener('webglcontextlost', onLost, true)
      clearTimeout(t)
    }
  }, [])

  if (!msg && !slow) return null

  return (
    <div className="diag">
      <strong>{msg || 'Still loading the 3D model (14 MB)…'}</strong>
      <span>
        {msg
          ? 'Open in lite mode: add ?quality=lite to the URL.'
          : 'Slow connection or GPU? Add ?quality=lite to the URL for a lighter scene.'}
      </span>
    </div>
  )
}
