'use client'

import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ModelErrorBoundary } from '@/components/model-error-boundary'
import { SceneEnv } from '@/components/scene-env'
import { SushiModel } from '@/components/sushi-model'
import { sectionProgress } from '@/lib/scroll-progress'
import { showcaseFrame } from '@/lib/showcase-turntable'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { useHasWebGL } from '@/lib/use-has-webgl'

/**
 * The set on the counter, once the visitor is inside.
 *
 * The camera orbits and closes in as the section scrolls. The camera moves,
 * not the model: the floor and the contact shadow belong to the counter and
 * have to stay put, and turning the model would drag its shadow round with
 * it.
 *
 * No <Bounds> here, unlike the home page's stage. Bounds owns the camera —
 * it fits it to the model and re-fits on resize — so it and a scroll-driven
 * camera would fight for the same transform every frame. The distances in
 * showcase-turntable are tuned against the grounded, centred model that
 * SushiModel's own layout effect produces, which is what Bounds would have
 * been measuring anyway.
 *
 * No OrbitControls either: scroll is the only transport on this route, and
 * a drag that moved the camera would be undone by the next scroll frame.
 */
export interface SushiShowcaseProps {
  /**
   * The shop name, rendered as the route's h1. It lives here rather than on
   * the intro because the intro is a title card that fades out and is
   * dropped entirely under reduced motion — this section is on every path.
   */
  title?: string
  subtitle?: string
  /** Scroll the section gets, as a multiple of the viewport. */
  heightVh?: number
}

const SUMI = '#0d0b0a'
const COUNTER = '#120d0a'
const PAPER = '#f4efe7'
const FONT = 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'

/**
 * A visitor who prefers reduced motion gets no camera move, so the section
 * has to park somewhere worth looking at rather than at the start of a
 * sweep it will never perform. Three-quarter view, mid dolly.
 */
const RESTING_PROGRESS = 0.38

/**
 * What stands in for the set when it cannot be drawn — no WebGL context, or
 * the scene threw while building. Both read the same to a visitor, so they
 * get the same panel, in the counter's colours rather than the home page's.
 */
function StagePanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 24px',
        textAlign: 'center',
        color: 'rgba(244, 239, 231, 0.7)',
        fontFamily: FONT,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 44 }}>
        🍣
      </span>
      <p style={{ maxWidth: '32ch', fontSize: 13, lineHeight: 1.7 }}>{children}</p>
    </div>
  )
}

function ScrollCamera({
  sectionRef,
  frozenAt,
}: {
  sectionRef: React.RefObject<HTMLElement | null>
  frozenAt: number | null
}) {
  useFrame(({ camera }) => {
    const progress =
      frozenAt ??
      sectionProgress(
        sectionRef.current?.getBoundingClientRect() ?? null,
        window.innerHeight,
      )
    const { rotationY, distance, height } = showcaseFrame(progress)
    camera.position.set(
      Math.sin(rotationY) * distance,
      height,
      Math.cos(rotationY) * distance,
    )
    // Slightly above the counter, so the set sits in the lower half of the
    // frame with room above it for the shop's name.
    camera.lookAt(0, 0.16, 0)
  })
  return null
}

export function SushiShowcase({
  title = '鮨 かねもり',
  subtitle,
  heightVh = 220,
}: SushiShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // null until the client has probed. The server has no WebGL, so it must not
  // commit to either branch: putting the fallback in the HTML and a canvas in
  // its place on hydration is a mismatch, which React recovers from by
  // discarding the tree.
  const webglAvailable = useHasWebGL()
  const [degraded, setDegraded] = useState(false)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
  const prefersReducedMotion = usePrefersReducedMotion()

  // Pinned behind a 250vh intro, this canvas would otherwise render every
  // frame of a scroll the visitor has not reached yet.
  useEffect(() => {
    const element = stageRef.current
    if (!element || typeof IntersectionObserver === 'undefined') return

    let onScreen = true
    let tabVisible = !document.hidden
    const sync = () => setFrameloop(onScreen && tabVisible ? 'always' : 'never')

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting
        sync()
      },
      { threshold: 0 },
    )
    observer.observe(element)

    const onVisibilityChange = () => {
      tabVisible = !document.hidden
      sync()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      data-testid="sushi-showcase"
      style={{ position: 'relative', height: `${heightVh}vh`, background: SUMI }}
    >
      <div
        ref={stageRef}
        data-testid="sushi-showcase-stage"
        style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden', background: SUMI }}
      >
        {webglAvailable === null ? null : webglAvailable ? (
          <ModelErrorBoundary
            fallback={
              <StagePanel>
                The set cannot be shown right now. The menu below still works.
              </StagePanel>
            }
          >
            <Canvas
              frameloop={frameloop}
              shadows="percentage"
              dpr={degraded ? 1 : [1, 2]}
              camera={{ fov: 35, position: [0, 1.32, 2.95], near: 0.1, far: 100 }}
              gl={{ antialias: true }}
            >
              <PerformanceMonitor onDecline={() => setDegraded(true)} />
              <AdaptiveDpr pixelated />

              <SceneEnv
                mode="lit"
                fogColor={SUMI}
                fogNear={3.5}
                fogFar={12}
                floorColor={COUNTER}
                shadowColor="#000000"
                ambientIntensity={0.14}
                keyIntensity={1.35}
                keyColor="#ffc389"
                environmentIntensity={0.26}
              />

              <Suspense fallback={null}>
                <SushiModel mode="lit" />
                <Preload all />
              </Suspense>

              <ScrollCamera
                sectionRef={sectionRef}
                frozenAt={prefersReducedMotion ? RESTING_PROGRESS : null}
              />
            </Canvas>
          </ModelErrorBoundary>
        ) : (
          <StagePanel>
            This browser cannot open a WebGL context, so the set cannot be shown here. The menu
            below still works.
          </StagePanel>
        )}

        {/*
          Above the canvas rather than inside it: DOM text stays crisp at any
          device pixel ratio, and it is the route's heading, so it belongs in
          the document rather than in a texture.
        */}
        <div
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
          <h1
            style={{
              margin: 0,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 'clamp(24px, 4vw, 44px)',
              letterSpacing: '0.1em',
              color: PAPER,
              textAlign: 'center',
              textShadow: '0 6px 40px rgba(0,0,0,0.85)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <span
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(10px, 1.1vw, 12px)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(244, 239, 231, 0.55)',
                textAlign: 'center',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
