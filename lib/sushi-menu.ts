/**
 * One item on the counter. `colorA`/`colorB` are the two stops of the
 * gradient that stands in for the neta itself — they are sampled from the
 * cut of fish, not from a UI palette, so the swatch column reads as a row
 * of sushi rather than a row of category chips.
 */
export interface MenuItem {
  id: string
  /** Romaji, shown as the primary label. */
  name: string
  /** Japanese, shown alongside the price on the secondary line. */
  nameJa: string
  /** Whole yen. Japanese menus do not use a minor unit. */
  price: number
  colorA: string
  colorB: string
}

export const SUSHI_MENU: MenuItem[] = [
  { id: 'otoro', name: 'Otoro', nameJa: '大トロ', price: 680, colorA: '#ff9d94', colorB: '#8c3a33' },
  { id: 'chutoro', name: 'Chutoro', nameJa: '中トロ', price: 520, colorA: '#ff7d6b', colorB: '#7d2b22' },
  { id: 'akami', name: 'Akami', nameJa: '赤身', price: 380, colorA: '#d6392f', colorB: '#5e120f' },
  { id: 'sake', name: 'Sake', nameJa: 'サーモン', price: 320, colorA: '#ff9350', colorB: '#8a3d12' },
  { id: 'hamachi', name: 'Hamachi', nameJa: 'ハマチ', price: 360, colorA: '#f5e3a8', colorB: '#8a7530' },
  { id: 'ebi', name: 'Ebi', nameJa: 'エビ', price: 280, colorA: '#ffb3a0', colorB: '#8a3b2e' },
  { id: 'uni', name: 'Uni', nameJa: 'ウニ', price: 880, colorA: '#ffb340', colorB: '#8a5410' },
  { id: 'ikura', name: 'Ikura', nameJa: 'イクラ', price: 480, colorA: '#ff6a2b', colorB: '#8a2c08' },
  { id: 'hotate', name: 'Hotate', nameJa: 'ホタテ', price: 420, colorA: '#f7e6d2', colorB: '#8a7256' },
  { id: 'unagi', name: 'Unagi', nameJa: 'ウナギ', price: 560, colorA: '#a9683a', colorB: '#40200f' },
  { id: 'tamago', name: 'Tamago', nameJa: '玉子', price: 220, colorA: '#ffd75e', colorB: '#8a6a12' },
  { id: 'anago', name: 'Anago', nameJa: '穴子', price: 460, colorA: '#c08652', colorB: '#4d2f18' },
]

/**
 * `Intl.NumberFormat` with `currency: 'JPY'` is deliberately not used: it
 * renders as "￥" (the fullwidth form) under some ICU builds and as "JPY"
 * under others, so the glyph would vary by runtime. Grouping is all that
 * actually needs localising here.
 */
export function formatYen(price: number): string {
  return `¥${price.toLocaleString('en-US')}`
}
