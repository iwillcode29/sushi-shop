'use client'

import Link from 'next/link'
import type { LightingMode } from '@/lib/materials'

type HeroOverlayProps = {
  mode: LightingMode
  onToggleMode: () => void
}

export function HeroOverlay({ mode, onToggleMode }: HeroOverlayProps) {
  const lit = mode === 'lit'

  return (
    <div
      data-testid="hero-overlay"
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 sm:p-10"
    >
      {/*
        app/page.tsx's brand block sits in a separate absolute inset-0
        layer, painted above this one, with its own top padding
        (pt-16 sm:pt-24) sized to clear this header row's rendered height —
        that relationship is not encoded anywhere the compiler or test
        suite would catch a violation of. Changing this row's padding or
        text size without checking app/page.tsx's comment on its brand
        container can silently reopen the collision two of this fix
        cycle's commits existed to close.
      */}
      <header className="text-sumi/80 flex items-start justify-between font-sans text-[0.62rem] tracking-[0.34em] uppercase">
        {/*
          A wayfinding label, not the logo — the brush wordmark in
          app/page.tsx is that, and it is right below this. Set in the
          grotesque so it can hold this much letterspacing. Dropped on a
          narrow screen, where the wordmark is 40px beneath it and two
          settings of the same word that close is one too many; the nav
          keeps its own right edge via ml-auto rather than sliding left
          into the gap that leaves.
        */}
        <span className="hidden font-semibold sm:inline">Sushimeow</span>
        {/*
          Both links keep the same text size as the row already used, so the
          header's rendered height is unchanged and app/page.tsx's brand
          padding still clears it.
        */}
        <nav className="ml-auto flex items-center gap-5">
          <Link
            href="/menu"
            className="decoration-shu/60 pointer-events-auto underline-offset-[5px] transition-colors hover:underline"
          >
            Menu
          </Link>
          <a
            href="#about"
            className="decoration-shu/60 pointer-events-auto underline-offset-[5px] transition-colors hover:underline"
          >
            About
          </a>
        </nav>
      </header>

      <div className="flex items-end justify-between gap-4">
        <span className="text-sumi-soft font-sans text-[0.6rem] tracking-[0.28em] uppercase">
          Drag to rotate
        </span>
        {/*
          The label alone carried the state before, which meant reading a
          word to find out which of two modes you were in. Filling the
          button with ink when the lights are on says it without reading.
        */}
        <button
          type="button"
          onClick={onToggleMode}
          aria-pressed={lit}
          aria-label="Toggle lighting mode"
          className={`border-sumi/35 focus-visible:outline-shu pointer-events-auto rounded-full border px-4 py-2 font-sans text-[0.6rem] tracking-[0.28em] uppercase transition-[background-color,color,border-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-3 ${
            lit
              ? 'border-sumi bg-sumi text-paper-lit'
              : 'text-sumi/75 hover:border-sumi/60 hover:bg-paper-lit/70'
          }`}
        >
          {lit ? 'Lit' : 'Unlit'}
        </button>
      </div>
    </div>
  )
}
