'use client'

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * The subscription API `MediaQueryList` exposed before the modern
 * `EventTarget`-based one landed. Safari below version 14 implements only
 * this shape — no `addEventListener`/`removeEventListener` — so calling
 * those unconditionally throws synchronously inside the effect.
 */
interface LegacyMediaQueryList {
  addListener(listener: (event: MediaQueryListEvent) => void): void
  removeListener(listener: (event: MediaQueryListEvent) => void): void
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const query = window.matchMedia(QUERY)
    setPrefersReduced(query.matches)

    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    }

    const legacyQuery = query as unknown as LegacyMediaQueryList
    if (typeof legacyQuery.addListener === 'function') {
      legacyQuery.addListener(onChange)
      return () => legacyQuery.removeListener(onChange)
    }

    return undefined
  }, [])

  return prefersReduced
}
