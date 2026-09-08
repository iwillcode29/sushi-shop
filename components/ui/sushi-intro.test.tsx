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

  // iOS Safari will not paint a <video> that has never begun playback:
  // assigning currentTime seeks the media, but the element renders nothing
  // until play() has run at least once. That is why the intro showed as an
  // empty black frame on an iPhone while the 3D section rendered fine.
  it('starts the video once so iOS will paint the frames it seeks to', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    expect(play).toHaveBeenCalled()
  })

  // Scroll is the transport. Playback exists only to wake the decoder, so it
  // must not be left running against the scroll position.
  it('pauses again immediately, leaving scroll in charge', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    await vi.waitFor(() => expect(pause).toHaveBeenCalled())
    expect(play).toHaveBeenCalledTimes(1)
  })

  // Low Power Mode refuses muted autoplay outright, and only a real gesture
  // lifts it — so the same wake-up is retried on the visitor's first touch.
  it('retries the wake-up on the first touch when autoplay is refused', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValue(new DOMException('NotAllowedError'))
    render(<SushiIntro videoSrc="/video/sushi-counter.mp4" />)
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    window.dispatchEvent(new Event('touchstart'))
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2))
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

  // Until the decoder has painted something the frame is pure black, which
  // reads as a broken page rather than a loading one — and on a device that
  // refuses to paint the video at all, the poster is what the visitor keeps.
  it('shows the opening frame until the video can paint', () => {
    const { container } = render(<SushiIntro videoSrc="/v.mp4" posterSrc="/p.jpg" />)
    expect(container.querySelector('video')).toHaveAttribute('poster', '/p.jpg')
  })

  it('names the shop over the footage', () => {
    render(<SushiIntro videoSrc="/v.mp4" title="鮨 ねこもり" />)
    expect(screen.getByText('鮨 ねこもり')).toBeInTheDocument()
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
