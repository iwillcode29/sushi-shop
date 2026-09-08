import { describe, expect, it } from 'vitest'
import { NEAREST, showcaseFrame, TURNS } from '@/lib/showcase-turntable'

describe('showcaseFrame', () => {
  it('starts the set square to the camera', () => {
    expect(showcaseFrame(0).rotationY).toBe(0)
  })

  it('turns the set through its full sweep across the scroll', () => {
    expect(showcaseFrame(1).rotationY).toBeCloseTo(TURNS * Math.PI * 2)
  })

  it('turns at an even rate', () => {
    expect(showcaseFrame(0.5).rotationY).toBeCloseTo(showcaseFrame(1).rotationY / 2)
  })

  it('clamps progress that overshoots in either direction', () => {
    expect(showcaseFrame(-2).rotationY).toBe(0)
    expect(showcaseFrame(9).rotationY).toBeCloseTo(showcaseFrame(1).rotationY)
  })

  // The dolly is what makes the section read as approaching the counter
  // rather than as a spinning product shot.
  it('closes the camera in as the scroll runs on', () => {
    expect(showcaseFrame(1).distance).toBeLessThan(showcaseFrame(0).distance)
  })

  it('closes in monotonically', () => {
    let previous = Infinity
    for (let p = 0; p <= 1; p += 0.05) {
      const { distance } = showcaseFrame(p)
      expect(distance).toBeLessThanOrEqual(previous)
      previous = distance
    }
  })

  // Inside this the camera is through the tray and the framing falls apart,
  // so the end of the scroll has to land outside it.
  it('never closes past the point where the set stops fitting the frame', () => {
    expect(showcaseFrame(1).distance).toBeGreaterThanOrEqual(NEAREST)
  })

  it('keeps the camera above the counter throughout', () => {
    for (let p = 0; p <= 1; p += 0.1) {
      expect(showcaseFrame(p).height).toBeGreaterThan(0)
    }
  })

  it('drops the eye line toward the counter as it closes in', () => {
    expect(showcaseFrame(1).height).toBeLessThan(showcaseFrame(0).height)
  })
})
