import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from '@/lib/use-media-query'

type Listener = (event: MediaQueryListEvent) => void

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initial,
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
  vi.stubGlobal('matchMedia', () => ({ matches: initial }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMediaQuery', () => {
  it('subscribes to the query it is given', () => {
    const matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('matchMedia', matchMedia)

    const { result } = renderHook(() => useMediaQuery('(hover: hover)'))

    expect(matchMedia).toHaveBeenCalledWith('(hover: hover)')
    expect(result.current).toBe(true)
  })

  it('reports false when the query does not match', () => {
    stubMatchMedia(false)
    expect(renderHook(() => useMediaQuery('(hover: hover)')).result.current).toBe(false)
  })

  it('updates when the match changes', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(hover: hover)'))

    act(() => media.emit(true))

    expect(result.current).toBe(true)
  })

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(false)
    renderHook(() => useMediaQuery('(hover: hover)')).unmount()
    expect(media.listenerCount()).toBe(0)
  })

  it('falls back to the legacy addListener/removeListener API', () => {
    const media = stubLegacyMatchMedia(true)
    const { result, unmount } = renderHook(() => useMediaQuery('(hover: hover)'))
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
      hook = renderHook(() => useMediaQuery('(hover: hover)'))
    }).not.toThrow()

    expect(hook?.result.current).toBe(true)
  })

  it('does not throw where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)

    let hook: ReturnType<typeof renderHook<boolean, void>> | undefined
    expect(() => {
      hook = renderHook(() => useMediaQuery('(hover: hover)'))
    }).not.toThrow()

    expect(hook?.result.current).toBe(false)
  })

  it('resubscribes when the query changes', () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(hover: hover)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('matchMedia', matchMedia)

    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(hover: none)' },
    })
    expect(result.current).toBe(false)

    rerender({ query: '(hover: hover)' })

    expect(result.current).toBe(true)
  })
})
