import { describe, expect, it } from 'vitest'
import { sectionProgress } from '@/lib/scroll-progress'

/** A section three viewports tall has two viewports of travel. */
const TALL = { top: 0, height: 2400 }
const VIEWPORT = 800

describe('sectionProgress', () => {
  it('reads zero while the section is still below the fold', () => {
    expect(sectionProgress({ top: 500, height: 2400 }, VIEWPORT)).toBe(0)
  })

  it('reads zero the moment the section reaches the top', () => {
    expect(sectionProgress(TALL, VIEWPORT)).toBe(0)
  })

  it('reads one half at the midpoint of its travel', () => {
    expect(sectionProgress({ top: -800, height: 2400 }, VIEWPORT)).toBeCloseTo(0.5)
  })

  it('reads one when its travel is used up', () => {
    expect(sectionProgress({ top: -1600, height: 2400 }, VIEWPORT)).toBe(1)
  })

  it('clamps rather than overshooting once scrolled past', () => {
    expect(sectionProgress({ top: -9000, height: 2400 }, VIEWPORT)).toBe(1)
  })

  // A section shorter than the viewport has no travel to divide by. Without
  // this guard the division yields Infinity or NaN and every consumer that
  // multiplies by it writes NaN into a style or into currentTime.
  it('reports a section with no travel as done once it reaches the top', () => {
    expect(sectionProgress({ top: 0, height: 400 }, VIEWPORT)).toBe(1)
  })

  it('reports a section with no travel as unstarted while it is below', () => {
    expect(sectionProgress({ top: 10, height: 400 }, VIEWPORT)).toBe(0)
  })

  it('never returns NaN for a zero-height section', () => {
    expect(sectionProgress({ top: 0, height: 0 }, VIEWPORT)).toBe(1)
  })

  it('treats a missing element as unstarted', () => {
    expect(sectionProgress(null, VIEWPORT)).toBe(0)
  })
})
