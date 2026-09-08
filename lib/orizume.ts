import type { CartLine } from '@/lib/cart'

/**
 * How many of one kind get drawn in a compartment.
 *
 * The bill is what counts the order; this is what fits in a box. Eleven
 * tamago laid in one compartment is not eleven tamago, it is a smear.
 */
export const MAX_IN_COMPARTMENT = 5

/** Where one piece sits inside its compartment, from 0 to 1 on both axes. */
export interface Slot {
  x: number
  y: number
}

/**
 * One division of the box, as a fraction of it. The component that draws the
 * box owns the belt-space rectangle these are scaled onto — the packing does
 * not need to know how big a box is, only how it is divided.
 */
export interface Compartment {
  x: number
  y: number
  w: number
  h: number
  line: CartLine
  slots: Slot[]
}

/**
 * How wide the grid is for a given number of kinds.
 *
 * Up to three go across in a single row: an orizume is a long shallow box and
 * a short order reads better along it than stacked in it. Four and up take
 * two rows.
 */
function columnsFor(kinds: number): number {
  if (kinds <= 3) return kinds
  return Math.ceil(kinds / 2)
}

/** The pieces of one line, laid on a short diagonal through its compartment. */
function slotsFor(quantity: number): Slot[] {
  const drawn = Math.min(quantity, MAX_IN_COMPARTMENT)
  if (drawn <= 1) return [{ x: 0.5, y: 0.5 }]

  // Tighter as there are more of them, and never so wide that a piece hangs
  // over a divider.
  const spread = Math.min(0.24, 0.09 * (drawn - 1))

  return Array.from({ length: drawn }, (_, i) => {
    const t = i / (drawn - 1) - 0.5
    return { x: 0.5 + t * 2 * spread, y: 0.5 + t * 2 * spread * 0.55 }
  })
}

/**
 * Divide the box between the kinds in an order.
 *
 * Rows are filled left to right in the order the pieces were taken, and a row
 * that does not fill up hands the remainder to its last compartment rather
 * than leaving a gap. Shikiri in a real orizume are not a uniform grid, and a
 * box with an empty division in it reads as a box someone has already eaten
 * from.
 */
export function packOrizume(lines: CartLine[]): Compartment[] {
  if (lines.length === 0) return []

  const columns = columnsFor(lines.length)
  const rows = Math.ceil(lines.length / columns)
  const h = 1 / rows

  return lines.map((line, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const inThisRow = Math.min(columns, lines.length - row * columns)
    const w = 1 / columns
    const last = column === inThisRow - 1

    return {
      x: column * w,
      // The last compartment in a short row takes everything left of the edge.
      w: last ? 1 - column * w : w,
      y: row * h,
      h,
      line,
      slots: slotsFor(line.quantity),
    }
  })
}

/** When each beat of the packing starts, in seconds from the box arriving. */
export interface OrizumeTimeline {
  box: number
  /** One per divider drawn between compartments. */
  dividers: number[]
  /** One per piece drawn, in the order they are laid in. */
  pieces: number[]
  band: number
  receipt: number
  hanko: number
}

const BOX_TRAVEL = 0.7
const DIVIDER_STAGGER = 0.06
const PIECE_STAGGER = 0.09
const BAND_TRAVEL = 0.5
const RECEIPT_UNROLL = 0.62

/**
 * The order of the beats, derived from the order rather than hard-coded.
 *
 * The whole sequence is one gesture — box, divisions, pieces, band, receipt,
 * seal — and each beat waits on the one before it finishing, so a box with a
 * single piece in it does not sit through a stagger that has nothing left to
 * stagger.
 */
export function orizumeTimeline(compartments: Compartment[]): OrizumeTimeline {
  const dividerCount = Math.max(0, compartments.length - 1)
  const dividersAt = BOX_TRAVEL * 0.8

  const dividers = Array.from({ length: dividerCount }, (_, i) => dividersAt + i * DIVIDER_STAGGER)
  const piecesAt = dividersAt + dividerCount * DIVIDER_STAGGER + 0.24

  const drawn = compartments.reduce((n, cell) => n + cell.slots.length, 0)
  const pieces = Array.from({ length: drawn }, (_, i) => piecesAt + i * PIECE_STAGGER)

  const band = (pieces[pieces.length - 1] ?? piecesAt) + 0.34
  const receipt = band + BAND_TRAVEL * 0.55
  const hanko = receipt + RECEIPT_UNROLL + 0.3

  return { box: 0, dividers, pieces, band, receipt, hanko }
}
