'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Material, Mesh, Object3D } from 'three'
import { LitMaterialCache, type LightingMode } from '@/lib/materials'
import { groundAndCenter } from '@/lib/scene-fit'
import { splitMeshInPlace } from '@/lib/split-pieces'
import { useHasHover } from '@/lib/use-has-hover'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

export const MODEL_URL = '/models/sushis.glb'

/**
 * How far a hovered sushi rises, in model units. The sushi themselves are about
 * 0.13 tall, so this reads as the piece lifting clear of the tray rather than
 * taking off.
 */
export const SUSHI_LIFT = 0.045

/**
 * Rate of the lift ease, in reciprocal seconds — the fraction of the remaining
 * distance closed per second is 1 - e^-rate. Applied against the frame delta so
 * the motion is the same on a 60Hz and a 144Hz display.
 */
const LIFT_RATE = 14

/** Below this the ease is snapped shut, so pieces come fully to rest. */
const LIFT_EPSILON = 1e-5

/**
 * The asset ships every sushi in one mesh and the tray in another, told apart
 * by material rather than by mesh name: the names are generator output
 * (`Object_4`, `Object_5`) while the material names are authored.
 */
const SUSHI_MATERIAL = 'sushis'
export const PIECE_PREFIX = 'sushi-piece-'

/**
 * Replaces the single sushi mesh with one mesh per sushi, so each can be moved
 * on its own.
 *
 * Idempotent, and it has to be: useGLTF hands the same cached scene object back
 * on every mount, so this runs again on each remount (and twice per mount under
 * Strict Mode) against a scene that is already split.
 */
function splitSushi(scene: Object3D): Mesh[] {
  const alreadySplit: Mesh[] = []
  let source: Mesh | undefined

  scene.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    if (mesh.name.startsWith(PIECE_PREFIX)) {
      alreadySplit.push(mesh)
      return
    }
    const { material } = mesh
    if (!Array.isArray(material) && material.name === SUSHI_MATERIAL) source = mesh
  })

  if (alreadySplit.length > 0) return alreadySplit
  return source ? splitMeshInPlace(source, PIECE_PREFIX) : []
}

type SushiModelProps = {
  mode: LightingMode
  /**
   * Called when lit-mode conversion throws. The authored materials are left in
   * place, so the caller's job is only to move its own state back to unlit.
   */
  onConversionError?: (error: unknown) => void
  /**
   * Called as the pointer moves on and off the sushi. The turntable has to stop
   * while a sushi is hovered, or the model rotates the piece out from under the
   * pointer and the hover flickers.
   */
  onHoverChange?: (hovered: boolean) => void
}

export function SushiModel({ mode, onConversionError, onHoverChange }: SushiModelProps) {
  const { scene } = useGLTF(MODEL_URL)
  const cache = useMemo(() => new LitMaterialCache(), [])

  // The height each piece returns to, keyed by mesh name. Declared ahead of the
  // originals capture below on purpose: splitting is what creates the piece
  // meshes, and the capture has to see them rather than the single mesh they
  // replaced. Both memos key off `scene` alone, so declaration order is what
  // sequences them.
  //
  // Resting heights are read off the transform each piece inherited from the
  // mesh it was split out of, so the lift is an offset from where the asset put
  // it rather than an absolute height.
  const restingY = useMemo(
    () => new Map(splitSushi(scene).map((piece) => [piece.name, piece.position.y])),
    [scene],
  )

  // Captured before any swap, so unlit mode always has something to restore.
  const originals = useMemo(() => {
    const byUuid = new Map<string, Material | Material[]>()
    scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) byUuid.set(mesh.uuid, mesh.material)
    })
    return byUuid
  }, [scene])

  const hasHover = useHasHover()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    // Not onPointerOver: the handler is on the model as a whole, so R3F treats
    // the whole subtree as one hover target and firing over/out only at its
    // edges — crossing from one sushi to the other would go unnoticed.
    const { name } = event.object
    setHovered(name.startsWith(PIECE_PREFIX) ? name : null)
  }, [])

  const handlePointerOut = useCallback(() => setHovered(null), [])

  // Only transitions are worth reporting. Mounting is not one, and neither is
  // a re-render that leaves the hover where it was — the caller treats each
  // report as an interaction starting or ending.
  const reportedHover = useRef(false)
  useEffect(() => {
    const isHovered = hovered !== null
    if (reportedHover.current === isHovered) return
    reportedHover.current = isHovered
    onHoverChange?.(isHovered)
  }, [hovered, onHoverChange])

  // Reached through the scene rather than through a list held in a memo: the
  // pieces are three.js objects owned by the cached glTF, and this walk is the
  // same one applyMode does.
  useFrame((_, delta) => {
    scene.traverse((object) => {
      const resting = restingY.get(object.name)
      if (resting === undefined) return

      const target = resting + (object.name === hovered ? SUSHI_LIFT : 0)

      if (prefersReducedMotion) {
        object.position.y = target
        return
      }

      const next =
        object.position.y + (target - object.position.y) * (1 - Math.exp(-LIFT_RATE * delta))
      object.position.y = Math.abs(target - next) < LIFT_EPSILON ? target : next
    })
  })

  useEffect(() => {
    return () => {
      // The scene is cached and reused, so a piece left mid-lift would still be
      // in the air on the next mount.
      scene.traverse((object) => {
        const resting = restingY.get(object.name)
        if (resting !== undefined) object.position.y = resting
      })
    }
  }, [restingY, scene])

  // This must run in a layout effect, not a passive one. Bounds (the parent)
  // also measures the model's bounding box in a layout effect, and React
  // fires layout effects bottom-up — children before parents — within a
  // commit. A passive effect here would fire only after Bounds' own layout
  // effect had already measured and framed the camera on the model's raw,
  // as-authored transform (whatever offset the GLB happened to ship with),
  // not the grounded/centred one. That produced a camera locked onto a
  // stale bounding box: the model would then reposition itself to true
  // origin post-fit, leaving the framing off-centre and low, exactly as
  // this bug reported.
  useLayoutEffect(() => {
    groundAndCenter(scene)
  }, [scene])

  const applyMode = useCallback(
    (target: LightingMode) => {
      scene.traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.isMesh) return

        const original = originals.get(mesh.uuid)
        if (!original) return

        if (target === 'lit') {
          mesh.material = Array.isArray(original)
            ? original.map((material) => cache.get(material))
            : cache.get(original)
        } else {
          mesh.material = original
        }

        // Pointless in unlit mode — the model neither casts into nor reads the
        // shadow map — and it costs a shadow-map pass, so it is gated.
        mesh.castShadow = target === 'lit'
        mesh.receiveShadow = target === 'lit'
      })
    },
    [cache, originals, scene],
  )

  useEffect(() => {
    try {
      applyMode(mode)
    } catch (error) {
      // A malformed material must not blank the canvas: keep what the GLB
      // shipped with and let the stage return its own state to unlit. The
      // restore itself must not throw either — the whole point of this catch
      // is that the component never rethrows, so onConversionError must still
      // fire even if applyMode('unlit') fails here.
      try {
        applyMode('unlit')
      } catch {
        // Authored materials could not be restored; still report the
        // original conversion failure below rather than losing it.
      }
      onConversionError?.(error)
    }
  }, [applyMode, mode, onConversionError])

  useEffect(() => {
    return () => {
      // useGLTF caches the scene and hands the same object back on the next
      // mount (e.g. React Strict Mode's mount/unmount/remount in dev), so the
      // authored materials must go back onto the meshes before the converted
      // ones are disposed — otherwise the next mount's `originals` capture
      // would be these disposed materials instead of the real ones, and the
      // restore path is poisoned from then on.
      applyMode('unlit')
      cache.dispose()
    }
  }, [applyMode, cache])

  return (
    <primitive
      object={scene}
      onPointerMove={hasHover ? handlePointerMove : undefined}
      onPointerOut={hasHover ? handlePointerOut : undefined}
    />
  )
}

useGLTF.preload(MODEL_URL)
