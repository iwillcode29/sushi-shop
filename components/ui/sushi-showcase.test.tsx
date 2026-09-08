import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

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
  Environment: () => null,
  ContactShadows: () => null,
  PerformanceMonitor: () => null,
  Preload: () => null,
  useGLTF: Object.assign(() => ({ scene: { traverse: () => {}, position: { set: () => {} } } }), {
    preload: vi.fn(),
  }),
}))

const model = vi.hoisted(() => ({ shouldThrow: false }))
vi.mock('@/components/sushi-model', () => ({
  MODEL_URL: '/models/sushis.glb',
  SushiModel: ({ mode }: { mode: string }) => {
    if (model.shouldThrow) throw new Error('scene build failed')
    return <div data-testid="model" data-mode={mode} />
  },
}))

vi.mock('@/components/scene-env', () => ({
  SHELL_FOG: '#e4d2b8',
  SHELL_FLOOR: '#7f6a4c',
  SceneEnv: (props: Record<string, unknown>) => (
    <div data-testid="scene-env" data-fog={String(props.fogColor)} />
  ),
}))

const webgl = vi.hoisted(() => ({ available: true as boolean | null }))
vi.mock('@/lib/use-has-webgl', () => ({ useHasWebGL: () => webgl.available }))

import { SushiShowcase } from '@/components/ui/sushi-showcase'

afterEach(() => {
  webgl.available = true
  model.shouldThrow = false
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SushiShowcase', () => {
  it('reserves more than a viewport of scroll for the camera move', () => {
    render(<SushiShowcase />)
    const section = screen.getByTestId('sushi-showcase')
    expect(Number.parseInt(section.style.height, 10)).toBeGreaterThan(100)
  })

  it('pins the stage while that scroll is spent', () => {
    render(<SushiShowcase />)
    expect(screen.getByTestId('sushi-showcase-stage')).toHaveStyle({ position: 'sticky' })
  })

  // The intro's title card is transient and is skipped entirely under
  // reduced motion, so the route's one h1 lives here, with the subject.
  it('names the shop as the page heading', () => {
    render(<SushiShowcase title="鮨 ねこもり" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('鮨 ねこもり')
  })

  it('mounts the sushi model', () => {
    render(<SushiShowcase />)
    expect(screen.getByTestId('model')).toBeInTheDocument()
  })

  // The asset's authored materials are unlit. On the cream home page that
  // reads as a deliberate flat illustration; on a black counter it reads as
  // a sticker floating in the dark, with nothing tying it to the surface.
  it('lights the model, which a dark counter needs to look seated on it', () => {
    render(<SushiShowcase />)
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'lit')
  })

  // The floor fogs into the page behind it. Left at the shell default that
  // is a cream horizon across the bottom of a black frame.
  it('fogs the scene into the dark route it sits on', () => {
    render(<SushiShowcase />)
    expect(screen.getByTestId('scene-env')).toHaveAttribute('data-fog', '#171a10')
  })

  it('says so plainly when the browser cannot open a WebGL context', () => {
    webgl.available = false
    render(<SushiShowcase />)
    expect(screen.queryByTestId('canvas')).toBeNull()
    expect(screen.getByText(/webgl/i)).toBeInTheDocument()
  })

  it('still reserves its scroll without WebGL, so the page below stays reachable', () => {
    webgl.available = false
    render(<SushiShowcase />)
    expect(screen.getByTestId('sushi-showcase')).toBeInTheDocument()
  })

  // A 3D canvas pinned behind 250vh of intro would otherwise render every
  // frame of a scroll nobody has reached yet.
  // What the server renders, and what the client renders until it has
  // probed. Committing to either branch here is the hydration mismatch.
  it('commits to neither branch before the browser has been probed', () => {
    webgl.available = null
    render(<SushiShowcase />)
    expect(screen.queryByTestId('canvas')).toBeNull()
    expect(screen.queryByText(/webgl/i)).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  // The default boundary poster is the home page's: cream, and headed
  // "Handcrafted in WebGL". Dropped onto the dark counter it reads as a
  // different site.
  it('fails in its own colours, not the home page\'s', () => {
    model.shouldThrow = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SushiShowcase />)
    expect(screen.queryByText(/handcrafted in webgl/i)).toBeNull()
    expect(screen.getByText(/set cannot be shown/i)).toBeInTheDocument()
  })

  it('keeps naming the shop even when the scene fails', () => {
    model.shouldThrow = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SushiShowcase title="鮨 ねこもり" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('鮨 ねこもり')
  })

  it('renders on every frame while it is on screen', () => {
    render(<SushiShowcase />)
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'always')
  })
})
