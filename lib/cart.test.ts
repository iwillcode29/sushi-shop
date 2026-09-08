import { describe, expect, it } from 'vitest'
import { addToCart, cartCount, cartLines, cartTotal } from '@/lib/cart'
import { KAITEN_PIECES } from '@/lib/kaiten-pieces'

const price = (id: string) => KAITEN_PIECES.find((p) => p.id === id)!.price

describe('cart', () => {
  it('starts empty', () => {
    expect(cartCount([])).toBe(0)
    expect(cartTotal([])).toBe(0)
    expect(cartLines([])).toEqual([])
  })

  it('counts every piece taken, not every kind', () => {
    const cart = addToCart(addToCart(addToCart([], 'maguro'), 'maguro'), 'ikura')
    expect(cartCount(cart)).toBe(3)
  })

  it('leaves the cart it was given alone', () => {
    const before = addToCart([], 'maguro')
    addToCart(before, 'ikura')
    expect(before).toEqual(['maguro'])
  })

  it('groups repeats into one line', () => {
    const cart = ['maguro', 'ikura', 'maguro']
    expect(cartLines(cart)).toEqual([
      { piece: KAITEN_PIECES.find((p) => p.id === 'maguro'), quantity: 2 },
      { piece: KAITEN_PIECES.find((p) => p.id === 'ikura'), quantity: 1 },
    ])
  })

  // A bill that reorders itself as you add to it is a bill you cannot read
  // while you are adding to it.
  it('keeps the lines in the order the pieces were first taken', () => {
    const cart = ['ikura', 'maguro', 'ikura', 'tamago']
    expect(cartLines(cart).map((line) => line.piece.id)).toEqual(['ikura', 'maguro', 'tamago'])
  })

  it('totals the pieces, counting repeats', () => {
    const cart = ['maguro', 'maguro', 'ikura']
    expect(cartTotal(cart)).toBe(price('maguro') * 2 + price('ikura'))
  })

  // Nothing in the UI can add an unknown id, but a stale link or a hand-edited
  // store could, and a bill that silently reads NaN is worse than one short line.
  it('ignores an id it does not sell', () => {
    expect(cartTotal(['maguro', 'unagi'])).toBe(price('maguro'))
    expect(cartLines(['unagi'])).toEqual([])
  })
})
