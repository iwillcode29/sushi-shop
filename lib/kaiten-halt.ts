/**
 * Bring the belt to a stop, and start it again.
 *
 * A belt that stops between one frame and the next has not stopped, it has
 * been switched off — and the box that arrives next is standing on something
 * that was moving a moment ago, so the eye wants to have watched it settle.
 * CSS cannot ease an animation to a halt, but the animations are objects with
 * a playback rate, so this rides them down instead.
 *
 * Everything here is guarded rather than assumed: without the Web Animations
 * API there is nothing running to slow down, and the caller carries on.
 */
const HALT_MS = 820

/** Fast at first, then a long settle — a belt coasting, not braking. */
function coast(t: number): number {
  return Math.pow(1 - t, 1.7)
}

export function beltAnimations(root: Element | null): Animation[] {
  return root?.getAnimations?.({ subtree: true }) ?? []
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

export function resumeBelt(root: Element | null): void {
  for (const animation of beltAnimations(root)) animation.updatePlaybackRate?.(1)
}
