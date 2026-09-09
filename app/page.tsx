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
          <Link
            href="/kaiten"
            className="text-salmon decoration-salmon/40 group font-sans text-[0.6rem] tracking-[0.3em] uppercase underline-offset-[6px] hover:underline"
          >
            Take a seat at the belt{' '}
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
