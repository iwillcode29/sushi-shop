/*
  The rim the cats carry.

  A black cat on a sumi belt loses its contour to the surface it is walking on,
  and in the box it loses it to the lacquer. This puts the print's own paper
  back round the silhouette: the alpha dilated, flooded, and laid behind the
  piece — one filter pass, wherever a piece is drawn.

  What it looks like is a stylesheet's business: see `.kaiten-rim` in
  app/globals.css, which colours the flood and can switch the whole thing off
  by taking its opacity to zero. What it cannot reach is the radius, because
  feMorphology takes an attribute rather than a property, so that lives here.
*/

/**
 * How far the rim stands off a piece, in the units of whatever is drawing it.
 *
 * Two, against a cat 112 units tall on the belt. At three the border starts
 * closing over the gap between a cat's legs and it walks around inside a
 * lozenge; the whiskers, a unit wide to begin with, double.
 */
export const RIM = 2

export interface KaitenRimProps {
  /** The id to reference this filter by. */
  id: string
  /**
   * Dilation, in user units. Defaults to `RIM`, which is set against a cat on
   * the belt; a caller drawing pieces smaller than that has to scale it down,
   * because a filter cannot take its radius from the thing it is filtering.
   */
  radius?: number
}

/** A `<filter>` for a `<defs>`. Reference it as `filter="url(#id)"`. */
export function KaitenRim({ id, radius = RIM }: KaitenRimProps) {
  return (
    <filter id={id} x="-5%" y="-7%" width="110%" height="114%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="grown" />
      <feFlood className="kaiten-rim" />
      <feComposite in2="grown" operator="in" result="rim" />
      <feMerge>
        <feMergeNode in="rim" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}
