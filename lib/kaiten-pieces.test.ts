import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KAITEN_PIECES } from '@/lib/kaiten-pieces'

describe('KAITEN_PIECES', () => {
  it('carries the sixteen pieces the belt loop is built on', () => {
    expect(KAITEN_PIECES).toHaveLength(16)
    expect(new Set(KAITEN_PIECES.map((p) => p.id)).size).toBe(16)
  })

  it('prices every piece in whole yen', () => {
    for (const piece of KAITEN_PIECES) {
      expect(Number.isInteger(piece.price)).toBe(true)
      expect(piece.price).toBeGreaterThan(0)
    }
  })

  // The counter's price list is rendered straight from this array, so a
  // piece with no artwork is a hole in the list rather than a missing
  // picture on the belt, where the row would simply not be drawn.
  it('has artwork on disk for every piece', () => {
    for (const piece of KAITEN_PIECES) {
      expect(existsSync(join(process.cwd(), 'public', 'sushi', `${piece.id}.webp`))).toBe(true)
    }
  })

  it('names every piece in both scripts', () => {
    for (const piece of KAITEN_PIECES) {
      expect(piece.name).toMatch(/\S/)
      expect(piece.nameJa).toMatch(/\S/)
    }
  })

  // The belt lays each piece out from these before its file decodes.
  it('knows the size of every asset it draws', () => {
    for (const piece of KAITEN_PIECES) {
      expect(piece.w).toBeGreaterThan(0)
      expect(piece.h).toBeGreaterThan(0)
    }
  })
})
