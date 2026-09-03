import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HeroOverlay } from '@/components/hero-overlay'

describe('HeroOverlay', () => {
  it('renders the headline as the page heading', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Handcrafted in WebGL/i)
  })

  it('reports the toggle as unpressed in unlit mode', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByRole('button', { name: /lighting/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('reports the toggle as pressed in lit mode', () => {
    render(<HeroOverlay mode="lit" onToggleMode={() => {}} />)
    expect(screen.getByRole('button', { name: /lighting/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls back when the toggle is activated', async () => {
    const onToggleMode = vi.fn()
    render(<HeroOverlay mode="unlit" onToggleMode={onToggleMode} />)
    await userEvent.click(screen.getByRole('button', { name: /lighting/i }))
    expect(onToggleMode).toHaveBeenCalledOnce()
  })

  it('lets pointer events fall through to the canvas', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByTestId('hero-overlay').className).toContain('pointer-events-none')
  })

  it('re-enables pointer events on the toggle itself', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByRole('button', { name: /lighting/i }).className).toContain(
      'pointer-events-auto',
    )
  })
})
