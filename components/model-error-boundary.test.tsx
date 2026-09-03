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
