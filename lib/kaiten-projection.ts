/**
 * The oblique axonometric the /kaiten route is drawn in.
 *
 * A conveyor seen from a fixed corner is a shear, not a camera, so the whole
 * scene is built from two screen vectors rather than a projection matrix:
 *
 *   travel  T = (1, -RISE)          the direction the belt runs
 *   width   W = (WIDE_X, WIDE_Y)    the direction across it
 *
 * Anything lying on the belt's surface is authored as an axis-aligned shape
 * in belt space — x along the belt, y across it — and mapped onto the page by
 * `beltTransform()`, whose two columns are exactly T and W. That is what lets
 * slats be plain rects and the travel animation be a plain translateX: the
 * shear is the parent's problem.
 *
 * It lives here rather than in the belt component because the box the order
 * is packed into is drawn in the same projection. A bento that arrives in its
 * own coordinate system is a card that appeared over the page; one that
 * arrives in this one is an object in the same world as the belt.
 */

/** How far the belt falls, in page pixels, per pixel it travels. */
export const RISE = 0.22
/** The width vector: one step across the belt, in page pixels. */
export const WIDE_X = 0.6
export const WIDE_Y = 0.72
/** Where the belt's far rail crosses the left edge of the frame. */
export const ORIGIN_Y = 425
/** Across the belt, in belt space. */
export const BELT_W = 240

/** The frame everything is composed in. */
export const FRAME_W = 1400
export const FRAME_H = 700

/**
 * The near edge of the belt's surface is the line y = -RISE*x + NEAR_Y. The
 * side of the belt hangs off it, and anything sitting on the surface is above
 * it.
 */
export const NEAR_Y = ORIGIN_Y + WIDE_Y * BELT_W + RISE * (WIDE_X * BELT_W)

/** The belt-space -> page matrix. Columns are the travel and width vectors. */
export function beltTransform(): string {
  return `matrix(1, ${-RISE}, ${WIDE_X}, ${WIDE_Y}, 0, ${ORIGIN_Y})`
}

/** Page coordinates of a point on the belt's surface. */
export function onBelt(x: number, y: number): [number, number] {
  return [x + WIDE_X * y, -RISE * x + WIDE_Y * y + ORIGIN_Y]
}

/**
 * The page vector one unit of belt travel covers. Anything that has to move
 * with the belt but cannot be drawn inside the sheared group — a piece of
 * sushi, a box — travels along this instead.
 */
export function alongBelt(distance: number): [number, number] {
  return [distance, -RISE * distance]
}
