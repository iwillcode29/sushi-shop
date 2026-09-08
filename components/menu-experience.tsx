'use client'

import { MenuCard } from '@/components/menu-card'
import { SushiIntro } from '@/components/ui/sushi-intro'
import { SushiShowcase } from '@/components/ui/sushi-showcase'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

/**
 * The whole of the /menu route as one continuous scroll: the approach to the
 * shop, a fade to black, the set on the counter, then the prices.
 *
 * Both animated stages are pinned sections driven by the page's own scroll,
 * so neither of them captures wheel events. That is the constraint the route
 * is built around — whichever component calls preventDefault wins, and the
 * scroll every other stage depends on stops arriving. One transport, no
 * handoff, and the visitor can scroll back up into the intro at any point.
 */
export interface MenuExperienceProps {
  videoSrc: string
  posterSrc?: string
  title?: string
  subtitle?: string
}

export function MenuExperience({ videoSrc, posterSrc, title, subtitle }: MenuExperienceProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <>
      {/*
        A scroll-scrubbed video is motion from end to end — there is no
        reduced version of the intro to offer, so it is dropped rather than
        degraded, and the 7 MB file is never requested. The showcase below
        stays: it parks on a fixed camera of its own when motion is reduced.
      */}
      {!prefersReducedMotion && (
        <SushiIntro
          videoSrc={videoSrc}
          posterSrc={posterSrc}
          title={title}
          subtitle={subtitle}
        />
      )}
      <SushiShowcase title={title} subtitle={subtitle} />
      <MenuCard />
    </>
  )
}
