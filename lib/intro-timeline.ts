/**
 * Where in the scroll the picture starts going to black. The remaining
 * travel is spent on the fade, so the menu is revealed onto a dark frame
 * rather than cutting away from a lit one.
 */
export const DIM_STARTS_AT = 0.85

/** How much scroll the "scroll to enter" cue survives before retiring. */
const CUE_ENDS_AT = 0.06

export interface IntroFrame {
  /** Seconds to seek the intro video to. */
  currentTime: number
  /** Opacity of the black overlay, 0 to 1. */
  dim: number
  /** Opacity of the scroll cue, 0 to 1. */
  cue: number
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/**
 * Everything the intro derives from one scroll position.
 *
 * Kept pure and separate from the component because the component reads its
 * inputs from `getBoundingClientRect` inside a rAF loop — which reports zero
 * for everything under jsdom, so the mapping itself could not otherwise be
 * tested.
 */
export function introFrame(progress: number, duration: number): IntroFrame {
  const p = clamp01(progress)
  // A <video> reports NaN, and then 0, for its duration until metadata
  // arrives. Multiplying by either writes a value the media element rejects.
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0

  const fade = (p - DIM_STARTS_AT) / (1 - DIM_STARTS_AT)

  return {
    currentTime: p * safeDuration,
    dim: clamp01(fade),
    cue: 1 - clamp01(p / CUE_ENDS_AT),
  }
}
