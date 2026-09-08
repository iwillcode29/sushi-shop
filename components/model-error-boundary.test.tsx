import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModelErrorBoundary } from '@/components/model-error-boundary'

function Boom(): never {
  throw new Error('GLB parse failed')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ModelErrorBoundary', () => {
  // The default poster is the home page's: cream, and headed "Handcrafted in
  // WebGL". On the dark /menu route that is the wrong colour and the wrong
  // words, so a caller has to be able to supply its own.
  it('renders a fallback of the caller\'s choosing', () => {
    render(
      <ModelErrorBoundary fallback={<p>the counter is dark tonight</p>}>
        <Boom />
      </ModelErrorBoundary>,
    )
    expect(screen.getByText(/counter is dark/i)).toBeInTheDocument()
    expect(screen.queryByText(/handcrafted in webgl/i)).toBeNull()
  })

  it('renders its children when nothing goes wrong', () => {
    render(
      <ModelErrorBoundary>
        <p>scene</p>
      </ModelErrorBoundary>,
    )
    expect(screen.getByText('scene')).toBeInTheDocument()
  })

  it('renders the fallback panel when a child throws', () => {
    // React logs caught render errors; silence the expected noise, scoped to
    // this test only, and assert it actually fired rather than merely muting it.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ModelErrorBoundary>
        <Boom />
      </ModelErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
  })
})
