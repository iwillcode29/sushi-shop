import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreloadModel } from '@/components/preload-model'

describe('PreloadModel', () => {
  it('hoists a preload hint for the model into the document head', () => {
    render(<PreloadModel href="/models/sushis.glb" />)
    const link = document.head.querySelector('link[rel="preload"][href="/models/sushis.glb"]')
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute('as', 'fetch')
    // React emits the empty form, which the HTML spec defines as the
    // anonymous state — same request, fewer bytes.
    expect(link).toHaveAttribute('crossorigin', '')
  })

  it('renders nothing of its own', () => {
    const { container } = render(<PreloadModel href="/models/sushis.glb" />)
    expect(container).toBeEmptyDOMElement()
  })
})
