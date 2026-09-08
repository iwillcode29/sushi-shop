'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sectionProgress } from '@/lib/scroll-progress'
import { formatYen, SUSHI_MENU, type MenuItem } from '@/lib/sushi-menu'
import { useMediaQuery } from '@/lib/use-media-query'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

// ─────────────────────────────────────────────────────────────
// THE COUNTER
// A looping video sits inside a floating frame that tilts toward the
// cursor. In front of it, the menu is a wheel: twelve neta on a
// wrapping, momentum-driven column that leans away in perspective and
// clicks like an encoder detent as it passes each item. On coarse
// pointers the composition changes entirely — no floating frame, no
// tilt, just the video filling the viewport with the detail bar laid
// over it.
//
// Adapted from a music-player hero. Four things changed in the port
// and are load-bearing, so they are called out where they happen:
//   1. Colours are constants here, not `hsl(var(--background, …))`.
//      This app declares `--background` as a hex literal in
//      app/globals.css, and `hsl(#ffffff)` is invalid — the whole
//      declaration would be dropped and the frame would render
//      transparent with white text on it.
//   2. Wheel and touch listeners bind to this component's own root,
//      not to `window`. They call preventDefault, so on `window` they
//      would lock scrolling across every other section of the page.
//   3. The shuffle, repeat and progress controls are gone. They had
//      no handlers and the progress bar was a fixed 28-second CSS
//      animation on a loop — chrome pretending to be state.
//   4. Motion and autoplay honour `prefers-reduced-motion`.
// ─────────────────────────────────────────────────────────────

export interface SushiMenuHeroProps {
  /** The shop name. Rendered as the page's largest text. */
  title?: string
  subtitle?: string
  /**
   * Optional. With no video the hero opens in its `minimal` theme, so a
   * missing asset costs a backdrop rather than leaving a black frame or
   * a 404 in the network panel.
   */
  videoSrc?: string
  /** Optional still behind the floating frame. Ignored on coarse pointers. */
  backgroundSrc?: string
  /**
   * Whether `videoSrc` carries an audio track worth offering. Off by default
   * and deliberately not sniffed at runtime: `webkitAudioDecodedByteCount` is
   * Chrome-only and reads zero until decoding has begun, and `audioTracks` is
   * unimplemented in most browsers, so any detection would show the controls
   * on some browsers and hide them on others for the same file. The caller
   * knows what it shipped.
   */
  ambience?: boolean
  items?: MenuItem[]
  /**
   * A tall, pinned section whose scroll position drives the wheel. Supplying
   * it switches the hero out of its own momentum physics: it stops binding
   * wheel and touch handlers entirely — and so stops calling preventDefault
   * on the page's scroll — and reads the wheel's position from this section
   * instead. Leave it out for the standalone, scroll-locked behaviour.
   */
  scrollSectionRef?: React.RefObject<HTMLElement | null>
  /**
   * Called instead of moving the wheel when the hero is scroll-driven and
   * the visitor uses the step buttons or the arrow keys. The caller is the
   * one that owns the page scroll, so it is the only thing that can honour
   * the request; moving the wheel here would be overwritten on the next
   * scroll frame.
   */
  onStep?: (direction: 1 | -1) => void
  /** Credit for the interaction design this hero is adapted from. */
  signature?: { name: string; url: string } | false
  /** The detent click that fires as the wheel passes each item. */
  sound?: boolean
  fullBleed?: boolean
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_SIGNATURE = {
  name: 'interaction design by guglielmogiannattasio.exe',
  url: 'https://www.guglielmogiannattasio.it',
}

// 墨 sumi ink, 朱 vermilion, 金 gold — the three colours of a lacquered
// counter. Brand accents stay fixed; nothing here reads a host theme,
// for the reason given in note 1 above.
const SUMI = '#0d0b0a'
const PAPER = '#f4efe7'
const VERMILION = '#e0553c'
const GOLD = '#d4a04a'
const paper = (alpha: number) => `rgba(244, 239, 231, ${alpha})`

const FONT = 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
const ROW_HEIGHT = 60
/**
 * The ambience slider is capped below the detent click's perceived
 * loudness on purpose — the click is the thing you are meant to hear.
 */
const MAX_AMBIENCE_VOLUME = 0.32

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m
}

/**
 * A synthesized encoder detent: a short band-passed noise burst rather
 * than a sample, so the hero ships no audio asset.
 */
function playDetent(ctx: AudioContext, velocity: number) {
  const at = ctx.currentTime
  const strength = clamp(velocity, 0, 1)
  const bufferSize = Math.floor(ctx.sampleRate * 0.012)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.6)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 4200 + strength * 700
  bandpass.Q.value = 3
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.11 + strength * 0.07, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.018)
  noise.connect(bandpass)
  bandpass.connect(gain)
  gain.connect(ctx.destination)
  noise.start(at)
}

export default function SushiMenuHero({
  title = '鮨 かねもり',
  subtitle = 'Edomae sushi · Ginza · twelve seats, one seating a night',
  videoSrc,
  backgroundSrc,
  ambience = false,
  items = SUSHI_MENU,
  scrollSectionRef,
  onStep,
  signature = DEFAULT_SIGNATURE,
  sound = true,
  fullBleed = true,
  className,
  style,
}: SushiMenuHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const videoWrapRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const audioCtxRef = useRef<AudioContext | null>(null)
  const offsetRef = useRef(0)
  const velocityRef = useRef(0)
  const snapTargetRef = useRef<number | null>(null)
  const lastDetentRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastDragYRef = useRef(0)
  const lastDragTRef = useRef(0)
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  // Both halves are needed. A desktop browser dragged narrow keeps a fine
  // pointer, so testing the responsive layout by resizing would otherwise
  // never leave the desktop composition — which is what read as "far too
  // zoomed in" at phone widths.
  const coarsePointer = useMediaQuery('(pointer: coarse)')
  const narrowViewport = useMediaQuery('(max-width: 699px)')
  const isCompact = coarsePointer || narrowViewport

  const hasVideo = Boolean(videoSrc)
  const [theme, setTheme] = useState<'video' | 'minimal'>(hasVideo ? 'video' : 'minimal')
  const [ambienceOn, setAmbienceOn] = useState(false)
  const [ambienceVolume, setAmbienceVolume] = useState(0.16)
  const [activeIndex, setActiveIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [isPlaying, setIsPlaying] = useState(() => !prefersReducedMotion)
  const [isWide, setIsWide] = useState(false)

  // Compared rather than passed to Boolean(): handing a ref object to a
  // function during render trips react-hooks/refs, which cannot see that
  // only the prop's presence is being tested and never `.current`.
  const scrollDriven = scrollSectionRef !== undefined
  const count = items.length
  const activeItem = items[activeIndex] ?? items[0]
  const showVideo = hasVideo && theme === 'video'
  const animate = (value: string) => (prefersReducedMotion ? 'none' : value)

  // Debounced: a fast flick through the wheel should announce where it
  // came to rest, not narrate every item it passed on the way.
  useEffect(() => {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current)
    announceTimerRef.current = setTimeout(() => {
      const item = items[activeIndex]
      if (item) setAnnouncement(`${item.name}, ${item.nameJa}, ${formatYen(item.price)}`)
    }, 400)
    return () => {
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current)
    }
  }, [activeIndex, items])

  const getCtx = useCallback((): AudioContext | null => {
    try {
      if (!audioCtxRef.current) {
        const Ctor =
          window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return null
        audioCtxRef.current = new Ctor()
      }
      return audioCtxRef.current
    } catch {
      return null
    }
  }, [])

  const fireDetent = useCallback(
    (velocity: number) => {
      if (!sound) return
      const ctx = getCtx()
      if (!ctx) return
      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => playDetent(ctx, velocity))
          .catch(() => {})
      } else {
        playDetent(ctx, velocity)
      }
    },
    [getCtx, sound],
  )

  // Resume the audio context on the first gesture the browser accepts for
  // it. Deliberately does NOT unmute the video: a page that starts making
  // ambient noise because you clicked somewhere is hostile, and the
  // speaker button exists for visitors who want it.
  useEffect(() => {
    if (!sound) return
    const unlock = () => {
      const ctx = getCtx()
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    window.addEventListener('wheel', unlock, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('wheel', unlock)
    }
  }, [getCtx, sound])

  // ── layout loop: positions the wheel from `offsetRef` every frame ──
  useEffect(() => {
    let rafId = 0
    const render = () => {
      if (scrollSectionRef) {
        // The wheel wraps, but the scroll does not: mapping onto count - 1
        // lands the last item exactly as the section unpins, instead of
        // wrapping back round to the first at the very bottom of the page.
        const progress = sectionProgress(
          scrollSectionRef.current?.getBoundingClientRect() ?? null,
          window.innerHeight,
        )
        offsetRef.current = progress * (count - 1) * ROW_HEIGHT
      }
      const centre = offsetRef.current / ROW_HEIGHT

      rowRefs.current.forEach((el, i) => {
        if (!el) return
        const d = mod(i - centre + count / 2, count) - count / 2
        const distance = Math.abs(d)
        el.style.transform = [
          `translateY(${d * ROW_HEIGHT}px)`,
          `translateZ(${-distance * 18}px)`,
          `rotateX(${clamp(d * 9, -22, 22)}deg)`,
          `scale(${clamp(1 - distance * 0.1, 0.72, 1)})`,
        ].join(' ')
        el.style.opacity = String(clamp(1 - distance * 0.4, 0, 1))
        el.style.pointerEvents = distance < 0.5 ? 'auto' : 'none'
        el.style.zIndex = String(1000 - Math.round(distance * 10))
      })

      // Round before wrapping, not after: a value already near `count`
      // (11.999) rounds to exactly `count`, one past the last index.
      const nearest = mod(Math.round(centre), count)
      setActiveIndex((prev) => (prev === nearest ? prev : nearest))
      rafId = requestAnimationFrame(render)
    }
    rafId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId)
  }, [count, scrollSectionRef])

  // ── physics loop: momentum, snap-to-detent, and the click ──
  useEffect(() => {
    let rafId = 0
    // Reduced motion keeps the wheel's behaviour but removes the travel:
    // it lands on the target immediately instead of easing into it.
    const ease = prefersReducedMotion ? 1 : 0.22
    const physics = () => {
      if (scrollDriven) {
        // Position belongs to the layout loop above. Only the detent below
        // still applies.
      } else if (snapTargetRef.current !== null) {
        const target = snapTargetRef.current
        offsetRef.current += (target - offsetRef.current) * ease
        if (Math.abs(target - offsetRef.current) < 0.4) {
          offsetRef.current = target
          snapTargetRef.current = null
        }
      } else if (!isDraggingRef.current) {
        offsetRef.current += velocityRef.current
        velocityRef.current *= 0.93
        if (Math.abs(velocityRef.current) < 0.02) velocityRef.current = 0
      }

      const detent = Math.round(offsetRef.current / ROW_HEIGHT)
      if (detent !== lastDetentRef.current) {
        lastDetentRef.current = detent
        fireDetent(clamp(Math.abs(velocityRef.current) / ROW_HEIGHT, 0.15, 1))
      }
      rafId = requestAnimationFrame(physics)
    }
    rafId = requestAnimationFrame(physics)
    return () => cancelAnimationFrame(rafId)
  }, [fireDetent, prefersReducedMotion, scrollDriven])

  const goStep = useCallback(
    (direction: 1 | -1) => {
      if (scrollDriven) {
        onStep?.(direction)
        return
      }
      const current = Math.round(offsetRef.current / ROW_HEIGHT)
      snapTargetRef.current = (current + direction) * ROW_HEIGHT
      velocityRef.current = 0
      fireDetent(0.5)
    },
    [fireDetent, onStep, scrollDriven],
  )

  // ── input: bound to this component's root, never to `window` ──
  useEffect(() => {
    if (scrollDriven) return
    const root = rootRef.current
    if (!root) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      snapTargetRef.current = null
      if (prefersReducedMotion) {
        goStep(event.deltaY > 0 ? 1 : -1)
        return
      }
      velocityRef.current = clamp(velocityRef.current + event.deltaY * 0.045, -14, 14)
    }
    const onTouchStart = (event: TouchEvent) => {
      isDraggingRef.current = true
      snapTargetRef.current = null
      velocityRef.current = 0
      lastDragYRef.current = event.touches[0]?.clientY ?? 0
      lastDragTRef.current = performance.now()
    }
    const onTouchMove = (event: TouchEvent) => {
      if (!isDraggingRef.current) return
      event.preventDefault()
      const y = event.touches[0]?.clientY ?? lastDragYRef.current
      const dy = lastDragYRef.current - y
      offsetRef.current += dy
      const now = performance.now()
      velocityRef.current = (dy / Math.max(1, now - lastDragTRef.current)) * 16
      lastDragYRef.current = y
      lastDragTRef.current = now
    }
    const onTouchEnd = () => {
      isDraggingRef.current = false
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('touchend', onTouchEnd)
    return () => {
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
    }
  }, [goStep, prefersReducedMotion, scrollDriven])

  // The frame's resting lean. While the pointer is over it the tilt is a
  // symmetric swing around zero rather than an offset from this baseline —
  // adding the baseline inside the live range biases every angle to one side.
  const RESTING_TILT = 'rotateY(-13deg) rotateX(5deg)'

  const onFrameMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isCompact || prefersReducedMotion) return
      const rect = frameRef.current?.getBoundingClientRect()
      if (!rect) return
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5

      if (isWide) {
        const el = videoWrapRef.current
        if (!el) return
        el.style.transition = 'transform 0.05s linear'
        el.style.transform = `scale(1.45) rotateY(${px * 26}deg) rotateX(${-py * 20}deg)`
        return
      }
      const el = frameRef.current
      if (el) {
        el.style.transition = 'transform 0.05s linear'
        el.style.transform = `rotateY(${px * 46}deg) rotateX(${-py * 38}deg) scale(1.03)`
      }
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translate(${-px * 34}px, ${-py * 24}px) scale(1.06)`
      }
    },
    [isCompact, isWide, prefersReducedMotion],
  )

  const onFrameLeave = useCallback(() => {
    if (isCompact || prefersReducedMotion) return
    if (isWide) {
      const el = videoWrapRef.current
      if (el) {
        el.style.transition = 'transform 0.6s cubic-bezier(.2,.8,.2,1)'
        el.style.transform = 'scale(1.45) rotateY(0deg) rotateX(0deg)'
      }
      return
    }
    const el = frameRef.current
    if (el) {
      el.style.transition = 'transform 0.6s cubic-bezier(.2,.8,.2,1)'
      el.style.transform = RESTING_TILT
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'transform 0.6s cubic-bezier(.2,.8,.2,1)'
      backdropRef.current.style.transform = 'translate(0px, 0px) scale(1.06)'
    }
  }, [isCompact, isWide, prefersReducedMotion])

  const setRowRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      rowRefs.current[i] = el
    },
    [],
  )

  const togglePlay = useCallback(() => setIsPlaying((playing) => !playing), [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault()
        goStep(1)
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault()
        goStep(-1)
      } else if (event.key === ' ' || event.key === 'Enter') {
        if (!showVideo) return
        event.preventDefault()
        togglePlay()
      }
    },
    [goStep, showVideo, togglePlay],
  )

  const wheelLabel =
    `Sushi menu. Showing ${activeItem.name}, ${activeItem.nameJa}, ${formatYen(activeItem.price)}. ` +
    'Use the up and down arrow keys to move through the menu.'

  const liveRegion = (
    <span
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
      }}
    >
      {announcement}
    </span>
  )

  const detailBar = (
    <MenuDetail
      item={activeItem}
      onPrev={() => goStep(-1)}
      onNext={() => goStep(1)}
      onPlay={togglePlay}
      isPlaying={isPlaying}
      showVideoControls={showVideo}
      showAmbienceControls={showVideo && ambience}
      ambienceOn={ambienceOn}
      onToggleAmbience={() => setAmbienceOn((on) => !on)}
      ambienceVolume={ambienceVolume}
      onAmbienceVolumeChange={setAmbienceVolume}
      compact={isCompact}
    />
  )

  const wheelList = (
    <MenuWheel
      items={items}
      activeIndex={activeIndex}
      setRowRef={setRowRef}
      compact={isCompact}
      scrim={showVideo}
    />
  )

  // ── COMPACT: the video fills the viewport, the detail bar sits on it ──
  if (isCompact) {
    return (
      <div
        ref={rootRef}
        data-testid="menu-hero-root"
        className={className}
        style={{
          position: 'relative',
          height: fullBleed ? '100dvh' : undefined,
          width: '100%',
          background: SUMI,
          overflow: 'hidden',
          ...style,
        }}
      >
        <SharedKeyframes />
        <div
          role="application"
          aria-label={wheelLabel}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="sushi-hero-focusable"
          style={{ position: 'absolute', inset: 0, background: SUMI, overflow: 'hidden' }}
        >
          {liveRegion}
          {showVideo ? (
            <>
              <AmbientVideo
                src={videoSrc!}
                muted={!ambience || !ambienceOn}
                volume={ambienceVolume}
                playing={isPlaying}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(13,11,10,0.3) 0%, rgba(13,11,10,0) 22%, rgba(13,11,10,0.45) 55%, rgba(13,11,10,0.9) 100%)',
                }}
              />
            </>
          ) : (
            <NoritakeBackdrop animate={animate} />
          )}

          <header
            style={{
              position: 'absolute',
              top: 'clamp(54px, 9vh, 76px)',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '0 16px',
            }}
          >
            <ShopName title={title} subtitle={subtitle} compact />
            {signature && <Signature signature={signature} />}
          </header>

          {wheelList}
          {detailBar}
        </div>
      </div>
    )
  }

  // ── DESKTOP ──────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      data-testid="menu-hero-root"
      className={className}
      style={{
        position: 'relative',
        height: fullBleed ? '100dvh' : undefined,
        width: '100%',
        background: SUMI,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px, 3vw, 48px)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <SharedKeyframes />

      {showVideo && backgroundSrc ? (
        <>
          {/*
            A gradient sits behind the still at all times. If the image path
            is ever wrong the frame stays lit in the shop's own colours, which
            makes a broken path look like a broken path rather than like a
            rendering bug.
          */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 28% 22%, ${VERMILION}33, transparent 55%), radial-gradient(circle at 74% 72%, ${GOLD}26, transparent 55%), ${SUMI}`,
            }}
          />
          <div
            ref={backdropRef}
            style={{
              position: 'absolute',
              inset: '-6%',
              backgroundImage: `url(${backgroundSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: 'scale(1.06)',
              animation: animate('sushi-hero-drift 18s ease-in-out infinite'),
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(13,11,10,0.74) 100%)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <NoritakeBackdrop animate={animate} />
      )}

      <div
        style={{
          position: 'absolute',
          top: 'clamp(12px, 2.5vw, 24px)',
          right: 'clamp(12px, 2.5vw, 24px)',
          zIndex: 21,
          display: 'flex',
          gap: 10,
        }}
      >
        {hasVideo && (
          <RoundButton
            onClick={() => setTheme((current) => (current === 'video' ? 'minimal' : 'video'))}
            label={theme === 'video' ? 'Hide the counter footage' : 'Show the counter footage'}
            accent={VERMILION}
            lit={theme === 'video'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="14" height="14" rx="2" />
              <path d="m22 8-6 4 6 4z" />
            </svg>
          </RoundButton>
        )}
        <RoundButton
          onClick={() => setIsWide((wide) => !wide)}
          label={isWide ? 'Exit wide view' : 'Expand to wide view'}
          accent={GOLD}
          lit={isWide}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isWide ? (
              <path d="M9 3v4a1 1 0 0 1-1 1H4M15 3v4a1 1 0 0 0 1 1h4M9 21v-4a1 1 0 0 0-1-1H4M15 21v-4a1 1 0 0 1 1-1h4" />
            ) : (
              <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
            )}
          </svg>
        </RoundButton>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(16px, 2.6vh, 28px)',
        }}
      >
        {/*
          In wide view the frame becomes position:fixed over the whole
          viewport, so the shop name has to float above it as its own
          overlay rather than sit in normal flow underneath it.
        */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            position: isWide ? 'fixed' : 'static',
            top: isWide ? 'clamp(16px, 4vh, 28px)' : undefined,
            left: isWide ? 0 : undefined,
            right: isWide ? 0 : undefined,
            zIndex: isWide ? 20 : undefined,
          }}
        >
          <ShopName title={title} subtitle={subtitle} />
          {signature && <Signature signature={signature} />}
        </div>

        {/*
          This wrapper's `perspective` is what makes the frame's resting lean
          visible. `perspective` projects an element's *children*, so the one
          declared on the frame itself only serves the video layer inside it —
          with no perspective ancestor the frame's own rotateY/rotateX
          flattened into an imperceptible skew.
        */}
        <div style={{ position: 'relative', perspective: '1700px' }}>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '128%',
              height: '118%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(ellipse, ${VERMILION}2e, transparent 68%)`,
              filter: 'blur(40px)',
              mixBlendMode: 'screen',
              animation: animate('sushi-hero-pulse 5s ease-in-out infinite'),
              pointerEvents: 'none',
            }}
          />
          <div
            ref={frameRef}
            onPointerMove={onFrameMove}
            onPointerLeave={onFrameLeave}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="application"
            aria-label={wheelLabel}
            className="sushi-hero-focusable"
            style={{
              position: isWide ? 'fixed' : 'relative',
              inset: isWide ? 0 : undefined,
              width: isWide ? '100vw' : 'min(58dvh, 460px)',
              height: isWide ? '100dvh' : 'min(58dvh, 460px)',
              borderRadius: isWide ? 0 : 30,
              overflow: 'hidden',
              background: SUMI,
              boxShadow: isWide
                ? 'none'
                : `0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px ${VERMILION}33, inset 0 0 60px rgba(0,0,0,0.25)`,
              transformStyle: 'preserve-3d',
              perspective: '1700px',
              transform: isWide ? 'none' : RESTING_TILT,
              transition:
                'width 0.5s cubic-bezier(.2,.8,.2,1), height 0.5s cubic-bezier(.2,.8,.2,1), transform 0.5s cubic-bezier(.2,.8,.2,1)',
              zIndex: isWide ? 10 : undefined,
            }}
          >
            {liveRegion}
            {showVideo ? (
              <>
                {/*
                  The frame above always clips at its own bounds, so nothing
                  behind it is ever revealed. Only this inner layer, which is
                  oversized, actually tilts in 3D.
                */}
                <div
                  ref={videoWrapRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: SUMI,
                    transformStyle: 'preserve-3d',
                    transform: isWide ? 'scale(1.45)' : 'none',
                    transition: 'transform 0.5s cubic-bezier(.2,.8,.2,1)',
                  }}
                >
                  <AmbientVideo
                    src={videoSrc!}
                    muted={!ambience || !ambienceOn}
                    volume={ambienceVolume}
                    playing={isPlaying}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(13,11,10,0.6) 100%)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(13,11,10,0.12) 0%, rgba(13,11,10,0) 26%, rgba(13,11,10,0.34) 55%, rgba(13,11,10,0.88) 100%)',
                    pointerEvents: 'none',
                  }}
                />
              </>
            ) : (
              <NoritakeBackdrop animate={animate} variant="frame" />
            )}

            {wheelList}
            {detailBar}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Keyframes and the focus ring, shared by both compositions. Inlined rather
 * than added to globals.css so the component stays self-contained: dropping
 * the file into another project carries its own styles with it.
 */
function SharedKeyframes() {
  return (
    <style>{`
      @keyframes sushi-hero-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      @keyframes sushi-hero-drift {
        0%, 100% { transform: translate(0, 0) scale(1.06); }
        50%      { transform: translate(1.5%, -1%) scale(1.1); }
      }
      @keyframes sushi-hero-rise {
        0%, 100% { transform: translate(-50%, 42%) scale(1); opacity: 0.85; }
        50%      { transform: translate(-50%, 39%) scale(1.04); opacity: 1; }
      }
      @keyframes sushi-hero-spin-cw {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to   { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes sushi-hero-spin-ccw {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to   { transform: translate(-50%, -50%) rotate(-360deg); }
      }
      @keyframes sushi-hero-float-a {
        0%, 100% { transform: translate(0, 0); opacity: 0.45; }
        50%      { transform: translate(-14px, 18px); opacity: 0.9; }
      }
      @keyframes sushi-hero-float-b {
        0%, 100% { transform: translate(0, 0); opacity: 0.4; }
        50%      { transform: translate(16px, -12px); opacity: 0.85; }
      }
      .sushi-hero-focusable:focus-visible {
        outline: 3px solid ${GOLD};
        outline-offset: 3px;
      }
      .sushi-hero-fade {
        mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%);
      }
    `}</style>
  )
}

function ShopName({
  title,
  subtitle,
  compact,
}: {
  title: string
  subtitle?: string
  compact?: boolean
}) {
  return (
    <>
      {/*
        The shop name is the largest text in the composition and the only
        thing on the route that answers "what is this page", so it is the
        h1 rather than a styled span. Exactly one of the two compositions
        mounts at a time, so this never yields two.
      */}
      <h1
        style={{
          margin: 0,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: compact ? 'clamp(22px, 7vw, 30px)' : 'clamp(24px, 3.4vw, 38px)',
          letterSpacing: '0.08em',
          color: PAPER,
          textAlign: 'center',
          textShadow: '0 4px 30px rgba(0,0,0,0.7)',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <span
          style={{
            fontFamily: FONT,
            fontSize: compact ? 10.5 : 11.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: paper(0.55),
            textAlign: 'center',
          }}
        >
          {subtitle}
        </span>
      )}
    </>
  )
}

function Signature({ signature }: { signature: { name: string; url: string } }) {
  return (
    <a
      href={signature.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: FONT,
        fontSize: 10,
        color: paper(0.4),
        textDecoration: 'none',
      }}
    >
      {signature.name}
    </a>
  )
}

function RoundButton({
  onClick,
  label,
  accent,
  lit,
  children,
}: {
  onClick: () => void
  label: string
  accent: string
  lit: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={lit}
      style={{
        background: 'rgba(13,11,10,0.55)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${accent}55`,
        boxShadow: lit ? `0 0 14px ${accent}44` : 'none',
        borderRadius: 999,
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: lit ? accent : paper(0.55),
        cursor: 'pointer',
        transition: 'box-shadow 0.25s ease, color 0.25s ease',
      }}
    >
      {children}
    </button>
  )
}

/**
 * Two stacked video elements that crossfade into each other just before the
 * loop point. The native `loop` attribute performs a hard seek back to zero,
 * which stutters no matter how cleanly the file itself loops.
 */
const CROSSFADE_SECONDS = 1

function AmbientVideo({
  src,
  muted,
  volume,
  playing,
}: {
  src: string
  muted: boolean
  volume: number
  playing: boolean
}) {
  const aRef = useRef<HTMLVideoElement>(null)
  const bRef = useRef<HTMLVideoElement>(null)
  const activeRef = useRef<'a' | 'b'>('a')
  const crossfadingRef = useRef(false)
  const [aOpacity, setAOpacity] = useState(1)
  const [bOpacity, setBOpacity] = useState(0)

  useEffect(() => {
    for (const video of [aRef.current, bRef.current]) {
      if (!video) return
      video.muted = muted
      video.volume = volume
    }
  }, [muted, volume])

  useEffect(() => {
    const active = activeRef.current === 'a' ? aRef.current : bRef.current
    if (!active) return
    // jsdom, and any browser without the media stack, returns undefined from
    // play() rather than a promise — hence the optional call on `.catch`.
    if (playing) active.play()?.catch(() => {})
    else active.pause()
  }, [playing])

  useEffect(() => {
    const a = aRef.current
    const b = bRef.current
    if (!a || !b) return
    let rafId = 0
    const tick = () => {
      const active = activeRef.current === 'a' ? a : b
      const inactive = activeRef.current === 'a' ? b : a
      if (active.duration) {
        const remaining = active.duration - active.currentTime
        if (!crossfadingRef.current && remaining <= CROSSFADE_SECONDS) {
          crossfadingRef.current = true
          inactive.currentTime = 0
          inactive.play()?.catch(() => {})
        }
        if (crossfadingRef.current) {
          const t = clamp(1 - remaining / CROSSFADE_SECONDS, 0, 1)
          if (activeRef.current === 'a') {
            setAOpacity(1 - t)
            setBOpacity(t)
          } else {
            setBOpacity(1 - t)
            setAOpacity(t)
          }
          if (remaining <= 0.03) {
            active.pause()
            crossfadingRef.current = false
            activeRef.current = activeRef.current === 'a' ? 'b' : 'a'
          }
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }
  return (
    <>
      <video ref={aRef} src={src} playsInline preload="auto" style={{ ...base, opacity: aOpacity }} />
      <video ref={bRef} src={src} playsInline preload="auto" style={{ ...base, opacity: bOpacity }} />
    </>
  )
}

/**
 * The backdrop used whenever there is no footage: a 日の丸 disc rising behind
 * concentric rings, with a few fragments drifting free of them.
 *
 * The two variants are not a style preference. Both the stage and the frame
 * need a backdrop, and rendering the same one twice put a second sun and a
 * second set of rings inside the frame at a different scale — the frame read
 * as a window onto a duplicate sky rather than as a tray in front of one.
 * `frame` is deliberately almost empty: its job is to be dark enough for the
 * menu to sit on.
 */
function NoritakeBackdrop({
  animate,
  variant = 'stage',
}: {
  animate: (value: string) => string
  variant?: 'stage' | 'frame'
}) {
  if (variant === 'frame') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, #17110f 0%, ${SUMI} 55%, #060505 100%)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '78%',
            aspectRatio: '1 / 1',
            left: '50%',
            top: '46%',
            borderRadius: '50%',
            border: `1px solid ${GOLD}1a`,
            animation: animate('sushi-hero-spin-cw 60s linear infinite'),
          }}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, background: SUMI, overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          width: 'clamp(320px, 66%, 1100px)',
          aspectRatio: '1 / 1',
          left: '50%',
          bottom: 0,
          transform: 'translate(-50%, 42%)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 34%, ${VERMILION}dd, ${VERMILION}00 66%)`,
          filter: 'blur(30px)',
          animation: animate('sushi-hero-rise 12s ease-in-out infinite'),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 'clamp(280px, 64%, 940px)',
          aspectRatio: '1 / 1',
          left: '50%',
          top: '48%',
          borderRadius: '50%',
          border: `1px solid ${paper(0.08)}`,
          borderTopColor: `${GOLD}55`,
          animation: animate('sushi-hero-spin-cw 44s linear infinite'),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 'clamp(165px, 38%, 560px)',
          aspectRatio: '1 / 1',
          left: '50%',
          top: '48%',
          borderRadius: '50%',
          border: `1px solid ${GOLD}22`,
          borderBottomColor: `${VERMILION}66`,
          animation: animate('sushi-hero-spin-ccw 30s linear infinite'),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 44,
          height: 44,
          left: '20%',
          top: '66%',
          borderRadius: '50%',
          border: `1.5px solid ${GOLD}55`,
          animation: animate('sushi-hero-float-a 9s ease-in-out infinite'),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 12,
          height: 12,
          left: '78%',
          top: '24%',
          borderRadius: '50%',
          background: `${VERMILION}88`,
          filter: 'blur(1px)',
          animation: animate('sushi-hero-float-b 7s ease-in-out infinite 0.4s'),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          left: '13%',
          top: '30%',
          borderRadius: '50%',
          background: `${GOLD}88`,
          animation: animate('sushi-hero-float-b 8.5s ease-in-out infinite 1.2s'),
        }}
      />
    </div>
  )
}

function MenuWheel({
  items,
  activeIndex,
  setRowRef,
  compact,
  scrim,
}: {
  items: MenuItem[]
  activeIndex: number
  setRowRef: (i: number) => (el: HTMLDivElement | null) => void
  compact?: boolean
  /** Darken and blur whatever is behind the wheel. Only set over footage. */
  scrim?: boolean
}) {
  return (
    <div
      className="sushi-hero-fade"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: compact ? 122 : 118,
        height: compact ? '46%' : '48%',
        overflow: 'hidden',
        perspective: compact ? '1200px' : '1500px',
        perspectiveOrigin: '50% 30%',
        touchAction: 'none',
        background: scrim
          ? 'linear-gradient(180deg, rgba(13,11,10,0.1) 0%, rgba(13,11,10,0.6) 26%, rgba(13,11,10,0.7) 72%, rgba(13,11,10,0.82) 100%)'
          : 'linear-gradient(180deg, rgba(13,11,10,0) 0%, rgba(13,11,10,0) 55%, rgba(13,11,10,0.38) 100%)',
        backdropFilter: scrim ? 'blur(7px) saturate(0.85)' : undefined,
        WebkitBackdropFilter: scrim ? 'blur(7px) saturate(0.85)' : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '40%',
          height: 0,
          transformStyle: 'preserve-3d',
        }}
      >
        {items.map((item, i) => (
          <MenuRow key={item.id} item={item} isActive={i === activeIndex} setRowRef={setRowRef(i)} />
        ))}
      </div>
    </div>
  )
}

function MenuRow({
  item,
  isActive,
  setRowRef,
}: {
  item: MenuItem
  isActive: boolean
  setRowRef: (el: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={setRowRef}
      style={{
        position: 'absolute',
        left: '6%',
        right: '6%',
        top: -ROW_HEIGHT / 2,
        height: ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 10px',
        borderRadius: 14,
        // Only the centred item gets any backing. Everything else sits
        // directly on the footage with a text-shadow for legibility, so the
        // wheel reads as items on the counter rather than as a panel.
        background: isActive ? paper(0.1) : 'transparent',
        backdropFilter: isActive ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: isActive ? 'blur(14px)' : 'none',
        boxShadow: isActive ? `inset 0 0 0 1px ${item.colorA}55, 0 0 26px ${item.colorA}33` : 'none',
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
        transition: 'background 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      <Neta item={item} size={40} lit={isActive} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: isActive ? 700 : 500,
            fontSize: isActive ? 15 : 13,
            color: isActive ? PAPER : paper(0.68),
            textShadow: isActive ? '0 2px 12px rgba(0,0,0,0.5)' : '0 1px 6px rgba(0,0,0,0.85)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 11.5,
            color: isActive ? paper(0.7) : paper(0.52),
            textShadow: '0 1px 6px rgba(0,0,0,0.85)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.nameJa}
        </div>
      </div>
      <span
        style={{
          fontFamily: FONT,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: isActive ? 700 : 500,
          fontSize: isActive ? 14 : 12,
          color: isActive ? GOLD : paper(0.58),
          textShadow: '0 1px 6px rgba(0,0,0,0.85)',
          flexShrink: 0,
        }}
      >
        {formatYen(item.price)}
      </span>
    </div>
  )
}

/** The gradient chip standing in for the cut of fish itself. */
function Neta({ item, size, lit }: { item: MenuItem; size: number; lit?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: size * 0.24,
        flexShrink: 0,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${item.colorA}, ${item.colorB})`,
        boxShadow: lit
          ? `0 0 20px ${item.colorA}55, 0 2px 6px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.55)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)',
        }}
      />
    </div>
  )
}

function MenuDetail({
  item,
  onPrev,
  onNext,
  onPlay,
  isPlaying,
  showVideoControls,
  showAmbienceControls,
  ambienceOn,
  onToggleAmbience,
  ambienceVolume,
  onAmbienceVolumeChange,
  compact,
}: {
  item: MenuItem
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  isPlaying: boolean
  showVideoControls: boolean
  showAmbienceControls: boolean
  ambienceOn: boolean
  onToggleAmbience: () => void
  ambienceVolume: number
  onAmbienceVolumeChange: (value: number) => void
  compact?: boolean
}) {
  const iconButton: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: paper(0.68),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 6,
  }

  return (
    <div
      data-testid="menu-hero-detail"
      style={{
        position: 'absolute',
        left: compact ? 10 : 14,
        right: compact ? 10 : 14,
        bottom: compact ? 12 : 14,
        zIndex: 4,
        borderRadius: 16,
        background: 'rgba(20, 17, 15, 0.62)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        boxShadow: `inset 0 0 0 1px ${GOLD}33`,
        padding: compact ? '8px 12px 10px' : '10px 16px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Neta item={item} size={compact ? 34 : 44} lit />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: compact ? 13 : 14,
              color: PAPER,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              color: paper(0.58),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.nameJa} · {formatYen(item.price)}
          </div>
        </div>

        <button type="button" onClick={onPrev} aria-label="Previous item" style={iconButton}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zM20 6 10 12l10 6z" />
          </svg>
        </button>

        {showVideoControls && (
          <button
            type="button"
            onClick={onPlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              ...iconButton,
              width: compact ? 38 : 44,
              height: compact ? 38 : 44,
              borderRadius: 999,
              background: VERMILION,
              color: SUMI,
              boxShadow: `0 0 18px ${VERMILION}66`,
            }}
          >
            {isPlaying ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 5v14l12-7z" />
              </svg>
            )}
          </button>
        )}

        <button type="button" onClick={onNext} aria-label="Next item" style={iconButton}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6h2v12h-2zM4 6l10 6-10 6z" />
          </svg>
        </button>
      </div>

      {showAmbienceControls && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <style>{`
            .sushi-hero-volume {
              -webkit-appearance: none;
              appearance: none;
              flex: 1;
              height: 3px;
              border-radius: 2px;
              background: ${paper(0.18)};
              outline: none;
            }
            .sushi-hero-volume::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 11px;
              height: 11px;
              border-radius: 50%;
              background: ${GOLD};
              box-shadow: 0 0 6px ${GOLD}aa;
              cursor: pointer;
            }
            .sushi-hero-volume::-moz-range-thumb {
              width: 11px;
              height: 11px;
              border: none;
              border-radius: 50%;
              background: ${GOLD};
              box-shadow: 0 0 6px ${GOLD}aa;
              cursor: pointer;
            }
          `}</style>
          <button
            type="button"
            onClick={onToggleAmbience}
            aria-label={ambienceOn ? 'Mute the room' : 'Unmute the room'}
            aria-pressed={ambienceOn}
            style={{
              background: 'none',
              border: 'none',
              padding: 2,
              display: 'flex',
              cursor: 'pointer',
              color: ambienceOn ? GOLD : paper(0.5),
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              {ambienceOn ? (
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              ) : (
                <>
                  <line x1="21" y1="9" x2="16" y2="14" />
                  <line x1="16" y1="9" x2="21" y2="14" />
                </>
              )}
            </svg>
          </button>
          <input
            className="sushi-hero-volume"
            type="range"
            min={0}
            max={MAX_AMBIENCE_VOLUME}
            step={0.01}
            value={ambienceVolume}
            onChange={(event) => onAmbienceVolumeChange(Number(event.target.value))}
            aria-label="Room ambience volume"
          />
        </div>
      )}
    </div>
  )
}
