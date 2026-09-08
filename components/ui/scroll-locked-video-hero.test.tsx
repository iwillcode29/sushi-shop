import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SushiMenuHero from '@/components/ui/scroll-locked-video-hero'
import { SUSHI_MENU } from '@/lib/sushi-menu'

/**
 * jsdom's own `matchMedia` reports false for every query, which is already
 * the desktop / no-reduced-motion case the bulk of these tests want. This
 * replaces it only where a test needs a specific query to match.
 */
function stubMatchMedia(matching: (query: string) => boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** The detail bar under the wheel always names whichever item is centred. */
function detail() {
  return screen.getByTestId('menu-hero-detail')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SushiMenuHero', () => {
  it('renders the shop name', () => {
    render(<SushiMenuHero title="鮨 かねもり" />)
    expect(screen.getByText('鮨 かねもり')).toBeInTheDocument()
  })

  it('lists every menu item', () => {
    render(<SushiMenuHero />)
    for (const item of SUSHI_MENU) {
      expect(screen.getAllByText(item.name).length).toBeGreaterThan(0)
    }
  })

  it('opens on the first item, named and priced', () => {
    render(<SushiMenuHero />)
    expect(detail()).toHaveTextContent('Otoro')
    expect(detail()).toHaveTextContent('大トロ')
    expect(detail()).toHaveTextContent('¥680')
  })

  it('advances to the next item', async () => {
    render(<SushiMenuHero />)
    await userEvent.click(screen.getByRole('button', { name: /next item/i }))
    await waitFor(() => expect(detail()).toHaveTextContent('Chutoro'))
  })

  it('wraps backwards past the first item to the last', async () => {
    render(<SushiMenuHero />)
    await userEvent.click(screen.getByRole('button', { name: /previous item/i }))
    await waitFor(() => expect(detail()).toHaveTextContent('Anago'))
  })

  it('steps the list with the arrow keys', async () => {
    render(<SushiMenuHero />)
    screen.getByRole('application').focus()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(detail()).toHaveTextContent('Chutoro'))
  })

  it('announces the centred item to assistive technology', async () => {
    render(<SushiMenuHero />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Otoro/), {
      timeout: 2000,
    })
  })

  // The wheel handler calls preventDefault, so binding it to `window` — as
  // the upstream component does — would lock scrolling on every other
  // section of whatever page mounts this.
  it('leaves wheel events outside its own frame alone', () => {
    render(<SushiMenuHero />)
    const outside = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
    document.body.dispatchEvent(outside)
    expect(outside.defaultPrevented).toBe(false)
  })

  it('captures wheel events inside its own frame', () => {
    render(<SushiMenuHero />)
    const inside = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
    screen.getByTestId('menu-hero-root').dispatchEvent(inside)
    expect(inside.defaultPrevented).toBe(true)
  })

  it('renders no video when it has no source for one', () => {
    const { container } = render(<SushiMenuHero />)
    expect(container.querySelector('video')).toBeNull()
  })

  it('renders the video once given a source', () => {
    const { container } = render(<SushiMenuHero videoSrc="/video/sushi-loop.mp4" />)
    expect(container.querySelector('video')).not.toBeNull()
  })

  it('starts paused when the visitor prefers reduced motion', () => {
    stubMatchMedia((query) => query.includes('prefers-reduced-motion'))
    render(<SushiMenuHero videoSrc="/video/sushi-loop.mp4" />)
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })

  it('toggles between play and pause', async () => {
    render(<SushiMenuHero videoSrc="/video/sushi-loop.mp4" />)
    await userEvent.click(screen.getByRole('button', { name: /^pause$/i }))
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })

  // A silent file makes the speaker button and the slider chrome that
  // controls nothing, which is the same defect as the shuffle and repeat
  // buttons this port already dropped.
  it('offers no ambience controls for a file with no audio track', () => {
    render(<SushiMenuHero videoSrc="/video/sushi-loop.mp4" />)
    expect(screen.queryByRole('button', { name: /mute/i })).toBeNull()
    expect(screen.queryByRole('slider')).toBeNull()
  })

  it('keeps the ambience muted until the visitor asks for it', async () => {
    render(<SushiMenuHero videoSrc="/video/sushi-loop.mp4" ambience />)
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /unmute/i }))
    expect(screen.getByRole('button', { name: /^mute/i })).toBeInTheDocument()
  })

  it('mutes the video outright when the caller declares no ambience', () => {
    const { container } = render(<SushiMenuHero videoSrc="/video/sushi-loop.mp4" />)
    for (const video of container.querySelectorAll('video')) {
      expect(video).toHaveProperty('muted', true)
    }
  })

  describe('driven by page scroll', () => {
    // The wheel handler calls preventDefault. Left bound in this mode it
    // would swallow the very scroll that is supposed to be turning the
    // wheel, pinning the page on the menu section forever.
    it('captures no wheel events of its own', () => {
      render(<SushiMenuHero scrollSectionRef={{ current: null }} />)
      const event = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
      screen.getByTestId('menu-hero-root').dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })

    // Moving the wheel directly would be overwritten by the next scroll
    // frame, so stepping has to move the page instead.
    it('asks the page to scroll rather than moving the wheel itself', async () => {
      const onStep = vi.fn()
      render(<SushiMenuHero scrollSectionRef={{ current: null }} onStep={onStep} />)
      await userEvent.click(screen.getByRole('button', { name: /next item/i }))
      expect(onStep).toHaveBeenCalledWith(1)
      await userEvent.click(screen.getByRole('button', { name: /previous item/i }))
      expect(onStep).toHaveBeenCalledWith(-1)
    })

    it('routes the arrow keys through the same request', async () => {
      const onStep = vi.fn()
      render(<SushiMenuHero scrollSectionRef={{ current: null }} onStep={onStep} />)
      screen.getByRole('application').focus()
      await userEvent.keyboard('{ArrowDown}')
      expect(onStep).toHaveBeenCalledWith(1)
    })

    it('survives a caller that supplied no step handler', async () => {
      render(<SushiMenuHero scrollSectionRef={{ current: null }} />)
      await userEvent.click(screen.getByRole('button', { name: /next item/i }))
      expect(detail()).toHaveTextContent('Otoro')
    })
  })

  it('describes the wheel to screen readers as a menu', () => {
    render(<SushiMenuHero />)
    expect(screen.getByRole('application')).toHaveAccessibleName(/menu/i)
  })
})
