import { describe, expect, it } from 'vitest'
import { formatYen, SUSHI_MENU } from '@/lib/sushi-menu'

describe('SUSHI_MENU', () => {
  it('gives every item a unique id', () => {
    const ids = SUSHI_MENU.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names every item in both romaji and Japanese', () => {
    for (const item of SUSHI_MENU) {
      expect(item.name.trim()).not.toBe('')
      expect(item.nameJa.trim()).not.toBe('')
    }
  })

  it('prices every item as a positive whole number of yen', () => {
    for (const item of SUSHI_MENU) {
      expect(Number.isInteger(item.price)).toBe(true)
      expect(item.price).toBeGreaterThan(0)
    }
  })

  // The two colours are interpolated straight into a `linear-gradient(...)`
  // string, where an invalid value silently drops the whole declaration
  // rather than throwing — so the shape is asserted here instead.
  it('gives every item two six-digit hex colours', () => {
    for (const item of SUSHI_MENU) {
      expect(item.colorA).toMatch(/^#[0-9a-f]{6}$/i)
      expect(item.colorB).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('carries enough items to fill the wrapping wheel', () => {
    // The list wraps modulo its own length; below about eight rows the
    // same item is visible twice at once on a tall viewport.
    expect(SUSHI_MENU.length).toBeGreaterThanOrEqual(8)
  })
})

describe('formatYen', () => {
  it('prefixes the yen sign', () => {
    expect(formatYen(320)).toBe('¥320')
  })

  it('groups thousands', () => {
    expect(formatYen(1200)).toBe('¥1,200')
  })

  it('formats zero without a sign of its own', () => {
    expect(formatYen(0)).toBe('¥0')
  })
})
