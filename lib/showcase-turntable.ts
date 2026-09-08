/** Full turns the set makes across the section's scroll. */
export const TURNS = 0.85

/** Camera distance at the top of the section, in model units. */
export const FARTHEST = 2.95

/**
 * Camera distance at the end of the section. Held above the point where the
 * tray stops fitting the frame — the set is long and thin, so its on-screen
 * footprint swings a lot between its broadside and end-on presentations, and
 * this is sized to the broadside worst case rather than to a resting frame.
 */
export const NEAREST = 1.9

const EYE_HIGH = 1.32
const EYE_LOW = 0.72

export interface ShowcaseFrame {
  /** Turntable angle in radians. */
  rotationY: number
  /** Camera distance from the set's centre. */
  distance: number
  /** Camera height above the counter. */
  height: number
}

/**
 * The camera move the showcase section performs, derived from one scroll
 * position.
 *
 * Pure and separate from the component for the same reason as introFrame:
 * the component reads its input from `getBoundingClientRect` inside a
 * `useFrame` callback, which reports zero for everything under jsdom.
 */
export function showcaseFrame(progress: number): ShowcaseFrame {
  const p = Math.min(1, Math.max(0, progress))
  return {
    rotationY: p * TURNS * Math.PI * 2,
    distance: FARTHEST + (NEAREST - FARTHEST) * p,
    height: EYE_HIGH + (EYE_LOW - EYE_HIGH) * p,
  }
}
