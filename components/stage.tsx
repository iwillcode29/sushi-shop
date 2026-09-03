'use client'

import {
  AdaptiveDpr,
  Bounds,
  OrbitControls,
  PerformanceMonitor,
  Preload,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { FallbackPoster } from '@/components/fallback-poster'
import { HeroOverlay } from '@/components/hero-overlay'
import { Loader } from '@/components/loader'
import { ModelErrorBoundary } from '@/components/model-error-boundary'
import { SceneEnv } from '@/components/scene-env'
import { SushiModel } from '@/components/sushi-model'
import type { LightingMode } from '@/lib/materials'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { hasWebGL } from '@/lib/webgl'

export const IDLE_RESUME_MS = 3000

export const ORBIT_LIMITS = {
  minPolarAngle: 0.15 * Math.PI,
  maxPolarAngle: 0.48 * Math.PI,
  minDistance: 1.6,
  maxDistance: 9,
  autoRotateSpeed: 0.6,
} as const

/**
 * Exposes a frame count on window so the end-to-end suite can assert the
 * scene is genuinely rendering, rather than that a canvas element exists.
 */
function FrameProbe() {
  useFrame(() => {
    const scope = window as unknown as { __sushiFrames?: number }
    scope.__sushiFrames = (scope.__sushiFrames ?? 0) + 1
  })
  return null
}

export function Stage() {
  // Stage is loaded with ssr: false, so probing during the initial render is safe.
  const [webglAvailable] = useState(hasWebGL)
  const [mode, setMode] = useState<LightingMode>('unlit')
  const [spinning, setSpinning] = useState(true)
  const [degraded, setDegraded] = useState(false)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')

  const prefersReducedMotion = usePrefersReducedMotion()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'unlit' ? 'lit' : 'unlit'))
  }, [])

  // The model keeps its authored materials on a conversion failure; all this
  // has to do is stop claiming the scene is lit.
  const handleConversionError = useCallback(() => setMode('unlit'), [])

  const handleInteractionStart = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    setSpinning(false)
  }, [])

  const handleInteractionEnd = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setSpinning(true), IDLE_RESUME_MS)
  }, [])

  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
  }, [])

  // Stop burning GPU on a scene nobody is looking at.
  useEffect(() => {
    const element = wrapper.current
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

  if (!webglAvailable) {
    return <FallbackPoster reason="no-webgl" />
  }

  return (
    <div ref={wrapper} className="absolute inset-0">
      <ModelErrorBoundary>
        <Canvas
          frameloop={frameloop}
          shadows
          dpr={degraded ? 1 : [1, 2]}
          camera={{ fov: 35, position: [3.4, 2.4, 3.4], near: 0.1, far: 100 }}
          gl={{ antialias: true }}
        >
          <PerformanceMonitor onDecline={() => setDegraded(true)} />
          <AdaptiveDpr pixelated />
          <FrameProbe />

          <SceneEnv mode={mode} />

          <Suspense fallback={null}>
            {/*
              No `clip`: it tightens the camera's near/far planes around
              the model alone (Bounds' only children), which culled the far
              reach of the 24x24 floor in SceneEnv — the floor sits outside
              <Bounds> since it isn't part of what should be auto-framed.
              Canvas's own near/far (0.1 / 100) already comfortably contains
              the floor at every orbit distance.

              margin is larger than a tight fit (1.15) so the model's
              silhouette leaves clear bands top and bottom of the frame for
              the headline and the drag-hint row — see HeroOverlay/page.tsx.
            */}
            <Bounds fit observe margin={2.4}>
              <SushiModel mode={mode} onConversionError={handleConversionError} />
            </Bounds>
            <Preload all />
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate={spinning && !prefersReducedMotion}
            autoRotateSpeed={ORBIT_LIMITS.autoRotateSpeed}
            minPolarAngle={ORBIT_LIMITS.minPolarAngle}
            maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
            minDistance={ORBIT_LIMITS.minDistance}
            maxDistance={ORBIT_LIMITS.maxDistance}
            onStart={handleInteractionStart}
            onEnd={handleInteractionEnd}
          />
        </Canvas>
      </ModelErrorBoundary>

      <HeroOverlay mode={mode} onToggleMode={toggleMode} />
      <Loader />
    </div>
  )
}

export default Stage
