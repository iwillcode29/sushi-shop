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
    const cart = addToCart(addToCart(addToCart([], 'akami'), 'akami'), 'ikura')
    expect(cartCount(cart)).toBe(3)
  })

  it('leaves the cart it was given alone', () => {
    const before = addToCart([], 'akami')
    addToCart(before, 'ikura')
    expect(before).toEqual(['akami'])
  })

  it('groups repeats into one line', () => {
    const cart = ['akami', 'ikura', 'akami']
    expect(cartLines(cart)).toEqual([
      { piece: KAITEN_PIECES.find((p) => p.id === 'akami'), quantity: 2 },
      { piece: KAITEN_PIECES.find((p) => p.id === 'ikura'), quantity: 1 },
    ])
  })

  // A bill that reorders itself as you add to it is a bill you cannot read
  // while you are adding to it.
  it('keeps the lines in the order the pieces were first taken', () => {
    const cart = ['ikura', 'akami', 'ikura', 'tamago']
    expect(cartLines(cart).map((line) => line.piece.id)).toEqual(['ikura', 'akami', 'tamago'])
  })

  it('totals the pieces, counting repeats', () => {
    const cart = ['akami', 'akami', 'ikura']
    expect(cartTotal(cart)).toBe(price('akami') * 2 + price('ikura'))
  })

  // Nothing in the UI can add an unknown id, but a stale link or a hand-edited
  // store could, and a bill that silently reads NaN is worse than one short line.
  it('ignores an id it does not sell', () => {
    expect(cartTotal(['akami', 'uni'])).toBe(price('akami'))
    expect(cartLines(['uni'])).toEqual([])
  })
})
