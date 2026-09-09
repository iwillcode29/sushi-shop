import type { Metadata } from 'next'
import Link from 'next/link'
import { KaitenOrder } from '@/components/kaiten-order'
import { chromeDelay } from '@/lib/kaiten-opening'

export const metadata: Metadata = {
  title: '回転 — Sushimeow',
  description:
    'An empty kaiten belt, turning. The counter before the first plate goes on it.',
}

export default function KaitenPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {/*
        Nothing rides the belt yet, so the belt is the page: full bleed, and
        cropped rather than letterboxed at every aspect ratio, because a
        conveyor that ends inside the frame is a prop and one that runs out of
        both sides is a machine.

        The artwork is 2:1 and `slice` always scales to cover, so a phone held
        upright gets a close crop of the belt rather than the whole run of it.
        That is the composition it should get: the alternative is to fit the
        2:1 into a 0.46:1 viewport, which leaves a ribbon a few dozen pixels
        thick adrift in paper. Widening this element does not help — cover
        takes the larger of the two ratios, and the viewport's height is
        already the binding one.
      */}
      <KaitenOrder />

      <h1 className="sr-only">The belt</h1>
      {/* The furniture comes in last, and quietly. The counter is the event;
          a way out of it is not — see 開店 in app/globals.css. */}
      <Link
        href="/"
        style={{ animationDelay: `${chromeDelay(0)}s` }}
        className="kaiten-rise text-sumi-soft hover:text-sumi decoration-salmon-deep/60 absolute top-6 left-6 z-10 font-sans text-[0.6rem] tracking-[0.3em] uppercase underline-offset-[5px] transition-colors hover:underline"
      >
        ← Back
      </Link>
    </main>
  )
}
