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

vi.mock('@/components/sushi-model', () => ({
  MODEL_URL: '/models/sushis.glb',
  SushiModel: ({
    mode,
    onConversionError,
  }: {
    mode: string
    onConversionError?: (error: unknown) => void
  }) => (
    <div data-testid="model" data-mode={mode}>
      <button
        type="button"
        data-testid="break-materials"
        onClick={() => onConversionError?.(new Error('material conversion failed'))}
      />
    </div>
  ),
}))

// Canvas is a plain div here, so real R3F intrinsics (<ambientLight>,
// <planeGeometry args={...}>) would reach React DOM and warn. SceneEnv is
// already covered against a real three scene graph in its own test.
vi.mock('@/components/scene-env', () => ({
  FLOOR_Y: -0.002,
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

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  orbitProps.length = 0
  reducedMotion = false
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
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
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

    act(() => vi.advanceTimersByTime(IDLE_RESUME_MS))
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
})
