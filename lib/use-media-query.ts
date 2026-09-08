'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * The subscription API `MediaQueryList` exposed before the modern
 * `EventTarget`-based one landed. Safari below version 14 implements only
 * this shape — no `addEventListener`/`removeEventListener` — so calling
 * those unconditionally throws synchronously inside the effect.
 */
interface LegacyMediaQueryList {
  addListener(listener: () => void): void
  removeListener(listener: () => void): void
}

const noop = () => {}

/**
 * Tracks a CSS media query.
 *
 * A `MediaQueryList` is an external store, so it is read through
 * `useSyncExternalStore` rather than mirrored into state from an effect: the
 * first client render already sees the real value instead of rendering a
 * placeholder and then immediately re-rendering. Server rendering has no
 * media to query and always reports false.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return noop

      const list = window.matchMedia(query)

      if (typeof list.addEventListener === 'function') {
        list.addEventListener('change', onStoreChange)
        return () => list.removeEventListener('change', onStoreChange)
      }

      const legacyList = list as unknown as LegacyMediaQueryList
      if (typeof legacyList.addListener === 'function') {
        legacyList.addListener(onStoreChange)
        return () => legacyList.removeListener(onStoreChange)
      }

      return noop
    },
    [query],
  )

  const getSnapshot = useCallback(
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
