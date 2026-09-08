'use client'

import { useMediaQuery } from '@/lib/use-media-query'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(QUERY)
}
