import { describe, expect, it } from 'vitest'
import type { CartLine } from '@/lib/cart'
import { KAITEN_PIECES } from '@/lib/kaiten-pieces'
import { MAX_IN_COMPARTMENT, orizumeTimeline, packOrizume } from '@/lib/orizume'

const line = (index: number, quantity = 1): CartLine => ({
  piece: KAITEN_PIECES[index],
  quantity,
})

const lines = (count: number) => Array.from({ length: count }, (_, i) => line(i))

/** Two rectangles in the unit box overlap if they overlap on both axes. */
const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('packOrizume', () => {
  it('gives a single kind the whole box', () => {
    const [only] = packOrizume([line(0)])
    expect(only).toMatchObject({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('divides a short order across the box rather than down it', () => {
    for (const count of [2, 3]) {
      const cells = packOrizume(lines(count))
      expect(cells).toHaveLength(count)
      expect(cells.every((cell) => cell.h === 1)).toBe(true)
    }
  })

  it('goes to two rows once there are four kinds', () => {
    const cells = packOrizume(lines(4))
    expect(new Set(cells.map((cell) => cell.y)).size).toBe(2)
    expect(cells.every((cell) => cell.w === 0.5 && cell.h === 0.5)).toBe(true)
  })

  // Real shikiri are not a uniform grid, and a bento with a hole in it looks
  // like a bento someone has already eaten from.
  it('stretches the last compartment of a short row rather than leaving a hole', () => {
    const cells = packOrizume(lines(5))
    const bottom = cells.filter((cell) => cell.y > 0)

    expect(bottom).toHaveLength(2)
    expect(bottom[bottom.length - 1].w).toBeGreaterThan(bottom[0].w)
    expect(bottom.reduce((sum, cell) => sum + cell.w, 0)).toBeCloseTo(1, 6)
  })

  it('fills every row edge to edge, for any order it can be given', () => {
    for (let count = 1; count <= KAITEN_PIECES.length; count++) {
      const cells = packOrizume(lines(count))
      const rows = new Map<number, number>()
      for (const cell of cells) rows.set(cell.y, (rows.get(cell.y) ?? 0) + cell.w)
      for (const width of rows.values()) expect(width).toBeCloseTo(1, 6)
    }
  })

  it('never overlaps two compartments and never leaves the box', () => {
    for (let count = 1; count <= KAITEN_PIECES.length; count++) {
      const cells = packOrizume(lines(count))
      for (const cell of cells) {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.y).toBeGreaterThanOrEqual(0)
        expect(cell.x + cell.w).toBeLessThanOrEqual(1 + 1e-9)
        expect(cell.y + cell.h).toBeLessThanOrEqual(1 + 1e-9)
      }
      for (let a = 0; a < cells.length; a++) {
        for (let b = a + 1; b < cells.length; b++) {
          expect(overlaps(cells[a], cells[b])).toBe(false)
        }
      }
    }
  })

  it('keeps the compartments in the order the pieces were taken', () => {
    const cells = packOrizume([line(3), line(0), line(4)])
    expect(cells.map((cell) => cell.line.piece.id)).toEqual([
      KAITEN_PIECES[3].id,
      KAITEN_PIECES[0].id,
      KAITEN_PIECES[4].id,
    ])
  })

  it('puts one piece in the middle of its compartment', () => {
    const [only] = packOrizume([line(0)])
    expect(only.slots).toEqual([{ x: 0.5, y: 0.5 }])
  })

  it('lays repeats out without stacking them on one spot', () => {
    const [only] = packOrizume([line(0, 3)])
    expect(only.slots).toHaveLength(3)
    expect(new Set(only.slots.map((slot) => slot.x)).size).toBe(3)
    for (const slot of only.slots) {
      expect(slot.x).toBeGreaterThan(0)
      expect(slot.x).toBeLessThan(1)
      expect(slot.y).toBeGreaterThan(0)
      expect(slot.y).toBeLessThan(1)
    }
  })

  // Someone who takes eleven tamago gets eleven on the bill. Drawing eleven
  // in one compartment draws a smear.
  it('stops drawing repeats once the compartment is full', () => {
    const [only] = packOrizume([line(0, 11)])
    expect(only.slots).toHaveLength(MAX_IN_COMPARTMENT)
    expect(only.line.quantity).toBe(11)
  })
})

describe('orizumeTimeline', () => {
  const cells = (kinds: number, quantity = 1) =>
    packOrizume(Array.from({ length: kinds }, (_, i) => line(i, quantity)))

  it('runs the sequence in the order the eye needs it', () => {
    const t = orizumeTimeline(cells(3))
    expect(t.box).toBe(0)
    expect(t.dividers[0]).toBeGreaterThan(t.box)
    expect(t.pieces[0]).toBeGreaterThan(t.dividers[t.dividers.length - 1])
    expect(t.band).toBeGreaterThan(t.pieces[t.pieces.length - 1])
    expect(t.receipt).toBeGreaterThan(t.band)
    expect(t.hanko).toBeGreaterThan(t.receipt)
  })

  it('gives one cue per divider and one per piece drawn', () => {
    const packed = cells(5, 3)
    const drawn = packed.reduce((n, cell) => n + cell.slots.length, 0)
    const t = orizumeTimeline(packed)

    // Four internal dividers between five compartments.
    expect(t.dividers).toHaveLength(4)
    expect(t.pieces).toHaveLength(drawn)
  })

  it('staggers rather than firing everything at once', () => {
    const t = orizumeTimeline(cells(4, 2))
    for (let i = 1; i < t.pieces.length; i++) {
      expect(t.pieces[i]).toBeGreaterThan(t.pieces[i - 1])
    }
  })

  // A box of one piece should not sit and wait for a stagger that has nothing
  // to stagger.
  it('brings the receipt sooner for a smaller order', () => {
    expect(orizumeTimeline(cells(1)).receipt).toBeLessThan(orizumeTimeline(cells(8)).receipt)
  })

  it('has no cues at all for an order with nothing in it', () => {
    const t = orizumeTimeline([])
    expect(t.dividers).toEqual([])
    expect(t.pieces).toEqual([])
  })
})
