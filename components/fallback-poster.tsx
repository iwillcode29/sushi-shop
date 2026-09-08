'use client'

import Image from 'next/image'

export type FallbackReason = 'no-webgl' | 'load-failed'

const COPY: Record<FallbackReason, { heading: string; body: string }> = {
  'no-webgl': {
    heading: 'Handcrafted in WebGL',
    body: 'This browser cannot open a WebGL context, so the sushi cannot be rendered here. Everything below still works.',
  },
  'load-failed': {
    heading: 'Handcrafted in WebGL',
    body: 'The 3D model did not finish loading.',
  },
}

type FallbackPosterProps = {
  reason: FallbackReason
  onRetry?: () => void
}

export function FallbackPoster({ reason, onRetry }: FallbackPosterProps) {
  const { heading, body } = COPY[reason]

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(circle_at_50%_38%,#f4e7d2_0%,#e4d2b8_58%,#cdb492_100%)] px-6 text-center">
      {/*
        The print, standing in for the geometry it was drawn from. It is the
        same asset the brand uses elsewhere, so a visitor who never gets a
        canvas still gets the shop rather than a broken-image apology.
      */}
      <Image
        src="/brand/sushimeow-cat.webp"
        alt=""
        aria-hidden="true"
        width={709}
        height={518}
        sizes="(max-width: 640px) 74vw, 26rem"
        className="h-auto w-[min(26rem,74vw)]"
      />
      <h2 className="font-display text-title font-black tracking-[-0.015em]">{heading}</h2>
      {/*
        Set at 85% rather than in muted ink: this panel paints its own paper
        gradient, whose outer stop is darker than the page, and the muted
        token only clears AA against the gradient's lighter middle. This is
        also the one message on the site a visitor has to be able to read on
        a bad day.
      */}
      <p className="text-sumi/85 max-w-sm text-sm leading-relaxed">{body}</p>

      {reason === 'load-failed' && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="border-sumi/35 hover:border-sumi/60 hover:bg-paper-lit/70 focus-visible:outline-shu rounded-full border px-5 py-2 font-sans text-[0.6rem] tracking-[0.28em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-3"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
