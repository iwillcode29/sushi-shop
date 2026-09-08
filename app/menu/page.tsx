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

export default function MenuPage() {
  return (
    <main data-route="menu">
      {/*
        Fixed, so it stays reachable through both pinned sections. It sits
        above the hero's own controls (z-index 21) deliberately.
      */}
      <Link
        href="/"
        className="text-paper-lit/60 hover:text-paper-lit decoration-salmon/60 fixed top-6 left-6 z-30 font-sans text-[0.6rem] tracking-[0.3em] uppercase underline-offset-[5px] transition-colors hover:underline"
      >
        ← Back
      </Link>

      <MenuExperience
        videoSrc={VIDEO_SRC}
        posterSrc={POSTER_SRC}
        title={SHOP_NAME}
        subtitle={SHOP_LINE}
      />

      {/*
        The route closes on the brand, the way the home page does — the
        wordmark in paper ink, the tagline, and the way out. Without it the
        price list simply stops, which on a route this long reads as the page
        having been cut off.
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
          <Link
            href="/"
            className="text-salmon decoration-salmon/40 group font-sans text-[0.6rem] tracking-[0.3em] uppercase underline-offset-[6px] hover:underline"
          >
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:-translate-x-1"
            >
              ←
            </span>{' '}
            Return to the workshop
          </Link>
        </div>
      </footer>
    </main>
  )
}
