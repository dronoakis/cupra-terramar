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

    return () => {
      removeEventListener('error', onErr)
      removeEventListener('unhandledrejection', onRej)
      removeEventListener('webglcontextlost', onLost, true)
    }
  }, [])

  if (!msg) return null

  return (
    <div className="diag">
      <strong>{msg}</strong>
      <span>Open in lite mode: add ?quality=lite to the URL.</span>
    </div>
  )
}
