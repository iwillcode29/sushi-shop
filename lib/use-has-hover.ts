'use client'

import { useMediaQuery } from '@/lib/use-media-query'

/**
 * Both halves matter. `hover: hover` alone still matches a stylus or a TV
 * remote, where a pointer can rest over a target but landing on a piece of
 * sushi a few hundred pixels wide is not realistic.
 */
const QUERY = '(hover: hover) and (pointer: fine)'

export function useHasHover(): boolean {
  return useMediaQuery(QUERY)
}
