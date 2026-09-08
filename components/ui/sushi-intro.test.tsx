import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SushiIntro } from '@/components/ui/sushi-intro'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SushiIntro', () => {
  it('mounts the video it will scrub', () => {
    const { container } = render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', '/video/sushi-counter.mp4')
  })

  // The whole intro is seeking, never playback. Calling play() would fight
  // every currentTime the scroll writes.
  it('never plays the video', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
    render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    expect(play).not.toHaveBeenCalled()
  })

  // Seeking to an arbitrary time only works on what is already buffered, so
  // the file has to be fetched up front rather than streamed on demand.
  it('asks for the whole file up front so it can be seeked', () => {
    const { container } = render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    expect(container.querySelector('video')).toHaveAttribute('preload', 'auto')
  })

  it('mutes the video, which browsers require of one that never got a gesture', () => {
    const { container } = render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    expect(container.querySelector('video')).toHaveProperty('muted', true)
  })

  it('plays inline rather than handing off to a native fullscreen player', () => {
    const { container } = render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    expect(container.querySelector('video')).toHaveAttribute('playsinline')
  })

  it('names the shop over the footage', () => {
    render(<SushiIntro videoSrc="/v.mp4" title="鮨 かねもり" />)
    expect(screen.getByText('鮨 かねもり')).toBeInTheDocument()
  })

  // Full-bleed footage with no chrome gives no hint that scrolling does
  // anything, so the cue is the only affordance the intro has.
  it('tells the visitor that scrolling is what moves the intro', () => {
    render(<SushiIntro videoSrc="/v.mp4" />)
    expect(screen.getByText(/scroll/i)).toBeInTheDocument()
  })

  it('reserves more than one viewport of scroll for the intro to spend', () => {
    render(<SushiIntro videoSrc="/v.mp4" />)
    const section = screen.getByTestId('sushi-intro')
    expect(section.style.height).toMatch(/^\d+vh$/)
    expect(Number.parseInt(section.style.height, 10)).toBeGreaterThan(100)
  })

  it('pins its content while that scroll is spent', () => {
    render(<SushiIntro videoSrc="/v.mp4" />)
    expect(screen.getByTestId('sushi-intro-stage')).toHaveStyle({ position: 'sticky' })
  })

  it('hides the decorative footage from assistive technology', () => {
    const { container } = render(<SushiIntro videoSrc="/v.mp4" />)
    expect(container.querySelector('video')).toHaveAttribute('aria-hidden', 'true')
  })
})
