import { describe, expect, it } from 'vitest'
import { DIM_STARTS_AT, introFrame } from '@/lib/intro-timeline'

const DURATION = 9.041667

describe('introFrame', () => {
  it('parks on the first frame before the scroll starts', () => {
    const frame = introFrame(0, DURATION)
    expect(frame.currentTime).toBe(0)
    expect(frame.dim).toBe(0)
  })

  it('maps scroll progress linearly onto the timeline', () => {
    expect(introFrame(0.5, DURATION).currentTime).toBeCloseTo(DURATION / 2)
    expect(introFrame(0.25, DURATION).currentTime).toBeCloseTo(DURATION / 4)
  })

  it('lands on the last frame at the end of the scroll', () => {
    expect(introFrame(1, DURATION).currentTime).toBeCloseTo(DURATION)
  })

  it('clamps progress that overshoots in either direction', () => {
    expect(introFrame(-3, DURATION).currentTime).toBe(0)
    expect(introFrame(4, DURATION).currentTime).toBeCloseTo(DURATION)
  })

  // A duration of 0 is what a <video> reports before its metadata loads.
  it('yields a usable frame before the video knows its duration', () => {
    const frame = introFrame(0.5, 0)
    expect(frame.currentTime).toBe(0)
    expect(Number.isNaN(frame.currentTime)).toBe(false)
  })

  it('yields a usable frame when the duration is not a number yet', () => {
    expect(introFrame(0.5, NaN).currentTime).toBe(0)
  })

  it('holds the picture clear until the fade is due', () => {
    expect(introFrame(DIM_STARTS_AT - 0.01, DURATION).dim).toBe(0)
  })

  it('fades to black across the last stretch of the scroll', () => {
    const midFade = introFrame((DIM_STARTS_AT + 1) / 2, DURATION).dim
    expect(midFade).toBeGreaterThan(0)
    expect(midFade).toBeLessThan(1)
    expect(introFrame(1, DURATION).dim).toBe(1)
  })

  it('rises monotonically through the fade', () => {
    let previous = -1
    for (let p = DIM_STARTS_AT; p <= 1; p += 0.02) {
      const dim = introFrame(p, DURATION).dim
      expect(dim).toBeGreaterThanOrEqual(previous)
      previous = dim
    }
  })

  it('shows the scroll cue at rest and retires it once the visitor moves', () => {
    expect(introFrame(0, DURATION).cue).toBe(1)
    expect(introFrame(0.2, DURATION).cue).toBe(0)
  })
})
