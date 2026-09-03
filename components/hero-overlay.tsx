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
  )
}
