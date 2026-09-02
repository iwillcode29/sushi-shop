/**
 * Probes for a real WebGL context rather than sniffing the user agent. Some
 * browsers expose WebGLRenderingContext but refuse to hand out a context
 * (blocklisted GPU, hardware acceleration disabled), so creating one is the
 * only reliable check.
 */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
