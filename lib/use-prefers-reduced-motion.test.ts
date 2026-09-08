import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

// Subscription mechanics — legacy Safari, unmount, absent matchMedia — are
// covered once against useMediaQuery. All this hook adds is the query string.
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePrefersReducedMotion', () => {
  it('reports the reduced-motion preference', () => {
    const matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('matchMedia', matchMedia)

    const { result } = renderHook(() => usePrefersReducedMotion())

    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    expect(result.current).toBe(true)
  })

  it('reports false when motion is allowed', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false)
  })
})
