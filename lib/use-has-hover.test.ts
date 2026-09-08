import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHasHover } from '@/lib/use-has-hover'

// Subscription mechanics are covered once against useMediaQuery; all this hook
// adds is the query string.
afterEach(() => {
  vi.unstubAllGlobals()
})

function stubMatchMedia(matches: boolean) {
  const matchMedia = vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal('matchMedia', matchMedia)
  return matchMedia
}

describe('useHasHover', () => {
  it('asks for a pointing device that can both hover and point precisely', () => {
    const matchMedia = stubMatchMedia(true)

    const { result } = renderHook(() => useHasHover())

    expect(matchMedia).toHaveBeenCalledWith('(hover: hover) and (pointer: fine)')
    expect(result.current).toBe(true)
  })

  it('reports false on a touch screen', () => {
    stubMatchMedia(false)

    expect(renderHook(() => useHasHover()).result.current).toBe(false)
  })
})
