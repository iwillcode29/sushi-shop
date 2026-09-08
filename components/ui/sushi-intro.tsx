'use client'

import { useEffect, useRef } from 'react'
import { introFrame } from '@/lib/intro-timeline'
import { sectionProgress } from '@/lib/scroll-progress'

/**
 * The approach to the shop. The video never plays — the scroll position is
 * the transport, written straight to `currentTime`, so the camera walks up to
 * the entrance exactly as fast as the visitor scrolls and stops when they
 * stop. Across the last stretch the picture goes to black, which is what the
 * menu is then revealed onto.
 *
 * Everything the loop touches is written to the DOM imperatively. Routing a
 * scroll position through React state would re-render this subtree on every
 * frame for values no other component reads.
 */
export interface SushiIntroProps {
  videoSrc: string
  title?: string
  subtitle?: string
  /**
   * How much scroll the intro gets, as a multiple of the viewport. The
   * surplus over 100 is the travel spent on the video; 250 gives the whole
   * approach one and a half screens of scroll, which is unhurried without
   * feeling stuck.
   */
  heightVh?: number
}

const SUMI = '#0d0b0a'
const PAPER = '#f4efe7'
const FONT = 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'

export function SushiIntro({
  videoSrc,
  title = '鮨 かねもり',
  subtitle,
  heightVh = 250,
}: SushiIntroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId = 0
    // Seeking is the expensive part, so a frame whose target is unchanged
    // from the last one skips the write entirely.
    let lastSeek = -1

    const tick = () => {
      const section = sectionRef.current
      const video = videoRef.current
      if (section && video) {
        const rect = section.getBoundingClientRect()
        const progress = sectionProgress(rect, window.innerHeight)
        const frame = introFrame(progress, video.duration)

        // Only one seek in flight at a time. Assigning currentTime while the
        // element is still seeking throws the in-flight decode away and
        // restarts it, so on a file whose seeks cost more than a frame — a
        // 1080p source costs about four — a per-frame assignment means no
        // seek ever completes and the picture stops updating entirely.
        if (
          !video.seeking &&
          video.readyState >= 1 &&
          Math.abs(frame.currentTime - lastSeek) > 0.008
        ) {
          lastSeek = frame.currentTime
          video.currentTime = frame.currentTime
        }
        if (dimRef.current) dimRef.current.style.opacity = String(frame.dim)
        if (cueRef.current) cueRef.current.style.opacity = String(frame.cue)
        // The title rides the same fade as the picture: it belongs to the
        // shopfront, and the menu section names the shop again on its own.
        if (titleRef.current) titleRef.current.style.opacity = String(1 - frame.dim)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <section
      ref={sectionRef}
      data-testid="sushi-intro"
      style={{ position: 'relative', height: `${heightVh}vh`, background: SUMI }}
    >
      <div
        data-testid="sushi-intro-stage"
        style={{
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflow: 'hidden',
          background: SUMI,
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* A vignette, which also hides how far past its native 784px the
            source is being upscaled. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 78% 72% at 50% 46%, transparent 42%, rgba(13,11,10,0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* The shopfront is lit from the top by a row of lanterns and from
            the bottom by the entrance, which is exactly where the title and
            the scroll cue sit. Both bands are dark enough to carry text
            without reading as panels over the footage. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(13,11,10,0.72) 0%, rgba(13,11,10,0) 30%, rgba(13,11,10,0) 76%, rgba(13,11,10,0.7) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          ref={titleRef}
          style={{
            position: 'absolute',
            top: 'clamp(28px, 8vh, 72px)',
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
            pointerEvents: 'none',
          }}
        >
          {/*
            A title card, not the route's heading: it fades out with the
            picture and is dropped entirely under reduced motion. The h1
            lives on the showcase below, which is on every path.
          */}
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 'clamp(26px, 5vw, 52px)',
              letterSpacing: '0.1em',
              color: PAPER,
              textAlign: 'center',
              textShadow: '0 6px 40px rgba(0,0,0,0.8)',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(10px, 1.1vw, 12px)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(244, 239, 231, 0.72)',
                textAlign: 'center',
                textShadow: '0 2px 18px rgba(0,0,0,0.9)',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>

        <div
          ref={cueRef}
          style={{
            position: 'absolute',
            bottom: 'clamp(28px, 6vh, 56px)',
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            fontFamily: FONT,
            fontSize: 10.5,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(244, 239, 231, 0.72)',
            textShadow: '0 2px 16px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          Scroll to step inside
          <svg
            width="16"
            height="24"
            viewBox="0 0 16 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="14" height="22" rx="7" />
            <path d="M8 6v4" strokeLinecap="round" />
          </svg>
        </div>

        {/* The fade the menu is revealed onto. */}
        <div
          ref={dimRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: SUMI,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      </div>
    </section>
  )
}
