import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FallbackPoster } from '@/components/fallback-poster'

describe('FallbackPoster', () => {
  it('explains a missing WebGL context', () => {
    render(<FallbackPoster reason="no-webgl" />)
    expect(screen.getByText(/cannot open a WebGL context/i)).toBeInTheDocument()
  })

  it('offers no retry when the browser simply cannot render', () => {
    render(<FallbackPoster reason="no-webgl" onRetry={() => {}} />)
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('offers a retry when a load failed', async () => {
    const onRetry = vi.fn()
    render(<FallbackPoster reason="load-failed" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('still names the subject so the panel is never contentless', () => {
    render(<FallbackPoster reason="load-failed" />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })
})
