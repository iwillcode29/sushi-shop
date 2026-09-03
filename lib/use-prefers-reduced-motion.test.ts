import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

type Listener = (event: MediaQueryListEvent) => void

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => query)
  return {
    emit(matches: boolean) {
      query.matches = matches
      for (const listener of listeners) listener({ matches } as MediaQueryListEvent)
    },
    listenerCount: () => listeners.size,
  }
}

/** Safari < 14 shape: only `addListener`/`removeListener`, no `addEventListener`. */
function stubLegacyMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => query)
  return {
    emit(matches: boolean) {
      query.matches = matches
      for (const listener of listeners) listener({ matches } as MediaQueryListEvent)
    },
    listenerCount: () => listeners.size,
  }
}

/** A `MediaQueryList` exposing neither the modern nor the legacy subscription API. */
function stubBareMatchMedia(initial: boolean) {
  const query = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
  }
  vi.stubGlobal('matchMedia', () => query)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePrefersReducedMotion', () => {
  it('reads the initial preference', () => {
    stubMatchMedia(true)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true)
  })

  it('reports false when motion is allowed', () => {
    stubMatchMedia(false)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false)
  })

  it('updates when the preference changes', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    act(() => media.emit(true))
    expect(result.current).toBe(true)
  })

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(false)
    renderHook(() => usePrefersReducedMotion()).unmount()
    expect(media.listenerCount()).toBe(0)
  })

  it('falls back to the legacy addListener/removeListener API', () => {
    const media = stubLegacyMatchMedia(true)
    const { result, unmount } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)

    act(() => media.emit(false))
    expect(result.current).toBe(false)

    unmount()
    expect(media.listenerCount()).toBe(0)
  })

  it('returns the initial value and does not throw when neither listener API is available', () => {
    stubBareMatchMedia(true)

    let hook: ReturnType<typeof renderHook<boolean, void>> | undefined
    expect(() => {
      hook = renderHook(() => usePrefersReducedMotion())
    }).not.toThrow()

    expect(hook?.result.current).toBe(true)
  })
})
