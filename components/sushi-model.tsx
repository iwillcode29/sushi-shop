'use client'

import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo } from 'react'
import type { Material, Mesh } from 'three'
import { LitMaterialCache, type LightingMode } from '@/lib/materials'
import { groundAndCenter } from '@/lib/scene-fit'

export const MODEL_URL = '/models/sushis.glb'

type SushiModelProps = {
  mode: LightingMode
  /**
   * Called when lit-mode conversion throws. The authored materials are left in
   * place, so the caller's job is only to move its own state back to unlit.
   */
  onConversionError?: (error: unknown) => void
}

export function SushiModel({ mode, onConversionError }: SushiModelProps) {
  const { scene } = useGLTF(MODEL_URL)
  const cache = useMemo(() => new LitMaterialCache(), [])

  // Captured before any swap, so unlit mode always has something to restore.
  const originals = useMemo(() => {
    const byUuid = new Map<string, Material | Material[]>()
    scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) byUuid.set(mesh.uuid, mesh.material)
    })
    return byUuid
  }, [scene])

  useEffect(() => {
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
      // shipped with and let the stage return its own state to unlit.
      applyMode('unlit')
      onConversionError?.(error)
    }
  }, [applyMode, mode, onConversionError])

  useEffect(() => () => cache.dispose(), [cache])

  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)
