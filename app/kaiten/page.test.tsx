import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import KaitenPage from '@/app/kaiten/page'

describe('KaitenPage', () => {
  it('puts the belt on the page', () => {
    render(<KaitenPage />)
    expect(screen.getByRole('group', { name: /conveyor belt/i })).toBeInTheDocument()
  })

  it('leaves a way back to the shop', () => {
    render(<KaitenPage />)
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/')
  })

  // The belt carries nothing yet, so the heading is the page's only text and
  // it is hidden. A route with no h1 at all is the thing to avoid.
  it('has a heading even though there is nothing on the belt to name', () => {
    render(<KaitenPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The belt')
  })
})
