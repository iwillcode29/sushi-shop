'use client'

import type { LightingMode } from '@/lib/materials'

type HeroOverlayProps = {
  mode: LightingMode
  onToggleMode: () => void
}

export function HeroOverlay({ mode, onToggleMode }: HeroOverlayProps) {
  return (
    <div
      data-testid="hero-overlay"
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 sm:p-10"
    >
      <header className="flex items-start justify-between text-xs tracking-[0.25em] uppercase">
        <span className="font-semibold">Sushi</span>
        <a
          href="#about"
          className="pointer-events-auto opacity-60 underline-offset-4 transition-opacity hover:opacity-100 hover:underline"
        >
          About
        </a>
      </header>

      <div className="flex flex-col gap-5">
        <h1 className="max-w-2xl text-4xl leading-[1.03] font-semibold tracking-tight text-balance sm:text-6xl">
          Handcrafted in WebGL
        </h1>
        <p className="max-w-sm text-sm leading-relaxed opacity-65">
          A low-poly sushi set loaded as glTF. Its materials are unlit by design — flip the
          switch to see the same geometry rebuilt to catch light.
        </p>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.65rem] tracking-[0.2em] uppercase opacity-50">
            Drag to rotate
          </span>
          <button
            type="button"
            onClick={onToggleMode}
            aria-pressed={mode === 'lit'}
            aria-label="Toggle lighting mode"
            className="pointer-events-auto rounded-full border border-black/20 px-4 py-2 text-[0.65rem] tracking-[0.2em] uppercase transition-colors hover:bg-black/5"
          >
            {mode === 'lit' ? 'Lit' : 'Unlit'}
          </button>
        </div>
      </div>
    </div>
  )
}
