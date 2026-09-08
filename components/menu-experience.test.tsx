import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/sushi-showcase', () => ({
  SushiShowcase: () => <div data-testid="sushi-showcase" />,
}))

import { MenuExperience } from '@/components/menu-experience'

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MenuExperience', () => {
  it('walks the visitor to the door before showing the set', () => {
    render(<MenuExperience videoSrc="/video/sushi-counter.mp4" />)
    const intro = screen.getByTestId('sushi-intro')
    const showcase = screen.getByTestId('sushi-showcase')
    expect(intro.compareDocumentPosition(showcase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts the price list after the set, where it can be read at leisure', () => {
    render(<MenuExperience videoSrc="/v.mp4" />)
    const showcase = screen.getByTestId('sushi-showcase')
    const card = screen.getByRole('heading', { name: /お品書き/ })
    expect(showcase.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // A scroll-scrubbed video is motion end to end; there is no reduced
  // version of it to offer, so it is dropped rather than degraded.
  it('skips the intro for a visitor who prefers reduced motion', () => {
    stubReducedMotion(true)
    render(<MenuExperience videoSrc="/v.mp4" />)
    expect(screen.queryByTestId('sushi-intro')).toBeNull()
  })

  it('downloads no video for a visitor who will never see it', () => {
    stubReducedMotion(true)
    const { container } = render(<MenuExperience videoSrc="/v.mp4" />)
    expect(container.querySelector('video')).toBeNull()
  })

  it('still shows the set and the prices when the intro is skipped', () => {
    stubReducedMotion(true)
    render(<MenuExperience videoSrc="/v.mp4" />)
    expect(screen.getByTestId('sushi-showcase')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /お品書き/ })).toBeInTheDocument()
  })

  // The route is one continuous page scroll from the intro to the last
  // price. Nothing on it may call preventDefault on a wheel event.
  it('leaves the page scroll alone throughout', () => {
    render(<MenuExperience videoSrc="/v.mp4" />)
    const event = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
    document.body.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
