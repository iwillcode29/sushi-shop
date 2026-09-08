import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { MenuExperience } from '@/components/menu-experience'

const VIDEO_SRC = '/video/sushi-counter.mp4'
const SHOP_NAME = '鮨 かねもり'
const SHOP_LINE = 'Edomae sushi · Ginza · twelve seats, one seating a night'

export const metadata: Metadata = {
  title: '鮨 かねもり — Menu',
  description:
    'Walk up to the counter at 鮨 かねもり, see tonight\u2019s set, and read twelve neta priced in yen. Scroll to move through it.',
}

/** Overrides the site-wide cream in app/layout.tsx for this dark route. */
export const viewport: Viewport = {
  themeColor: '#0d0b0a',
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
        className="fixed top-6 left-6 z-30 text-[0.65rem] tracking-[0.25em] text-white/60 uppercase underline-offset-4 transition-opacity hover:text-white hover:underline"
      >
        ← Back
      </Link>

      <MenuExperience videoSrc={VIDEO_SRC} title={SHOP_NAME} subtitle={SHOP_LINE} />
    </main>
  )
}
