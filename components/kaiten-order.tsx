'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { KAITEN_GEOMETRY, KaitenBelt } from '@/components/kaiten-belt'
import { KaitenPacking } from '@/components/kaiten-packing'
import { addToCart, type Cart, cartCount, cartLines, cartTotal } from '@/lib/cart'
import { haltBelt, startBelt } from '@/lib/kaiten-drive'
import { chromeDelay, OPENING } from '@/lib/kaiten-opening'
import { pieceAt } from '@/lib/kaiten-pieces'
import { restockDelay } from '@/lib/kaiten-restock'
import { formatYen } from '@/lib/sushi-menu'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

/** A piece in the air between the belt and the basket. */
interface Flight {
  key: number
  src: string
  from: DOMRect
}

/**
 * Where the moving row is in its loop, in seconds, and how long that loop is.
 *
 * Read off the running animation rather than kept in a constant: the duration
 * is declared in app/globals.css and there is no way to import it, so the one
 * copy that cannot drift is the one the browser is already using. Absent when
 * the row is not animating at all — no Web Animations API, or a visitor who
 * asked for reduced motion, in which case the stylesheet turns it off.
 */
function readRideClock(row: SVGGElement | null): { elapsed: number; loop: number } | null {
  const animation = row?.getAnimations?.()[0]
  const duration = animation?.effect?.getTiming().duration
  if (!animation || typeof duration !== 'number' || duration <= 0) return null

  const loop = duration / 1000
  return { elapsed: ((Number(animation.currentTime) || 0) / 1000) % loop, loop }
}

export function KaitenOrder() {
  const [cart, setCart] = useState<Cart>([])
  const [taken, setTaken] = useState<ReadonlySet<number>>(new Set())
  const [flights, setFlights] = useState<Flight[]>([])
  const [billOpen, setBillOpen] = useState(false)
  /**
   * `stopping` is the belt coasting down; the box only arrives once it has.
   * Two states rather than one because a box that lands on a belt still in
   * motion looks like it landed on the wrong thing.
   */
  const [stage, setStage] = useState<'belt' | 'stopping' | 'packed'>('belt')

  const scene = useRef<HTMLDivElement>(null)
  const row = useRef<SVGGElement>(null)
  const basket = useRef<HTMLButtonElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const nextFlight = useRef(0)
  const reduced = usePrefersReducedMotion()
  /** Abandons whichever spin-up is in flight; see lib/kaiten-drive. */
  const drive = useRef<(() => void) | null>(null)

  const spin = useCallback((delay: number) => {
    drive.current?.()
    drive.current = startBelt(scene.current, delay)
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  /*
    The switch, thrown once the counter has been laid out.

    The belt is stopped from the moment this runs rather than from the moment
    the ramp begins — that is the whole of the effect, and it is why the wait
    belongs to startBelt and not to a timer here. What the visitor sees for
    the first second is a machine standing still with its service on it, which
    is what a shop looks like at 10:59.
  */
  useEffect(() => {
    spin(OPENING.drive)
    return () => {
      drive.current?.()
      drive.current = null
    }
  }, [spin])

  // The bill is not modal — the belt keeps moving behind it and pieces can
  // still be taken while it is up — but Escape is what closes a thing that is
  // over the page, modal or not.
  useEffect(() => {
    if (!billOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBillOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [billOpen])

  const take = useCallback(
    (slot: number, rect: DOMRect) => {
      const piece = pieceAt(slot)

      setCart((previous) => addToCart(previous, piece.id))
      setTaken((previous) => new Set(previous).add(slot))

      /*
        Put the piece back once the hole it left is off the frame, so that no
        one ever watches a piece of sushi appear out of nothing. The arithmetic
        is in lib/kaiten-restock; all this has to do is read the clock.

        A belt that is not moving has no such moment, so nothing is restocked:
        an empty place on a stopped belt is just an empty place.
      */
      const clock = readRideClock(row.current)
      if (clock) {
        const wait = restockDelay(slot, clock.elapsed, {
          ridePitch: KAITEN_GEOMETRY.ridePitch,
          rideLoop: KAITEN_GEOMETRY.rideLoop,
          rideSeconds: clock.loop,
          exitX: KAITEN_GEOMETRY.exitX,
        })
        timers.current.push(
          setTimeout(() => {
            setTaken((previous) => {
              const next = new Set(previous)
              next.delete(slot)
              return next
            })
          }, wait * 1000),
        )
      }

      if (reduced) return
      setFlights((previous) => [
        ...previous,
        { key: nextFlight.current++, src: `/sushi/${piece.id}.webp`, from: rect },
      ])
    },
    [reduced],
  )

  const landed = useCallback((key: number) => {
    setFlights((previous) => previous.filter((flight) => flight.key !== key))
  }, [])

  const lines = cartLines(cart)
  const count = cartCount(cart)
  const total = cartTotal(cart)

  const settle = useCallback(async () => {
    setBillOpen(false)
    setStage('stopping')
    // Nothing may be riding the dial up while the coast-down rides it back.
    drive.current?.()
    await haltBelt(scene.current)
    setStage('packed')
  }, [])

  /*
    Back to the belt, and the belt starts the way it started the first time:
    a counter that came to rest in front of you does not get to jump back to
    speed between frames. No delay this time — the machine is already there
    and the service is already on it, so there is nothing left to wait for.
  */
  const again = useCallback(() => {
    setStage('belt')
    setCart([])
    setTaken(new Set())
    spin(0)
  }, [spin])

  return (
    <>
      <div ref={scene} className="absolute inset-0">
        <KaitenBelt
          className="h-full w-full"
          taken={taken}
          onTake={stage === 'belt' ? take : undefined}
          rideRef={row}
        />
      </div>

      {stage === 'packed' && <KaitenPacking lines={lines} total={total} onDone={again} />}

      <button
        ref={basket}
        type="button"
        onClick={() => setBillOpen((open) => !open)}
        aria-expanded={billOpen}
        hidden={stage !== 'belt'}
        style={{ animationDelay: `${chromeDelay(1)}s` }}
        className="kaiten-rise border-sumi/15 bg-paper-lit/85 text-sumi hover:border-sumi/30 absolute top-5 right-5 z-20 flex items-center gap-2.5 rounded-full border py-2 pr-4 pl-3.5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] backdrop-blur-sm transition-colors"
      >
        <BasketMark />
        <span className="font-sans text-[0.6rem] tracking-[0.3em] uppercase">Order</span>
        <span
          key={count}
          className="bg-shu text-paper-lit kaiten-tally grid h-5 min-w-5 place-items-center rounded-full px-1 font-sans text-[0.65rem] tabular-nums"
        >
          {count}
        </span>
      </button>

      {billOpen && (
        <Bill lines={lines} total={total} onClose={() => setBillOpen(false)} onSettle={settle} />
      )}

      {flights.map((flight) => (
        <Flight key={flight.key} flight={flight} to={basket} onLanded={landed} />
      ))}
    </>
  )
}

/** The stack of plates the counter bills you by. */
function BasketMark() {
  return (
    <svg viewBox="0 0 24 18" aria-hidden="true" className="h-3.5 w-[1.15rem]">
      {[12, 7, 2].map((y, depth) => (
        <ellipse
          key={y}
          cx="12"
          cy={y + 3}
          rx={9 - depth}
          ry={3 - depth * 0.4}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  )
}

function Bill({
  lines,
  total,
  onClose,
  onSettle,
}: {
  lines: ReturnType<typeof cartLines>
  total: number
  onClose: () => void
  onSettle: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label="お品書き"
      className="border-sumi/15 bg-paper-lit/95 washi absolute top-16 right-5 z-20 w-[min(20rem,calc(100vw-2.5rem))] rounded-lg border p-5 shadow-[0_12px_36px_-18px_rgba(44,49,35,0.55)] backdrop-blur-sm"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mincho text-sumi text-[0.95rem]">お品書き</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sumi-soft hover:text-sumi font-sans text-[0.55rem] tracking-[0.25em] uppercase transition-colors"
        >
          Close
        </button>
      </div>

      <hr className="rule my-3.5" />

      {lines.length === 0 ? (
        <p className="text-sumi-soft font-sans text-[0.7rem] leading-relaxed">
          Nothing taken yet. Pick a piece off the belt.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={line.piece.id} className="flex items-baseline gap-3">
              <span className="text-sumi font-sans text-[0.78rem]">{line.piece.name}</span>
              <span className="font-mincho text-sumi-soft text-[0.68rem]">
                {line.piece.nameJa}
              </span>
              <span className="text-sumi-soft font-sans text-[0.65rem] tabular-nums">
                ×{line.quantity}
              </span>
              <span className="border-sumi/12 mx-1 grow border-b border-dotted" />
              <span className="text-sumi font-sans text-[0.72rem] tabular-nums">
                {formatYen(line.piece.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <hr className="rule my-3.5" />

      <div className="flex items-baseline justify-between">
        <span className="font-mincho text-sumi-soft text-[0.8rem]">計</span>
        <span data-testid="bill-total" className="text-shu font-sans text-[0.85rem] tabular-nums">
          {formatYen(total)}
        </span>
      </div>

      {/*
        The one primary action on the route, and it only exists once there is
        something to settle. An empty bill offers nothing to press rather than
        a button that says no.
      */}
      {lines.length > 0 && (
        <button
          type="button"
          onClick={onSettle}
          className="bg-sumi text-paper-lit hover:bg-shu mt-5 flex w-full items-center justify-center gap-3 rounded-md py-2.5 font-sans text-[0.6rem] tracking-[0.3em] uppercase transition-colors"
        >
          <span className="font-mincho text-[0.85rem] tracking-normal normal-case">お会計</span>
          Settle
        </button>
      )}
    </div>
  )
}

/**
 * One piece on its way to the basket.
 *
 * It starts as a copy pinned exactly over the piece that was clicked — the
 * belt has already dropped the original by the time this renders — and is
 * driven by the Web Animations API rather than by a class, because the
 * distance it has to cover is only known at the moment of the click.
 */
function Flight({
  flight,
  to,
  onLanded,
}: {
  flight: Flight
  to: React.RefObject<HTMLButtonElement | null>
  onLanded: (key: number) => void
}) {
  const piece = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const node = piece.current
    const target = to.current?.getBoundingClientRect()
    const done = () => onLanded(flight.key)

    if (!node || !target || typeof node.animate !== 'function') {
      done()
      return
    }

    /*
      A cancelled flight has not landed.

      `finished` rejects when the animation is cancelled, and cleanup cancels
      — which under StrictMode's double-invoked effects happens immediately
      after the first run. Treating that rejection as an arrival deleted every
      piece the instant it left the belt, so nothing was ever seen in the air.
    */
    let cancelled = false

    const dx = target.left + target.width / 2 - (flight.from.left + flight.from.width / 2)
    const dy = target.top + target.height / 2 - (flight.from.top + flight.from.height / 2)

    const animation = node.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        // The bow. A piece taken off a belt is lifted before it is carried,
        // and a straight line between two points reads as a file transfer.
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 74}px) scale(0.66)`,
          opacity: 1,
          offset: 0.55,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(0.18)`, opacity: 0 },
      ],
      { duration: 620, easing: 'cubic-bezier(0.32, 0, 0.36, 1)', fill: 'forwards' },
    )

    animation.finished.then(
      () => {
        if (!cancelled) done()
      },
      () => {},
    )

    return () => {
      cancelled = true
      animation.cancel()
    }
  }, [flight, to, onLanded])

  return (
    /*
      next/image is wrong for this one. The file is already decoded and in
      cache — the belt has been drawing it — and this copy exists for about
      six hundred milliseconds at a size that is whatever the belt happened to
      be drawing it at. next/image would wrap it in a sized container and go
      back to the network for a variant, to optimise an element that is never
      the LCP and is gone before it could be.
    */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={piece}
      src={flight.src}
      alt=""
      aria-hidden="true"
      className="pointer-events-none fixed z-30"
      /*
        The filter is the belt's own, by fragment, and it is set here rather
        than in a class because a url() in a stylesheet resolves against the
        document in some browsers and against the stylesheet in others. The
        belt is on screen for as long as this element exists, so the def is
        there to be found; if it ever were not, the piece flies without its
        rim rather than not at all.

        On an HTML element the dilation is two CSS pixels rather than two belt
        units, which at the scale the frame is drawn is a fifth of a pixel out
        — and this copy is in the air for six hundred milliseconds.
      */
      style={{
        left: flight.from.left,
        top: flight.from.top,
        width: flight.from.width,
        height: flight.from.height,
        filter: 'url(#kaiten-rim)',
      }}
    />
  )
}
