import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasWebGL } from '@/lib/webgl'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hasWebGL', () => {
  it('reports false when no context can be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(hasWebGL()).toBe(false)
  })

  it('reports true when webgl2 is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (id: string) => (id === 'webgl2' ? ({} as RenderingContext) : null),
    )
    expect(hasWebGL()).toBe(true)
  })

  it('falls back to the webgl1 context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (id: string) => (id === 'webgl' ? ({} as RenderingContext) : null),
    )
    expect(hasWebGL()).toBe(true)
  })

  it('reports false instead of throwing when getContext throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('context creation blocked')
    })
    expect(hasWebGL()).toBe(false)
  })
})
