/**
 * `Intl.NumberFormat` with `currency: 'JPY'` is deliberately not used: it
 * renders as "￥" (the fullwidth form) under some ICU builds and as "JPY"
 * under others, so the glyph would vary by runtime. Grouping is all that
 * actually needs localising here.
 */
export function formatYen(price: number): string {
  return `¥${price.toLocaleString('en-US')}`
}
