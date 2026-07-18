/* Detects weaker GPUs so the scene can drop the expensive passes
   (real-time floor reflections, shadows, retina rendering). */
export function detectLite(): boolean {
  try {
    const forced = new URLSearchParams(location.search).get('quality')
    if (forced === 'lite') return true
    if (forced === 'high') return false

    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return true

    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    const r = renderer.toLowerCase()

    /* integrated / software renderers */
    const weak = /(swiftshader|llvmpipe|software|microsoft basic|intel.*(hd|uhd)\s*graphics|intel\(r\)\s*(hd|uhd))/.test(r)

    const cores = navigator.hardwareConcurrency || 4
    const mem = (navigator as any).deviceMemory || 4
    const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number

    return weak || mobile || cores <= 4 || mem <= 4 || maxTex < 8192
  } catch {
    return true
  }
}
