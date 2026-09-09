/**
 * One kind of sushi on the belt.
 *
 * `w`/`h` are the asset's own pixel dimensions. They are recorded here rather
 * than measured because the belt lays every piece out before its file has
 * decoded — an <image> sized from a load event would land the whole row a
 * frame late, on a belt that is already moving.
 */
export interface KaitenPiece {
  id: string
  /** Romaji, the primary label on the bill. */
  name: string
  nameJa: string
  /** Whole yen. Japanese menus do not use a minor unit. */
  price: number
  w: number
  h: number
}

/**
 * The eight, in the order they come past. Nigiri and rolls alternate so the
 * silhouette changes from one piece to the next, and there are eight because
 * that is the length the belt's loop is built on — see components/kaiten-belt.
 *
 * Where a piece is also on the counter's own list, it is priced from there:
 * the same neta cannot cost one thing on the menu and another on the belt.
 */
export const KAITEN_PIECES: KaitenPiece[] = [
  { id: 'maguro', name: 'Maguro', nameJa: 'マグロ', price: 380, w: 512, h: 354 },
  { id: 'tekkamaki', name: 'Tekkamaki', nameJa: '鉄火巻', price: 320, w: 454, h: 505 },
  { id: 'sake', name: 'Sake', nameJa: 'サーモン', price: 320, w: 512, h: 353 },
  { id: 'ikura', name: 'Ikura', nameJa: 'イクラ', price: 480, w: 439, h: 512 },
  { id: 'ebi', name: 'Ebi', nameJa: 'エビ', price: 280, w: 512, h: 321 },
  { id: 'futomaki', name: 'Futomaki', nameJa: '太巻', price: 380, w: 454, h: 505 },
  { id: 'tamago', name: 'Tamago', nameJa: '玉子', price: 220, w: 512, h: 363 },
  { id: 'temaki', name: 'Temaki', nameJa: '手巻', price: 420, w: 512, h: 366 },
]

/** The piece in slot `i`, counting either way from the first one. */
export function pieceAt(i: number): KaitenPiece {
  return KAITEN_PIECES[((i % KAITEN_PIECES.length) + KAITEN_PIECES.length) % KAITEN_PIECES.length]
}
