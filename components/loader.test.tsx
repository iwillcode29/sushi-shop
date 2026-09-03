import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const progress = { active: true, progress: 0 }

vi.mock('@react-three/drei', () => ({
  useProgress: () => progress,
}))

import { Loader } from '@/components/loader'

describe('Loader', () => {
  it('renders nothing once loading has finished', () => {
    progress.active = false
    const { container } = render(<Loader />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes progress to assistive technology while loading', () => {
    progress.active = true
    progress.progress = 42.7
    render(<Loader />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '43')
  })

  it('reflects progress in the bar width', () => {
    progress.active = true
    progress.progress = 25
    render(<Loader />)
    expect(screen.getByTestId('loader-fill')).toHaveStyle({ width: '25%' })
  })
})
