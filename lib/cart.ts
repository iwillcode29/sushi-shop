import { KAITEN_PIECES, type KaitenPiece } from '@/lib/kaiten-pieces'

/**
 * What has been taken off the belt, in the order it was taken.
 *
 * A list rather than a map of counts: the order pieces were first taken in is
 * the order the bill reads in, and a bill that reshuffles itself while you are
 * still adding to it is a bill you cannot follow.
 */
export type Cart = readonly string[]

export interface CartLine {
  piece: KaitenPiece
  quantity: number
}

export function addToCart(cart: Cart, id: string): Cart {
  return [...cart, id]
}

export function cartCount(cart: Cart): number {
  return cart.length
}

/**
 * The bill: one line per kind, in the order each kind first appeared.
 *
 * An id with nothing behind it is dropped. Nothing in the UI can produce one,
 * but a restored session could, and a bill that quietly totals NaN is worse
 * than a bill that is one line short.
 */
export function cartLines(cart: Cart): CartLine[] {
  const lines: CartLine[] = []
  const byId = new Map<string, CartLine>()

  for (const id of cart) {
    const existing = byId.get(id)
    if (existing) {
      existing.quantity += 1
      continue
    }
    const piece = KAITEN_PIECES.find((candidate) => candidate.id === id)
    if (!piece) continue
    const line = { piece, quantity: 1 }
    byId.set(id, line)
    lines.push(line)
  }

  return lines
}

export function cartTotal(cart: Cart): number {
  return cartLines(cart).reduce((sum, line) => sum + line.piece.price * line.quantity, 0)
}
