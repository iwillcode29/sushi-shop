import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MenuExperience } from '@/components/menu-experience'

const VIDEO_SRC = '/video/sushi-counter.mp4'
const POSTER_SRC = '/video/sushi-counter-poster.jpg'
const SHOP_NAME = '鮨 ねこもり'
const SHOP_LINE = 'Edomae · Ginza · twelve seats, one seating a night'

export const metadata: Metadata = {
  title: '鮨 ねこもり — Sushimeow',
  description:
    'Walk up to the counter at Sushimeow, see tonight\u2019s set, and read twelve neta priced in yen. Scroll to move through it.',
}

/** Overrides the site-wide washi in app/layout.tsx for this dark route. */
export const viewport: Viewport = {
  themeColor: '#171a10',
}

export default function Home() {
  return (
    <main data-route="menu">
      <MenuExperience
        videoSrc={VIDEO_SRC}
        posterSrc={POSTER_SRC}
        title={SHOP_NAME}
        subtitle={SHOP_LINE}
      />

      {/*
        The page closes on the brand — the wordmark in paper ink, the
        tagline, and the way on. Without it the price list simply stops,
        which on a page this long reads as having been cut off.
      */}
      <footer className="bg-counter text-paper-lit washi-lit px-6 pb-20 sm:px-10">
        <div className="border-paper-lit/10 mx-auto flex max-w-3xl flex-col items-center gap-7 border-t pt-16">
          <Image
            src="/brand/sushimeow-wordmark-paper.webp"
            alt="Sushimeow"
            width={763}
            height={290}
            sizes="(max-width: 640px) 56vw, 15rem"
            className="h-auto w-[min(15rem,56vw)]"
          />
          <p className="font-display text-paper-lit/85 text-[0.95rem] font-bold tracking-[0.05em]">
            Authentic <span className="text-salmon px-0.5">•</span> Japanese{' '}
            <span className="text-salmon px-0.5">•</span> Fresh
          </p>
          {/*
            Set as the route's one primary action, in the same idiom as the
            till's Settle button — a mincho glyph against tracked caps. Filled
            rather than outlined because it is the only way on from here, and
            filled in salmon rather than the till's sumi: sumi (#2c3123) and
            the counter this footer sits on (#171a10) are a hair apart in
            value, so a sumi button here would read as a hole rather than as
            something to press.
          */}
          <Link
            href="/kaiten"
            className="bg-salmon text-sumi hover:bg-salmon-deep focus-visible:outline-paper-lit group mt-1 flex items-center gap-3 rounded-md px-6 py-3 font-sans text-[0.6rem] tracking-[0.3em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span aria-hidden="true" className="font-mincho text-[0.85rem] tracking-normal normal-case">
              回転
            </span>
            Take a seat at the belt
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </footer>
    </main>
  )
}
