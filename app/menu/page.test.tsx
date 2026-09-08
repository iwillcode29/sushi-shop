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

import MenuPage, { viewport } from '@/app/menu/page'

describe('MenuPage', () => {
  it('puts the set on the counter once the visitor is inside', () => {
    render(<MenuPage />)
    expect(screen.getByTestId('sushi-showcase')).toBeInTheDocument()
  })

  it('lists the prices below the set', () => {
    render(<MenuPage />)
    expect(screen.getByRole('heading', { name: /お品書き/ })).toBeInTheDocument()
  })

  it('names the shop as the page heading', () => {
    render(<MenuPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('鮨 ねこもり')
  })

  // globals.css paints the body washi. On a route that is dark end to end
  // that colour shows through the overscroll bounce at the top and bottom of
  // the page; the marker is what the stylesheet keys the override off.
  it('marks itself as the dark route for the stylesheet to key off', () => {
    const { container } = render(<MenuPage />)
    expect(container.querySelector('[data-route="menu"]')).not.toBeNull()
  })

  it('tells the browser chrome to match the route, not the site default', () => {
    expect(viewport.themeColor).toBe('#171a10')
  })

  it('offers a way back to the rest of the site', () => {
    render(<MenuPage />)
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/')
  })

  it('opens on the approach to the shop rather than on the menu', () => {
    render(<MenuPage />)
    expect(screen.getByTestId('sushi-intro')).toBeInTheDocument()
  })

  it('scrubs the shop footage that ships with the route', () => {
    const { container } = render(<MenuPage />)
    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      '/video/sushi-counter.mp4',
    )
  })
})
