'use client'

import { KAITEN_PIECES, pieceAt } from '@/lib/kaiten-pieces'
import {
  BELT_W,
  beltTransform,
  FRAME_W,
  NEAR_Y,
  onBelt,
  RISE,
} from '@/lib/kaiten-projection'

/*
  The belt, drawn rather than modelled.

  There is a WebGL canvas two routes away, and this is deliberately not it: a
  conveyor seen from a fixed corner is a shear, not a camera, so the whole
  thing is one static SVG with two CSS animations on it. No client component,
  no hydration, no second three.js scene competing for the same GPU as /menu.

  The projection is an oblique axonometric built from two screen vectors:

    travel  T = (1, -0.22)     up and to the right, the direction of the belt
    width   W = (0.60, 0.72)   down and to the right, across the belt

  Everything on the top surface is authored as an axis-aligned rectangle in
  belt space — x runs along the belt, y across it — and mapped onto the page
  by matrix(1, -0.22, 0.60, 0.72, 0, 480), whose two columns are exactly T
  and W. That is what lets the slats be plain rects and the travel animation
  be a plain translateX: the shear is the parent's problem.

  The side of the belt is the same trick on the other plane. It is spanned by
  T and by page-vertical, which is precisely skewY(-12.4deg) — atan(0.22) —
  so the roller ends can be drawn as true circles and get their foreshortening
  from the group above them.
*/

const BELT = beltTransform()

/** Belt space runs well past the frame at both ends so the belt has no ends. */
const X_MIN = -840
const X_MAX = 2400

/**
 * One slat to the next. The travel animation moves the strip by exactly this,
 * so the loop point lands where a slat already was and the seam is invisible.
 */
const PITCH = 140

/*
  The near edge of the top surface is the line y = -RISE*x + NEAR_Y. The side
  hangs off it, so its group is translated onto that line and then sheared by
  atan(RISE) — 12.4 degrees — to match the belt's rake.
*/
const SIDE = `translate(0, ${NEAR_Y}) skewY(${-(Math.atan(RISE) * 180) / Math.PI})`
const SIDE_H = 76
const ROLLER_R = 26
const ROLLER_PITCH = 230

/** One and a half slat pitches between pieces. */
const RIDE_PITCH = PITCH * 1.5

/**
 * How tall a piece stands on a belt 240 units across — which is 225 page px
 * from rail to rail, so a nigiri comes out half the width of the belt. It
 * was 112, at which a single piece of tuna spanned the belt end to end and
 * the thing under it stopped reading as a conveyor.
 */
const RIDE_H = 78

/*
  The seam.

  The pieces cannot ride inside the sheared group — a nigiri put through the
  belt matrix is a nigiri lying on its side — so they are positioned in page
  space instead, at the projection of the belt's centre line:

    belt (x, 120)  ->  page (x + 72, -0.22x + 511.4)   [onBelt]

  and travelled along the same T the slats use, at the same rate, so they sit
  still relative to the surface under them.

  The loop moves them exactly eight slots and starts over. Eight, not one:
  after a jump of one slot every piece would land where its neighbour was, and
  the row would reshuffle in a single frame. After eight, slot j is handed the
  piece from slot j-8, and j-8 and j are the same piece — the sequence is
  eight long. Which is also why the strip has to be seeded eight slots to the
  left of the first one that can be seen.
*/
/** Slots past the left edge of the frame that can still be seen. */
const RIDE_HEAD = Math.ceil(FRAME_W / RIDE_PITCH) + 1
const riders = Array.from(
  { length: RIDE_HEAD + KAITEN_PIECES.length + 2 },
  (_, i) => i - KAITEN_PIECES.length - 1,
)

/** The page width of a piece drawn at RIDE_H. */
function rideWidth(piece: { w: number; h: number }): number {
  return (RIDE_H * piece.w) / piece.h
}

const slats = Array.from({ length: 24 }, (_, i) => X_MIN + i * PITCH)

/**
 * What app/globals.css has to agree with. The two animations are declared
 * there and the geometry they move through is declared here, so the only
 * thing holding them together is arithmetic nobody re-does by hand — hence
 * kaiten-belt.test.tsx, which reads the stylesheet and checks it.
 */
export const KAITEN_GEOMETRY = {
  /** One slat to the next; the distance the belt loop travels. */
  slatPitch: PITCH,
  /** One piece to the next. */
  ridePitch: RIDE_PITCH,
  /** Eight slots; the distance the pieces loop travels. */
  rideLoop: RIDE_PITCH * KAITEN_PIECES.length,
  /** How far that leg climbs, in page pixels. */
  rideRise: -RISE * RIDE_PITCH * KAITEN_PIECES.length,
  /**
   * The page x past which a gap in the row is out of the frame. The widest
   * piece is allowed for, so a slot at this x has nothing of itself left
   * inside it.
   */
  exitX: FRAME_W + Math.max(...KAITEN_PIECES.map(rideWidth)),
  /** Roller circumference — a full turn of the belt over a roller. */
  rollerTurn: 2 * Math.PI * ROLLER_R,
}
const rollers = Array.from({ length: 10 }, (_, i) => -230 + i * ROLLER_PITCH)

export interface KaitenBeltProps {
  className?: string
  /** Slots whose piece has been taken, and so are not drawn. */
  taken?: ReadonlySet<number>
  /**
   * Called when a piece is picked off the belt. `rect` is where it was on
   * screen at that moment — the caller needs it to fly the piece somewhere,
   * and only the browser knows it, since the row is moved by CSS.
   */
  onTake?: (slot: number, rect: DOMRect) => void
  /** The moving row, so a caller can read the animation driving it. */
  rideRef?: React.Ref<SVGGElement>
}

export function KaitenBelt({ className, taken, onTake, rideRef }: KaitenBeltProps) {
  return (
    <svg
      viewBox="0 0 1400 700"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      /*
        `img` only while there is nothing here to press.

        A role of `img` makes everything inside the element presentational, so
        with pieces that are buttons it collapses eighteen controls into one
        picture — the browser's accessibility tree returned a single node for
        the whole belt. jsdom does not apply that rule, so the tests went on
        finding buttons that a screen reader could not; it took the real tree
        to see it.
      */
      role={onTake ? 'group' : 'img'}
      aria-label="A kaiten conveyor belt carrying sushi — tuna, rolls, salmon, ikura, prawn, egg — from the bottom left of the frame to the top right"
    >
      <defs>
        {/*
          The print is lit from its middle (see globals.css). The belt is laid
          across that light rather than onto flat stock, which is what keeps a
          single long diagonal from reading as a sticker.
        */}
        <radialGradient id="kaiten-pool">
          <stop offset="0%" stopColor="var(--color-paper-lit)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-paper-lit)" stopOpacity="0" />
        </radialGradient>

        {/*
          Across the belt, and in one direction only. The light is over the far
          shoulder, so the surface falls off steadily from the far rail to the
          near one — a plane raking away from a light. It was briefly light in
          the middle and dark at both edges, which is the shading of a cylinder
          and made the belt read as a pipe. Held in belt space (userSpaceOnUse
          inside the sheared group) so the falloff rakes with the surface
          instead of running flat down the page.
        */}
        <linearGradient
          id="kaiten-surface"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2={BELT_W}
        >
          <stop offset="0%" stopColor="var(--color-sumi-soft)" />
          <stop
            offset="100%"
            stopColor="color-mix(in oklab, var(--color-sumi) 78%, var(--color-sumi-soft))"
          />
        </linearGradient>

        <filter id="kaiten-contact" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>

        {/* Held in belt space, so the blur is sheared along with the disc it
            softens and the pieces sit in the surface rather than over it. */}
        <filter id="kaiten-cast" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        <clipPath id="kaiten-face">
          <rect x={X_MIN} y="0" width={X_MAX - X_MIN} height={BELT_W} />
        </clipPath>
      </defs>

      {/* Larger than the frame on purpose: at 780x430 the gradient reached zero
          inside the viewBox and the terminator showed as a faint ring banded
          across the paper. */}
      <ellipse cx="700" cy="370" rx="1120" ry="640" fill="url(#kaiten-pool)" />

      {/* Contact shadow: a band off the foot of the near side, nothing more.
          The light is over the far shoulder, so the far edge casts nothing. */}
      <polygon
        points={[
          [-700, -RISE * -700 + NEAR_Y + SIDE_H],
          [2300, -RISE * 2300 + NEAR_Y + SIDE_H],
          [2336, -RISE * 2300 + NEAR_Y + SIDE_H + 43],
          [-664, -RISE * -700 + NEAR_Y + SIDE_H + 43],
        ]
          .map(([x, y]) => `${x},${y}`)
          .join(' ')}
        fill="var(--color-sumi)"
        opacity="0.14"
        filter="url(#kaiten-contact)"
      />

      <g transform={BELT}>
        <rect x={X_MIN} y="0" width={X_MAX - X_MIN} height={BELT_W} fill="url(#kaiten-surface)" />

        {/* The moving part of the whole picture. Clipped to the surface so a
            slat that has travelled past the end is cut off by the belt rather
            than by the frame. */}
        <g clipPath="url(#kaiten-face)">
          <g className="kaiten-travel">
            {slats.map((x) => (
              <g key={x}>
                <rect x={x} y="0" width="16" height={BELT_W} fill="var(--color-sumi)" />
                {/* The lit lip of the next plank — a hairline, and no more.
                    At 5px and 0.26 it out-contrasted the gap it sits beside,
                    and the belt read as light stripes painted on dark rather
                    than as boards with daylight between them. */}
                <rect
                  x={x + 16}
                  y="0"
                  width="3"
                  height={BELT_W}
                  fill="var(--color-paper-deep)"
                  opacity="0.14"
                />
              </g>
            ))}
          </g>
        </g>

        {/*
          Rails, over the slats: the belt's own long edges are continuous, so
          they cannot be part of the strip that moves.

          Both are solid. The far rail was a paper-deep rect at 0.34 alpha,
          which over a surface that is itself a gradient came out as a haze
          with the slats faintly legible through it — the belt looked as
          though something had been smudged along its top edge. Mixed rather
          than faded, it is a piece of metal.
        */}
        <rect
          x={X_MIN}
          y="0"
          width={X_MAX - X_MIN}
          height="16"
          fill="color-mix(in oklab, var(--color-paper-deep) 38%, var(--color-sumi-soft))"
        />
        <rect x={X_MIN} y="16" width={X_MAX - X_MIN} height="3" fill="var(--color-sumi)" />
        <rect
          x={X_MIN}
          y={BELT_W - 16}
          width={X_MAX - X_MIN}
          height="16"
          fill="var(--color-sumi)"
        />

        {/*
          What each piece puts back on the belt. Drawn in belt space, which is
          the whole reason they are separated from the pieces themselves: an
          axis-aligned ellipse here is a correctly raked ellipse once the
          group above is applied.

          Sized to its piece and pushed toward the viewer, because the light
          is over the far shoulder. A single 46-unit disc centred under
          everything was invisible — a nigiri is wider than that, and covered
          its own shadow completely.
        */}
        <g className="kaiten-ride-cast" filter="url(#kaiten-cast)">
          {riders.map((i) =>
            taken?.has(i) ? null : (
              <ellipse
                key={i}
                cx={i * RIDE_PITCH}
                cy={BELT_W / 2 + 14}
                rx={rideWidth(pieceAt(i)) / 2.3}
                ry="24"
                fill="var(--color-sumi)"
                opacity="0.62"
              />
            ),
          )}
        </g>
      </g>

      <g transform={SIDE}>
        <rect x={X_MIN} y="0" width={X_MAX - X_MIN} height={SIDE_H} fill="var(--color-sumi)" />
        <rect
          x={X_MIN}
          y="0"
          width={X_MAX - X_MIN}
          height="4"
          fill="var(--color-paper-deep)"
          opacity="0.22"
        />

        {rollers.map((s) => (
          <g key={s} transform={`translate(${s}, ${SIDE_H / 2})`}>
            {/*
              Mixed down into the side rather than set in paper-deep flat: at
              full paper the ends read as pale screw heads bolted onto the
              front of the belt instead of as the ends of rollers inside it.
            */}
            <circle
              r={ROLLER_R}
              fill="color-mix(in oklab, var(--color-paper-deep) 24%, var(--color-sumi))"
              stroke="color-mix(in oklab, var(--color-paper-deep) 46%, var(--color-sumi-soft))"
              strokeWidth="4"
            />
            {/*
              Every shape in here is centred on the roller's axis, which is
              what makes `transform-box: fill-box; transform-origin: center`
              land on the axis — an off-centre bearing mark would wobble.
            */}
            <g className="kaiten-roll">
              <line
                x1="0"
                y1="-16"
                x2="0"
                y2="16"
                stroke="var(--color-salmon-deep)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <line
                x1="-10"
                y1="0"
                x2="10"
                y2="0"
                stroke="color-mix(in oklab, var(--color-paper-deep) 40%, var(--color-sumi-soft))"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle r="6" fill="var(--color-sumi)" />
            </g>
          </g>
        ))}
      </g>

      <g className="kaiten-ride" ref={rideRef}>
        {riders.map((i) => {
          if (taken?.has(i)) return null

          const piece = pieceAt(i)
          const w = rideWidth(piece)
          /* Bottom centre on the belt's centre line: a piece is placed where
             it touches the surface, not where its box begins. */
          const [px, py] = onBelt(i * RIDE_PITCH, BELT_W / 2)
          const label = `Take the ${piece.name}, ¥${piece.price.toLocaleString('en-US')}`

          return (
            <image
              key={i}
              href={`/sushi/${piece.id}.webp`}
              width={w}
              height={RIDE_H}
              x={px - w / 2}
              y={py - RIDE_H}
              /*
                Every piece on the strip is its own control, including the ones
                currently off the sides of the frame — the row is moved by CSS,
                so which of them is visible is not something this markup knows.
                A keyboard reaches all eighteen; a taken one leaves the DOM, so
                it stops being reachable at the moment it stops being there.
              */
              role={onTake ? 'button' : undefined}
              tabIndex={onTake ? 0 : undefined}
              aria-label={onTake ? label : undefined}
              className={onTake ? 'kaiten-piece' : undefined}
              /*
                A mouse press moves focus onto the piece, and on desktop that
                leaves a focus ring boxed around a nigiri — Chrome's own, or
                the platform's focused-object highlight, neither of which any
                stylesheet here can quiet down. Refusing the default keeps
                focus where it was; Tab is unaffected, and a piece that is
                about to leave the belt has no use for focus anyway.
              */
              onMouseDown={onTake && ((event) => event.preventDefault())}
              onClick={
                onTake && ((event) => onTake(i, event.currentTarget.getBoundingClientRect()))
              }
              onKeyDown={
                onTake &&
                ((event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onTake(i, event.currentTarget.getBoundingClientRect())
                })
              }
            />
          )
        })}
      </g>
    </svg>
  )
}
