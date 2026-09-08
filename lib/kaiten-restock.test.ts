import { describe, expect, it } from 'vitest'
import { restockDelay, type RestockGeometry } from '@/lib/kaiten-restock'

/** The frame the belt is drawn in, and the widest piece that rides it. */
const FRAME_W = 1400
const WIDEST = 124

/** The belt as components/kaiten-belt draws it. */
const BELT: RestockGeometry = {
  ridePitch: 210,
  rideLoop: 1680,
  rideSeconds: 33.6,
  exitX: FRAME_W + WIDEST,
}

/** Where slot `i` sits, in page pixels, `t` seconds into the ride loop. */
const at = (i: number, t: number) => i * BELT.ridePitch + (t / BELT.rideSeconds) * BELT.rideLoop

describe('restockDelay', () => {
  it('waits for the gap to clear the right edge of the frame', () => {
    // Slot 0 starts at x=0 and has 1524 to travel at 50px a second.
    expect(restockDelay(0, 0, BELT)).toBeCloseTo(30.48, 6)
    expect(at(0, restockDelay(0, 0, BELT))).toBeCloseTo(BELT.exitX, 6)
  })

  it('counts from now, not from the top of the loop', () => {
    expect(restockDelay(0, 10, BELT)).toBeCloseTo(20.48, 6)
  })

  // A piece far enough left never reaches the right edge before the loop
  // resets. The reset itself is the answer: it drops every slot back by a
  // whole loop, which puts this one off the left of the frame.
  it('waits for the reset when the gap cannot make it out to the right', () => {
    const slot = -8
    expect(at(slot, BELT.rideSeconds)).toBeLessThan(BELT.exitX)
    expect(restockDelay(slot, 0, BELT)).toBeCloseTo(BELT.rideSeconds, 6)
  })

  it('leaves a gap off the left of the frame after that reset', () => {
    for (let slot = -12; slot <= 12; slot++) {
      const delay = restockDelay(slot, 0, BELT)
      if (delay < BELT.rideSeconds) continue
      // Restocked at the reset, so the slot is back at its own start.
      expect(slot * BELT.ridePitch).toBeLessThan(0)
    }
  })

  // Whatever the slot and whenever the click, the piece is put back at a
  // moment it cannot be seen being put back. This is the whole claim, so it
  // is checked against the frame the viewer actually sees rather than against
  // exitX, which is the same edge with the widest piece already allowed for.
  it('never restocks a gap that is still inside the frame', () => {
    for (let slot = -12; slot <= 12; slot++) {
      for (let t = 0; t < BELT.rideSeconds; t += 0.7) {
        const when = t + restockDelay(slot, t, BELT)
        const x = when >= BELT.rideSeconds ? slot * BELT.ridePitch : at(slot, when)
        const offRight = x >= FRAME_W
        const offLeft = x + WIDEST <= 0
        expect(offRight || offLeft).toBe(true)
      }
    }
  })

  it('restocks at once when the gap is already past the edge', () => {
    expect(8 * BELT.ridePitch).toBeGreaterThan(BELT.exitX)
    expect(restockDelay(8, 0, BELT)).toBe(0)
  })

  it('never asks anyone to wait a negative amount of time', () => {
    for (let slot = -12; slot <= 12; slot++) {
      for (let t = 0; t < BELT.rideSeconds; t += 1.3) {
        expect(restockDelay(slot, t, BELT)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
