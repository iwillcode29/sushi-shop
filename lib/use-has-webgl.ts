'use client'

import { useSyncExternalStore } from 'react'
import { hasWebGL } from '@/lib/webgl'

/**
 * Whether this browser can open a WebGL context: `true`, `false`, or `null`
 * while it is not yet known.
 *
 * `null` is what the server renders. A component that decides between a
 * canvas and a fallback cannot make that call during server rendering — there
 * is no WebGL there, and answering `false` puts the fallback in the HTML while
 * the client puts a canvas in its place, which React reports as a hydration
 * mismatch and recovers from by discarding the tree. Read through
 * `useSyncExternalStore` so the server snapshot and the client snapshot are
 * declared separately, the same way `useMediaQuery` handles media.
 */
let cached: boolean | null = null

const subscribe = () => () => {}
// Whether a context can be opened does not change within a session, and
// getSnapshot runs on every render — so the probe, which creates a real
// context, is cached rather than repeated.
const getSnapshot = () => (cached ??= hasWebGL())
const getServerSnapshot = () => null

export function useHasWebGL(): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Clears the memoised probe. Tests only. */
export function resetWebGLProbeForTests() {
  cached = null
}
