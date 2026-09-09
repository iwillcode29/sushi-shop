/**
 * One cat on the belt, and what it is carrying.
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
 * The sixteen, in the order they come past — the order they sit on the sheet
 * they were cut from, four rows of four, read left to right.
 *
 * Sixteen because that is what the artwork carries, and the belt's loop is
 * built on however many there are: at one and a half slat pitches apart the
 * sequence is 3360 units long against a frame 1400 across, so a visitor sees
 * six or seven of them at a time and waits out a full minute of belt before
 * the first cat comes round again.
 *
 * Where a piece is also on the counter's own list, it is priced from there:
 * the same neta cannot cost one thing on the menu and another on the belt.
 */
export const KAITEN_PIECES: KaitenPiece[] = [
  { id: 'sake', name: 'Sake', nameJa: 'サーモン', price: 320, w: 251, h: 177 },
  { id: 'akami', name: 'Akami', nameJa: '赤身', price: 380, w: 249, h: 178 },
  { id: 'tamago', name: 'Tamago', nameJa: '玉子', price: 220, w: 249, h: 178 },
  { id: 'ikura', name: 'Ikura', nameJa: 'イクラ', price: 480, w: 248, h: 177 },
  { id: 'unagi', name: 'Unagi', nameJa: 'ウナギ', price: 560, w: 252, h: 180 },
  { id: 'hotate', name: 'Hotate', nameJa: 'ホタテ', price: 420, w: 251, h: 181 },
  { id: 'kani', name: 'Kani', nameJa: 'カニ', price: 320, w: 250, h: 180 },
  { id: 'amaebi', name: 'Amaebi', nameJa: '甘エビ', price: 420, w: 261, h: 180 },
  { id: 'saba', name: 'Saba', nameJa: 'サバ', price: 300, w: 252, h: 179 },
  { id: 'tako', name: 'Tako', nameJa: 'タコ', price: 320, w: 251, h: 179 },
  { id: 'hamachi', name: 'Hamachi', nameJa: 'ハマチ', price: 360, w: 252, h: 179 },
  { id: 'negitoro', name: 'Negitoro', nameJa: 'ネギトロ', price: 420, w: 250, h: 179 },
  { id: 'ebi', name: 'Ebi', nameJa: 'エビ', price: 280, w: 252, h: 178 },
  { id: 'gyu', name: 'Gyu', nameJa: '牛', price: 580, w: 252, h: 177 },
  { id: 'kappamaki', name: 'Kappamaki', nameJa: 'かっぱ巻', price: 220, w: 251, h: 177 },
  { id: 'tekkamaki', name: 'Tekkamaki', nameJa: '鉄火巻', price: 320, w: 252, h: 178 },
]

/** The piece in slot `i`, counting either way from the first one. */
export function pieceAt(i: number): KaitenPiece {
  return KAITEN_PIECES[((i % KAITEN_PIECES.length) + KAITEN_PIECES.length) % KAITEN_PIECES.length]
}
