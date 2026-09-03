import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelErrorBoundary } from '@/components/model-error-boundary'

function Boom(): never {
  throw new Error('GLB parse failed')
}

beforeEach(() => {
  // React logs caught render errors; silence the expected noise.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

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
    render(
      <ModelErrorBoundary>
        <Boom />
      </ModelErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
