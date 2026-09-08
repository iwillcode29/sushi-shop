'use client'

import { useEffect, useRef } from 'react'
import { KaitenOrizume } from '@/components/kaiten-orizume'
import { KaitenReceipt } from '@/components/kaiten-receipt'
import type { CartLine } from '@/lib/cart'
import { orizumeTimeline, packOrizume } from '@/lib/orizume'
import { useMediaQuery } from '@/lib/use-media-query'

/*
  The scene after the bill is settled: the order packed into a box, and the
  receipt for it.

  The belt is still behind all of this rather than hidden by it — stopped and
  veiled, but there, with whatever is left on it still on it. The box is
  standing on that belt, in that belt's projection, and covering it over with
  a scrim would throw away the only thing that makes the box more than a card.
*/

export interface KaitenPackingProps {
  lines: CartLine[]
  total: number
  onDone: () => void
}

export function KaitenPacking({ lines, total, onDone }: KaitenPackingProps) {
  const compartments = packOrizume(lines)
  const timing = orizumeTimeline(compartments)
  const scene = useRef<HTMLDivElement>(null)

  /*
    A phone held upright crops the belt's frame to about a quarter of its
    width, and the box is wider than what is left of it — there is no
    arranging that away. So the box gets its own frame there, and because a
    box in its own frame no longer lines up with the belt, the belt goes back
    to being paper rather than sitting half-behind it looking misplaced.

    Read through useSyncExternalStore, so the first client render already
    knows which of the two it is and there is no layout to correct.
  */
  const upright = useMediaQuery('(orientation: portrait)')

  /*
    The belt's controls have just gone; without this, focus is left on a
    button that no longer exists and a screen reader is left in the middle of
    a page that has changed underneath it. The scene takes focus itself
    rather than handing it to the one button here — that button is still
    fading in on a delay, and focus belongs on what arrived, not on the way
    out of it.
  */
  useEffect(() => {
    scene.current?.focus()
  }, [])

  return (
    <div
      ref={scene}
      tabIndex={-1}
      aria-label="Your order, packed"
      className="absolute inset-0 z-20 outline-none"
    >
      <div
        className={`kaiten-veil absolute inset-0 ${upright ? 'bg-paper/92' : 'bg-paper/50'}`}
      />

      <KaitenOrizume
        compartments={compartments}
        timing={timing}
        fitted={upright}
        className={
          upright ? 'absolute inset-x-0 top-[7%] h-[40%] w-full' : 'absolute inset-0 h-full w-full'
        }
      />

      <KaitenReceipt lines={lines} total={total} at={timing} />

      <button
        type="button"
        onClick={onDone}
        style={{ animationDelay: `${timing.hanko + 0.55}s` }}
        className="kaiten-again text-sumi-soft hover:text-sumi decoration-shu/50 font-mincho absolute bottom-8 left-1/2 -translate-x-1/2 text-[0.95rem] underline-offset-[7px] transition-colors hover:underline portrait:bottom-16"
      >
        またどうぞ
      </button>
    </div>
  )
}
