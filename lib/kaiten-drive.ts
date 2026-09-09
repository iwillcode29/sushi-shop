/**
 * The dial the belt is driven by: up to speed, and back down to a stop.
 *
 * A belt that starts between one frame and the next has not started, it has
 * been cut to — and one that stops that way has been switched off rather than
 * brought to rest. Either way the eye wants to have watched it happen, and
 * the box that lands at the end of the sequence is standing on something that
 * was moving a moment ago. CSS cannot ease an animation up or down, but the
 * animations are objects with a playback rate, so this rides them instead.
 *
 * The two curves are one curve read from either end. That is not a
 * flourish — it is the same machine, and a conveyor that took off along a
 * different profile than it coasted down would be two machines.
 *
 * Everything here is guarded rather than assumed: without the Web Animations
 * API there is nothing running to put on a dial, and the caller carries on.
 */
const HALT_MS = 820
const START_MS = 1250

/** Fast at first, then a long settle — a belt coasting, not braking. */
function coast(t: number): number {
  return Math.pow(1 - t, 1.7)
}

/** The same curve the other way round: hardest pull off the mark, then ease
    into the running speed. Which is also how a motor with a load on it
    behaves — its torque is greatest at a standstill. */
function pickUp(t: number): number {
  return 1 - coast(t)
}

/**
 * The animations that drive the belt: the looping ones, and nothing else.
 *
 * `getAnimations` hands back everything live in the subtree, and during the
 * opening that includes the arrival of every piece and the machine they are
 * being laid on. Putting those on the same dial froze the whole sequence in
 * mid-air. The loops are the only things here that run forever, which is a
 * cheaper test than a list of animation names the stylesheet would then have
 * to be kept in step with.
 */
export function beltAnimations(root: Element | null): Animation[] {
  return (root?.getAnimations?.({ subtree: true }) ?? []).filter(
    (animation) => animation.effect?.getTiming().iterations === Infinity,
  )
}

export function haltBelt(root: Element | null): Promise<void> {
  const animations = beltAnimations(root)
  if (animations.length === 0 || typeof requestAnimationFrame !== 'function') {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const start = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / HALT_MS)
      const rate = coast(t)
      for (const animation of animations) animation.updatePlaybackRate?.(rate)

      if (t < 1) {
        requestAnimationFrame(step)
        return
      }
      resolve()
    }

    requestAnimationFrame(step)
  })
}

/**
 * Throw the switch, after `delaySeconds` of the belt standing still.
 *
 * The wait is part of the job rather than the caller's, because the belt has
 * to be stopped for the whole of it — the rate goes to zero the moment this
 * is called, not when the ramp begins. Returns a handle that abandons the
 * ramp wherever it has got to, for a component that unmounts or an order
 * settled before the belt ever reached speed.
 *
 * A visitor who asked for reduced motion has no looping animations at all, so
 * there is nothing to find, nothing to slow down, and nothing to wait for.
 */
export function startBelt(root: Element | null, delaySeconds = 0): () => void {
  const animations = beltAnimations(root)
  if (animations.length === 0 || typeof requestAnimationFrame !== 'function') {
    return () => {}
  }

  for (const animation of animations) animation.updatePlaybackRate?.(0)

  let live = true
  let frame = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const ramp = () => {
    const start = performance.now()

    const step = (now: number) => {
      if (!live) return
      const t = Math.min(1, (now - start) / START_MS)
      for (const animation of animations) animation.updatePlaybackRate?.(pickUp(t))
      if (t < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
  }

  if (delaySeconds > 0) timer = setTimeout(ramp, delaySeconds * 1000)
  else ramp()

  return () => {
    live = false
    cancelAnimationFrame(frame)
    clearTimeout(timer)
  }
}
