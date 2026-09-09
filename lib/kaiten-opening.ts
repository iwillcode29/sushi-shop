/**
 * 開店 — the opening.
 *
 * The route is 回転, the turning. This is the other kaiten, the one a shop
 * does at eleven in the morning, and it is the same word said out loud.
 *
 * Nothing here is a page transition. A page transition is a rectangle
 * arriving; this is a counter opening for service, in the order a counter
 * actually opens in: the light over it comes up, the machine is pushed into
 * place, the first service is laid out on it, and only then does anybody
 * throw the switch. The belt is the last thing to move, not the first.
 *
 * The numbers live here rather than in the stylesheet because three files
 * need them — the belt lays its pieces on a stagger, the order component
 * knows when to throw the switch, and the page's own furniture follows on
 * behind — and the stylesheet cannot be imported. What the stylesheet holds
 * is checked against this in lib/kaiten-opening.test.ts.
 *
 * Seconds from the moment the route mounts, throughout.
 */
export const OPENING = {
  /** The lamp over the counter. Everything else happens inside its rise. */
  lamp: 0,
  /** The machine, pushed in across itself. */
  machine: 0.1,
  /** The first piece set down on the belt, and one piece to the next. */
  firstPiece: 0.62,
  pieceStep: 0.05,
  /**
   * The last slot that gets a beat of its own.
   *
   * A piece sits at page x = slot * 210 + 72 and the frame is 1400 across, so
   * slots 0 through 6 are the ones anybody watches being laid down. The strip
   * carries a sequence and a half more at either end for the loop to work
   * with, and those are off the frame in both directions — giving them later
   * and later delays would only stretch the sequence out behind the scenery.
   */
  lastPiece: 7,
  /**
   * The switch.
   *
   * Thrown as the last piece anybody can see is being set down, not after it
   * has settled. The two overlap by design: a counter where every plate had
   * come to a dead stop before anything moved would have been laid out by a
   * machine, and 620ms of exponential-out is most of the way home inside the
   * first hundred of them anyway.
   */
  drive: 1.0,
  /** The furniture — the way back, the tally, the credit — and one to the next. */
  chrome: 1.25,
  chromeStep: 0.12,
} as const

/**
 * When the piece in `slot` is set down.
 *
 * Clamped at both ends: everything upstream of the frame is laid on at once,
 * because a stagger nobody can see is only a delay.
 */
export function layDelay(slot: number): number {
  const beat = Math.min(Math.max(slot, 0), OPENING.lastPiece)
  return OPENING.firstPiece + beat * OPENING.pieceStep
}

/** When the nth piece of page furniture arrives. */
export function chromeDelay(n: number): number {
  return OPENING.chrome + n * OPENING.chromeStep
}
