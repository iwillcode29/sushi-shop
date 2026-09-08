import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const orbitProps: Record<string, unknown>[] = []
let reducedMotion = false

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) => (
    <div data-testid="canvas" data-frameloop={String(rest.frameloop)}>
      {children}
    </div>
  ),
  useFrame: () => {},
}))

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  Bounds: ({ children }: { children: ReactNode }) => <>{children}</>,
  Environment: () => null,
  ContactShadows: () => null,
  PerformanceMonitor: () => null,
  Preload: () => null,
  OrbitControls: (props: Record<string, unknown>) => {
    orbitProps.push(props)
    return null
  },
  useProgress: () => ({ active: false, progress: 100 }),
  useGLTF: Object.assign(() => ({ scene: { traverse: () => {}, position: { set: () => {} } } }), {
    preload: vi.fn(),
  }),
}))

// Hoisted so the mock factory below (which vi.mock hoists above these
// imports) can read it: lets a single test opt a throw into an otherwise
// well-behaved mock, to exercise Stage's ModelErrorBoundary wiring.
const modelThrow = vi.hoisted(() => ({ shouldThrow: false }))

vi.mock('@/components/sushi-model', () => ({
  MODEL_URL: '/models/sushis.glb',
  SushiModel: ({
    mode,
    onConversionError,
    onHoverChange,
  }: {
    mode: string
    onConversionError?: (error: unknown) => void
    onHoverChange?: (hovered: boolean) => void
  }) => {
    if (modelThrow.shouldThrow) {
      throw new Error('model render failed')
    }
    return (
      <div data-testid="model" data-mode={mode}>
        <button
          type="button"
          data-testid="break-materials"
          onClick={() => onConversionError?.(new Error('material conversion failed'))}
        />
        <button type="button" data-testid="hover-on" onClick={() => onHoverChange?.(true)} />
        <button type="button" data-testid="hover-off" onClick={() => onHoverChange?.(false)} />
      </div>
    )
  },
}))

// Canvas is a plain div here, so real R3F intrinsics (<ambientLight>,
// <planeGeometry args={...}>) would reach React DOM and warn. SceneEnv is
// already covered against a real three scene graph in its own test.
// Stage only ever imports the SceneEnv component from this module — it
// never reads FLOOR_Y or SHADOW_Y — so the mock declares nothing else.
// (An earlier version of this mock also declared FLOOR_Y, unused by
// anything here, and it drifted out of sync with the real constant when
// that changed; dead mock surface has no way to be caught by a failing
// test, so it's removed rather than just corrected.)
vi.mock('@/components/scene-env', () => ({
  SceneEnv: ({ mode }: { mode: string }) => <div data-testid="scene-env" data-mode={mode} />,
}))

vi.mock('@/lib/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => reducedMotion,
}))

import { IDLE_RESUME_MS, ORBIT_LIMITS, Stage } from '@/components/stage'

function stubWebGL(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    available ? ({} as RenderingContext) : null,
  )
}

type IntersectionCallback = (entries: { isIntersecting: boolean }[]) => void

// jsdom has no IntersectionObserver, and Stage guards on
// `typeof IntersectionObserver === 'undefined'` — so without this stub the
// whole visibility/intersection effect is skipped. Installed only inside the
// tests that need it (not the shared setup file) and torn down via
// vi.unstubAllGlobals() below.
function stubIntersectionObserver() {
  let callback: IntersectionCallback = () => {}
  const disconnect = vi.fn()

  class FakeIntersectionObserver {
    constructor(cb: IntersectionCallback) {
      callback = cb
    }
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = disconnect
    takeRecords = () => []
  }

  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

  return {
    trigger: (isIntersecting: boolean) => callback([{ isIntersecting }]),
    disconnect,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  orbitProps.length = 0
  reducedMotion = false
  modelThrow.shouldThrow = false
})

describe('Stage', () => {
  it('renders the fallback panel when WebGL is unavailable', () => {
    stubWebGL(false)
    render(<Stage />)
    expect(screen.getByText(/cannot open a WebGL context/i)).toBeInTheDocument()
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument()
  })

  it('renders the canvas and the overlay together when WebGL is available', () => {
    stubWebGL(true)
    render(<Stage />)
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lighting/i })).toBeInTheDocument()
  })

  it('starts in unlit mode', () => {
    stubWebGL(true)
    render(<Stage />)
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'unlit')
  })

  it('switches the model to lit mode from the overlay toggle', async () => {
    stubWebGL(true)
    render(<Stage />)
    await userEvent.click(screen.getByRole('button', { name: /lighting/i }))
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'lit')
  })

  it('applies the orbit constraints from the spec', () => {
    stubWebGL(true)
    render(<Stage />)
    const props = orbitProps.at(-1)!
    expect(props.enablePan).toBe(false)
    expect(props.makeDefault).toBe(true)
    expect(props.minPolarAngle).toBeCloseTo(ORBIT_LIMITS.minPolarAngle, 5)
    expect(props.maxPolarAngle).toBeCloseTo(ORBIT_LIMITS.maxPolarAngle, 5)
    expect(props.minDistance).toBe(ORBIT_LIMITS.minDistance)
    expect(props.maxDistance).toBe(ORBIT_LIMITS.maxDistance)
    expect(props.autoRotateSpeed).toBe(ORBIT_LIMITS.autoRotateSpeed)
  })

  it('auto-rotates on mount', () => {
    stubWebGL(true)
    render(<Stage />)
    expect(orbitProps.at(-1)!.autoRotate).toBe(true)
  })

  it('never auto-rotates when reduced motion is preferred', () => {
    reducedMotion = true
    stubWebGL(true)
    render(<Stage />)
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)
  })

  it('stops auto-rotating while the user interacts, and resumes after the idle delay', () => {
    vi.useFakeTimers()
    stubWebGL(true)
    render(<Stage />)

    const onStart = orbitProps.at(-1)!.onStart as () => void
    act(() => onStart())
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    const onEnd = orbitProps.at(-1)!.onEnd as () => void
    act(() => onEnd())
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    // Proves the resume waits for the full delay, not merely "eventually":
    // one millisecond short must still be off.
    act(() => vi.advanceTimersByTime(IDLE_RESUME_MS - 1))
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    act(() => vi.advanceTimersByTime(1))
    expect(orbitProps.at(-1)!.autoRotate).toBe(true)
  })

  it('stops auto-rotating while a sushi is hovered, and resumes after the idle delay', () => {
    // The model turns under a still pointer, so without this the hovered piece
    // rotates out from under the cursor and the lift flickers on and off.
    vi.useFakeTimers()
    stubWebGL(true)
    render(<Stage />)
    expect(orbitProps.at(-1)!.autoRotate).toBe(true)

    act(() => screen.getByTestId('hover-on').click())
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    act(() => screen.getByTestId('hover-off').click())
    act(() => vi.advanceTimersByTime(IDLE_RESUME_MS - 1))
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    act(() => vi.advanceTimersByTime(1))
    expect(orbitProps.at(-1)!.autoRotate).toBe(true)
  })

  it('returns to unlit when the model reports a conversion failure', async () => {
    stubWebGL(true)
    render(<Stage />)

    await userEvent.click(screen.getByRole('button', { name: /lighting/i }))
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'lit')

    await userEvent.click(screen.getByTestId('break-materials'))
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'unlit')
  })

  it('sets frameloop to never when the canvas leaves the viewport, and back to always when it returns', () => {
    const observer = stubIntersectionObserver()
    stubWebGL(true)
    render(<Stage />)
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'always')

    act(() => observer.trigger(false))
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'never')

    act(() => observer.trigger(true))
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'always')
  })

  it('sets frameloop to never when the tab is hidden, and back to always when visible', () => {
    stubIntersectionObserver()
    stubWebGL(true)
    render(<Stage />)

    const hiddenSpy = vi.spyOn(document, 'hidden', 'get')
    hiddenSpy.mockReturnValue(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'never')

    hiddenSpy.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'always')
  })

  it('disconnects the intersection observer on unmount', () => {
    const observer = stubIntersectionObserver()
    stubWebGL(true)
    const { unmount } = render(<Stage />)
    unmount()
    expect(observer.disconnect).toHaveBeenCalledOnce()
  })

  it('renders the fallback panel instead of a blank canvas area when a child throws during render', () => {
    // React logs caught render errors; silence the expected noise, scoped to
    // this test only, and assert it actually fired rather than merely muting it.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    modelThrow.shouldThrow = true
    stubWebGL(true)

    render(<Stage />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.queryByTestId('model')).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
  })
})
