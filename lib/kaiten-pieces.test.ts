import { describe, expect, it } from 'vitest'
import { KAITEN_PIECES } from '@/lib/kaiten-pieces'
import { SUSHI_MENU } from '@/lib/sushi-menu'

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

  // The same neta cannot cost one thing on the menu and another on the belt.
  it('charges what the menu charges for the neta the two share', () => {
    for (const piece of KAITEN_PIECES) {
      const onMenu = SUSHI_MENU.find((item) => item.id === piece.id)
      if (onMenu) expect(piece.price).toBe(onMenu.price)
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
