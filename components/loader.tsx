'use client'

import { useProgress } from '@react-three/drei'

/**
 * Lives in the DOM rather than inside the canvas: drei's useProgress reads a
 * store fed by three's DefaultLoadingManager, which works outside <Canvas>,
 * and DOM text stays crisp at any device pixel ratio.
 */
export function Loader() {
  const { active, progress } = useProgress()
  if (!active) return null

  const value = Math.round(progress)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-6 pb-6 sm:px-10 sm:pb-10">
      <div
        role="progressbar"
        aria-label="Loading the sushi model"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-px w-full overflow-hidden bg-black/10"
      >
        <div
          data-testid="loader-fill"
          className="h-full bg-black/60 transition-[width] duration-200 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
