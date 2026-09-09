import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// The showcase opens a WebGL context. jsdom has none, so the real component
// would take its fallback path here and the assertions would be about that
// rather than about the route.
vi.mock('@/components/ui/sushi-showcase', () => ({
  SushiShowcase: ({ title }: { title?: string }) => (
    <div data-testid="sushi-showcase">
      <h1>{title}</h1>
    </div>
  ),
}))

import Home, { viewport } from '@/app/page'

describe('Home', () => {
  it('puts the set on the counter once the visitor is inside', () => {
    render(<Home />)
    expect(screen.getByTestId('sushi-showcase')).toBeInTheDocument()
  })

  it('lists the prices below the set', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /お品書き/ })).toBeInTheDocument()
  })

  it('names the shop as the page heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('鮨 ねこもり')
  })

  // globals.css paints the body washi. On a route that is dark end to end
  // that colour shows through the overscroll bounce at the top and bottom of
  // the page; the marker is what the stylesheet keys the override off. The
  // name is the stylesheet's key, not a path — this route is now `/`.
  it('marks itself as the dark route for the stylesheet to key off', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('[data-route="menu"]')).not.toBeNull()
  })

  it('tells the browser chrome to match the route, not the site default', () => {
    expect(viewport.themeColor).toBe('#171a10')
  })

  it('offers a way on to the rest of the site', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: /belt/i })).toHaveAttribute('href', '/kaiten')
  })

  it('opens on the approach to the shop rather than on the menu', () => {
    render(<Home />)
    expect(screen.getByTestId('sushi-intro')).toBeInTheDocument()
  })

  it('scrubs the shop footage that ships with the route', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      '/video/sushi-counter.mp4',
    )
  })
})
