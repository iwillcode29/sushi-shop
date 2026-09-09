'use client'

import { KaitenRim, RIM as PIECE_RIM } from '@/components/kaiten-rim'
import {
  alongBelt,
  BELT_W,
  beltTransform,
  FRAME_H,
  FRAME_W,
  onBelt,
} from '@/lib/kaiten-projection'
import type { Compartment, OrizumeTimeline } from '@/lib/orizume'

/*
  折詰 — the box the order goes home in.

  Drawn in the belt's own projection (lib/kaiten-projection), which is the
  point of it: a box in its own coordinate system is a card that appeared over
  the page, and a box in this one is an object on the same counter as the
  belt. It arrives along the belt's travel vector, for the same reason.

  The pieces are the exception, as they are on the belt: a cat put through
  the shear is a cat lying on its side, so they are placed in page space at
  the projection of the point in the box they are sitting on.
*/

/** The box, in belt space: centred where the frame is, inside the rails. */
const BOX_CX = 488
const BOX_L = 620
const BOX_W = 200
const BOX_X0 = BOX_CX - BOX_L / 2
const BOX_X1 = BOX_CX + BOX_L / 2
const BOX_Y0 = BELT_W / 2 - BOX_W / 2
const BOX_Y1 = BELT_W / 2 + BOX_W / 2

/** How deep the box is, in page pixels straight down. */
const BOX_H = 46

/** The wooden lip around the tray. */
const RIM = 15

/**
 * The end of the box the shop's band goes round. Compartments start after it,
 * so the band never has to be laid over the food to be seen.
 */
const BAND_X = BOX_X0 + 20
const BAND_W = 64
const TRAY_X0 = BOX_X0 + 100

/**
 * How tall a piece stands in its compartment.
 *
 * Sized to the compartment rather than fixed: a two-kind order gets two big
 * divisions and a piece that fills one, a five-kind order gets five small ones
 * and pieces to match. At a fixed 62 the two-kind box was a pair of stamps
 * adrift in a black tray.
 *
 * The last limit is on how wide the piece comes out rather than how tall,
 * which is why it needs the piece's own proportions: what must not happen is a
 * piece lying over the shikiri beside it, and width is the dimension that does
 * that. At the seven-to-five the cats are drawn at it works out the same as
 * the flat 0.4 of the division this used to cap height at; a set drawn longer
 * and lower would have overhung it.
 */
function pieceHeight(cellW: number, cellH: number, ratio: number): number {
  return Math.min(96, cellH * 0.62, (cellW * 0.56) / ratio)
}

/** Where the box comes in from, along the belt. */
const ARRIVES_FROM = -620

/**
 * The box's own bounds on the page, with room over the top for the pieces
 * standing in it. A caller that cannot fit the whole 1400x700 frame — a phone
 * held upright — frames this instead.
 */
const CORNERS = [
  onBelt(BOX_X0, BOX_Y0),
  onBelt(BOX_X1, BOX_Y0),
  onBelt(BOX_X0, BOX_Y1),
  onBelt(BOX_X1, BOX_Y1),
]
const LEFT = Math.min(...CORNERS.map(([x]) => x))
const RIGHT = Math.max(...CORNERS.map(([x]) => x))
const TOP = Math.min(...CORNERS.map(([, y]) => y))
const BOTTOM = Math.max(...CORNERS.map(([, y]) => y)) + BOX_H

export const ORIZUME_VIEWBOX = [
  LEFT - 40,
  TOP - 110,
  RIGHT - LEFT + 80,
  BOTTOM - TOP + 150,
].join(' ')

/** A face of the box, from two points on the surface straight down. */
function wall(a: [number, number], b: [number, number]): string {
  const [ax, ay] = onBelt(...a)
  const [bx, by] = onBelt(...b)
  return [
    `${ax},${ay}`,
    `${bx},${by}`,
    `${bx},${by + BOX_H}`,
    `${ax},${ay + BOX_H}`,
  ].join(' ')
}

export interface KaitenOrizumeProps {
  compartments: Compartment[]
  timing: OrizumeTimeline
  /**
   * Frame the box on its own rather than in the belt's frame.
   *
   * The belt's frame is cropped to cover, and on a viewport tall enough the
   * crop is narrower than the box — so the box is drawn to a viewBox around
   * itself instead, and fitted rather than cropped. It stops lining up with
   * the belt when it does, which is why the caller that asks for this also
   * takes the belt down to paper behind it.
   */
  fitted?: boolean
  className?: string
}

export function KaitenOrizume({ compartments, timing, fitted, className }: KaitenOrizumeProps) {
  // The compartments divide the inside of the tray, not the outside of the
  // box: the wooden lip is not part of what gets divided up.
  const trayX0 = TRAY_X0 + RIM
  const trayX1 = BOX_X1 - RIM
  const trayY0 = BOX_Y0 + RIM
  const trayH = BOX_W - RIM * 2
  const trayW = trayX1 - trayX0

  const cell = (fraction: number, span: number) => ({
    x0: trayX0 + fraction * trayW,
    x1: trayX0 + (fraction + span) * trayW,
  })

  return (
    <svg
      viewBox={fitted ? ORIZUME_VIEWBOX : `0 0 ${FRAME_W} ${FRAME_H}`}
      preserveAspectRatio={fitted ? 'xMidYMid meet' : 'xMidYMid slice'}
      className={className}
      role="img"
      aria-label={`A packed bento box holding ${compartments.reduce(
        (n, cell) => n + cell.line.quantity,
        0,
      )} pieces`}
    >
      <defs>
        {/*
          The same paper edge the belt gives its riders, at half the dilation:
          a cat in a compartment stands somewhere between a quarter and half
          the height it does on the belt, and a rim that did not come down
          with it read as a border drawn round a stamp. Half is a compromise
          across the range — the box packs its pieces to fit the order, and a
          filter cannot take its radius from the thing it is filtering.
        */}
        <KaitenRim id="orizume-rim" radius={PIECE_RIM / 2} />

        <filter id="orizume-cast" x="-25%" y="-60%" width="150%" height="240%">
          <feGaussianBlur stdDeviation="13" />
        </filter>

        {/* Lacquer, lit from the same far shoulder as everything else. Flat
            sumi read as a hole cut in the box rather than the bottom of it. */}
        <linearGradient
          id="orizume-tray"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={BOX_Y0}
          x2="0"
          y2={BOX_Y1}
        >
          <stop
            offset="0%"
            stopColor="color-mix(in oklab, var(--color-sumi-soft) 34%, var(--color-sumi))"
          />
          <stop offset="100%" stopColor="var(--color-sumi)" />
        </linearGradient>
      </defs>

      <g
        className="orizume-arrive"
        style={{ '--orizume-from': `${alongBelt(ARRIVES_FROM).join('px, ')}px` } as React.CSSProperties}
      >
        {/* The box on the counter, before the box itself. */}
        <polygon
          points={[
            onBelt(BOX_X0, BOX_Y1),
            onBelt(BOX_X1, BOX_Y1),
            onBelt(BOX_X1 + 26, BOX_Y1 + 34),
            onBelt(BOX_X0 + 26, BOX_Y1 + 34),
          ]
            .map(([x, y]) => `${x},${y + BOX_H}`)
            .join(' ')}
          fill="var(--color-sumi)"
          opacity="0.22"
          filter="url(#orizume-cast)"
        />

        {/* Kiri, not lacquer: the outside of an orizume is pale wood, and it
            is what separates the box from the belt it is standing on. */}
        <polygon points={wall([BOX_X0, BOX_Y0], [BOX_X0, BOX_Y1])} fill="var(--color-paper-deep)" />
        <polygon
          points={wall([BOX_X0, BOX_Y1], [BOX_X1, BOX_Y1])}
          fill="color-mix(in oklab, var(--color-sumi) 32%, var(--color-paper-deep))"
        />

        <g transform={beltTransform()}>
          <rect
            x={BOX_X0}
            y={BOX_Y0}
            width={BOX_L}
            height={BOX_W}
            fill="var(--color-paper-deep)"
          />

          {/* The tray. Black inside a pale box, the way it is, and the reason
              a piece of tuna reads at this size at all. */}
          <rect
            x={trayX0}
            y={trayY0}
            width={trayW}
            height={trayH}
            fill="url(#orizume-tray)"
          />

          {/*
            仕切り. One per compartment after the first: the edge that closes
            it off from the one laid before it. That is a vertical strip when
            the two are side by side and a strip right across the box when the
            second one starts a new row, which is what makes a four-kind order
            read as a divided box rather than as four stripes.
          */}
          {compartments.slice(1).map((compartment, i) => {
            const at = cell(compartment.x, compartment.w)
            const startsRow = compartment.x === 0
            const delay = { animationDelay: `${timing.dividers[i]}s` }

            return startsRow ? (
              <rect
                key={compartment.line.piece.id}
                className="orizume-divide-across"
                x={trayX0}
                y={trayY0 + compartment.y * trayH - 4}
                width={trayW}
                height="8"
                fill="var(--color-paper-deep)"
                style={delay}
              />
            ) : (
              <rect
                key={compartment.line.piece.id}
                className="orizume-divide"
                x={at.x0 - 4}
                y={trayY0 + compartment.y * trayH}
                width="8"
                height={compartment.h * trayH}
                fill="var(--color-paper-deep)"
                style={delay}
              />
            )
          })}

          {/* 帯 — the shop's band, round the end of the box that was left for
              it. The character is set inside the sheared group on purpose: it
              is printed on a band lying in that plane, and it should read as
              lying in it too. */}
          <g className="orizume-band" style={{ animationDelay: `${timing.band}s` }}>
            <rect x={BAND_X} y={BOX_Y0} width={BAND_W} height={BOX_W} fill="var(--color-shu)" />
            <text
              x={BAND_X + BAND_W / 2}
              y={BELT_W / 2}
              fill="var(--color-paper-lit)"
              fontSize="46"
              fontFamily="var(--font-mincho)"
              textAnchor="middle"
              dominantBaseline="central"
            >
              鮨
            </text>
          </g>
        </g>

        {/* The band carries on over the near wall, so it is a band round a box
            rather than a stripe painted on its lid. */}
        <polygon
          className="orizume-band"
          style={{ animationDelay: `${timing.band}s` }}
          points={wall([BAND_X, BOX_Y1], [BAND_X + BAND_W, BOX_Y1])}
          fill="color-mix(in oklab, var(--color-sumi) 26%, var(--color-shu))"
        />

        {/* Flattened before it is drawn, because the order a piece is laid
            in is the order across the whole box, not within its compartment
            — and a counter carried through a nested map is a counter that
            means something different on a re-render. */}
        {compartments
          .flatMap((compartment) =>
            compartment.slots.map((slot, index) => ({ compartment, slot, index })),
          )
          .map(({ compartment, slot, index }, order) => {
            const at = cell(compartment.x, compartment.w)
            const piece = compartment.line.piece
            const cellH = compartment.h * trayH
            const h = pieceHeight(at.x1 - at.x0, cellH, piece.w / piece.h)
            const w = (h * piece.w) / piece.h
            // The slot is a fraction of its own compartment, so the row it is
            // in has to be added back before it means anything in the tray.
            const [px, py] = onBelt(
              at.x0 + (at.x1 - at.x0) * slot.x,
              trayY0 + compartment.y * trayH + cellH * slot.y,
            )

            return (
              <image
                key={`${piece.id}-${index}`}
                filter="url(#orizume-rim)"
                className="orizume-lay"
                href={`/sushi/${piece.id}.webp`}
                width={w}
                height={h}
                x={px - w / 2}
                /*
                  Not `py - h`. Standing a piece with its base exactly on the
                  middle of its compartment puts the piece itself entirely
                  above that middle, and in a sheared cell that reads as
                  shoved into the back-left corner. Dropping it by a third of
                  its own height puts the piece where the eye looks for the
                  centre and still leaves it standing in the box.
                */
                y={py - h * 0.72}
                style={{ animationDelay: `${timing.pieces[order]}s` }}
              />
            )
          })}
      </g>
    </svg>
  )
}
