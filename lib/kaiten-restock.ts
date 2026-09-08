/** The belt's ride loop, as far as restocking is concerned. */
export interface RestockGeometry {
  /** Belt-space distance from one piece to the next, in page pixels. */
  ridePitch: number
  /** How far the ride loop travels before it starts over. */
  rideLoop: number
  /** How long it takes to travel it. */
  rideSeconds: number
  /** The page x past which a gap is outside the frame. */
  exitX: number
}

/**
 * How long to leave a slot empty after its piece is taken, in seconds.
 *
 * Taking a piece off the belt leaves a hole, and the hole has to be filled
 * again or the belt runs out. The one thing that must not happen is a piece
 * appearing out of nothing in front of the person who took the last one — so
 * the answer is always a moment at which that slot is off the frame.
 *
 * The ride loop is a CSS animation with a known timeline, which makes this
 * arithmetic rather than observation. A slot sits at
 *
 *   x(t) = slot * ridePitch + (t / rideSeconds) * rideLoop
 *
 * which climbs steadily and then drops by a whole rideLoop when the animation
 * starts over. So there are exactly two ways out of the frame, and the slot
 * takes whichever comes first:
 *
 *   - it reaches exitX and leaves to the right, or
 *   - the loop resets and drops it back to slot * ridePitch, which is off the
 *     left of the frame for every slot that could not make it out to the right
 *     (it could not reach exitX in a whole loop, so it started below
 *     exitX - rideLoop, which is negative).
 *
 * `elapsed` is where the animation currently is in its loop, which the caller
 * reads from the running animation rather than from a clock of its own.
 */
export function restockDelay(slot: number, elapsed: number, geometry: RestockGeometry): number {
  const { ridePitch, rideLoop, rideSeconds, exitX } = geometry

  const leavesRight = (rideSeconds * (exitX - slot * ridePitch)) / rideLoop
  const clears = Math.min(leavesRight, rideSeconds)

  // A slot already past exitX is out of the frame now: its wait is over
  // before it began, and the clamp is what says so.
  return Math.max(0, clears - elapsed)
}
