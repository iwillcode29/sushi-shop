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

  // Hovering a sushi is an interaction like any other as far as the turntable
  // is concerned: hold still while it lasts, then resume after the same idle
  // delay a drag gets.
  const handleHoverChange = useCallback(
    (hovered: boolean) => {
      if (hovered) handleInteractionStart()
      else handleInteractionEnd()
    },
    [handleInteractionEnd, handleInteractionStart],
  )

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
          // "percentage" maps to THREE.PCFShadowMap. The bare boolean
          // `shadows` used to ask fiber for THREE.PCFSoftShadowMap, which
          // three.js has deprecated and silently substitutes with
          // PCFShadowMap anyway (see WebGLShadowMap's own source) — so this
          // is not a rendering change, just asking directly for what we
          // were already being given, and it removes the deprecation
          // warning that was otherwise noise in every test/console run.
          shadows="percentage"
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
              reach of the floor in SceneEnv — the floor sits outside
              <Bounds> since it isn't part of what should be auto-framed.
              Canvas's own far (100) does not literally contain the floor
              (300x300, half-extent 150 — see scene-env.tsx) at every
              camera angle; what it needs to contain, and does, is the
              floor's fog-convergence distance (~30 units of eye-space
              depth — see the <fog> in scene-env.tsx). Past that the floor
              is already blended into the page background and visually
              indistinguishable from empty space, so clipping it there,
              rather than at its literal edge, produces no visible seam.

              margin was tuned empirically, not guessed: 1.15 (original)
              let the model's silhouette fill ~87% of the frame's shorter
              axis, leaving no room for any text band. 2.4 (first fix) went
              the other way — the model read as a thumbnail in a mostly
              empty frame. 1.3 is the largest value (smallest margin,
              biggest model) that, checked across a full auto-rotate cycle
              at both 1440x720 and 390x844, never clips the model's
              silhouette at the frame edges and never enters the headline
              or drag-hint bands. The board is long and thin, so its
              on-screen footprint swings a lot between its broadside and
              end-on presentations as it turns — 1.3 is sized to the
              broadside worst case, not a single resting frame. A tighter
              margin (~1.0) filled 1440x720 nicely but left as little as
              ~3% clearance from the mobile viewport's edges at some
              rotation angles — too close to real clipping risk to keep.
            */}
            <Bounds fit observe margin={1.3}>
              <SushiModel
                mode={mode}
                onConversionError={handleConversionError}
                onHoverChange={handleHoverChange}
              />
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
