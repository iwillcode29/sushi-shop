import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/stage-loader', () => ({
  StageLoader: () => <div data-testid="stage" />,
}))

import Home from '@/app/page'

describe('Home', () => {
  it('mounts the stage', () => {
    render(<Home />)
    expect(screen.getByTestId('stage')).toBeInTheDocument()
  })

  it('renders the headline as the page heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Handcrafted in WebGL/i)
  })

  it('renders the subline describing the model', () => {
    render(<Home />)
    expect(screen.getByText(/loaded as glTF/i)).toBeInTheDocument()
  })

  it('documents the model below the fold', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /about the model/i })).toBeInTheDocument()
  })

  it('states the facts that were read out of the GLB', () => {
    render(<Home />)
    expect(screen.getByText(/KHR_materials_unlit/)).toBeInTheDocument()
    expect(screen.getByText(/^2 meshes/i)).toBeInTheDocument()
  })

  it('credits the source of the asset', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /credit/i })).toBeInTheDocument()
  })

  it('lists what the page is built with', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /built with/i })).toBeInTheDocument()
    expect(screen.getByText(/react-three-fiber/i)).toBeInTheDocument()
  })

  it('anchors the About link target', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('#about')).not.toBeNull()
  })
})
