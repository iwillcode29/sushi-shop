import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const probe = vi.hoisted(() => ({ hasWebGL: vi.fn(() => true) }))
vi.mock('@/lib/webgl', () => ({ hasWebGL: probe.hasWebGL }))

import { resetWebGLProbeForTests, useHasWebGL } from '@/lib/use-has-webgl'

afterEach(() => {
  resetWebGLProbeForTests()
  probe.hasWebGL.mockReset()
  probe.hasWebGL.mockReturnValue(true)
})

describe('useHasWebGL', () => {
  it('reports a browser that can open a context', () => {
    expect(renderHook(() => useHasWebGL()).result.current).toBe(true)
  })

  it('reports a browser that cannot', () => {
    probe.hasWebGL.mockReturnValue(false)
    expect(renderHook(() => useHasWebGL()).result.current).toBe(false)
  })

  // Probing creates a real WebGL context and the snapshot is read on every
  // render, so an unmemoised probe would leak a context per render.
  it('probes once however many times it is read', () => {
    const { rerender } = renderHook(() => useHasWebGL())
    rerender()
    rerender()
    renderHook(() => useHasWebGL())
    expect(probe.hasWebGL).toHaveBeenCalledTimes(1)
  })
})
