'use client'

export type FallbackReason = 'no-webgl' | 'load-failed'

const COPY: Record<FallbackReason, { heading: string; body: string }> = {
  'no-webgl': {
    heading: 'Handcrafted in WebGL',
    body: 'This browser cannot open a 3D graphics context, so the sushi cannot be rendered here. Everything below still works.',
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
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_50%_35%,#faf4ea_0%,#e7dccb_55%,#d8c9b3_100%)] px-6 text-center">
      <span aria-hidden="true" className="text-5xl">
        🍣
      </span>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      <p className="max-w-sm text-sm opacity-70">{body}</p>

      {reason === 'load-failed' && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-black/20 px-5 py-2 text-xs tracking-widest uppercase transition-colors hover:bg-black/5"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
