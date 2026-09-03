'use client'

import { ContactShadows, Environment } from '@react-three/drei'
import type { LightingMode } from '@/lib/materials'

/**
 * Both surfaces sit below y = 0, where groundAndCenter seats the model's
 * base, and apart from EACH OTHER by a margin far larger than the
 * depth-buffer precision at this scene scale (camera near 0.1 / far 100,
 * viewing distance 1.6-9 units — worst-case resolvable depth delta at that
 * range is on the order of 1e-5 units). Putting the shadow plane and the
 * floor at the same y, as before, made them exactly coplanar: two separate
 * draw calls producing near-identical interpolated depth per fragment,
 * which the depth test then resolves inconsistently frame to frame as the
 * camera moves — visible as flickering pixels under the model.
 */
export const SHADOW_Y = -0.004
export const FLOOR_Y = -0.02

type SceneEnvProps = {
  mode: LightingMode
}

export function SceneEnv({ mode }: SceneEnvProps) {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        // three's default directional-light shadow camera is an
        // orthographic box just ±5 units on a side, well short of the
        // floor's reach (see planeGeometry below). Widened to keep the
        // whole floor within it, with margin, so lit-mode shadow casting
        // stays correct everywhere the floor is visible. (This was ruled
        // out as the cause of the seam described below — castShadow={false}
        // reproduced the seam identically — but it is a real, independent
        // gap worth closing while touching this light.)
        shadow-camera-left={-101}
        shadow-camera-right={101}
        shadow-camera-top={101}
        shadow-camera-bottom={-101}
      />

      {/*
        The model itself is unlit, so in unlit mode the only thing tying it to
        the ground is this shadow. It is kept in both modes for consistency.
      */}
      <ContactShadows
        position={[0, SHADOW_Y, 0]}
        opacity={mode === 'lit' ? 0.35 : 0.5}
        scale={12}
        blur={2.4}
        far={4}
        resolution={512}
        color="#1c1410"
      />

      {/*
        Fog matches --color-shell (#efe7dc, the page background) and fades
        the plane's far reach into it, so it reads as a horizon dissolving
        into the page. near/far are set well beyond the orbit's maxDistance
        (9), so the model and the floor immediately around it are never
        inside the fogged band at any zoom level the orbit allows.
      */}
      <fog attach="fog" args={['#efe7dc', 10, 30]} />

      {/*
        A pale, near-shell colour here (tried first) turned out to render
        indistinguishable from the page background regardless of hue: the
        ambient + directional + studio-environment lighting rig is bright
        enough that a light, low-saturation diffuse surface clips to
        near-white almost everywhere it's visible, not just where it's
        fogged. Confirmed by swapping in a saturated red, which survived
        the same lighting with an obvious brightness gradient intact — the
        clipping is a function of how light/desaturated the base colour is,
        not of fog or geometry. The floor color is pulled markedly darker
        for headroom, and envMapIntensity is turned down so the (fairly
        strong) studio IBL doesn't reintroduce the same wash-out on its
        own. This only touches the floor's own material — the global
        lights are untouched, so the model's unlit/lit contrast is
        unaffected.
      */}
      {/*
        300x300, not the ~24x24 that would just cover the model's
        neighbourhood: at a grazing camera angle (near the orbit's
        maxPolarAngle) a small plane's actual edge comes into view well
        before fog has fully converged its colour to the background, and
        the residual difference reads as a hard, straight seam across the
        frame — reproduced and confirmed by watching it disappear as the
        plane grew from 24 to 300 with fog untouched. 300 keeps the edge
        beyond where fog (far: 30) has visually finished blending, at
        every camera position the orbit limits allow.
      */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial
          color="#7d6b53"
          roughness={0.9}
          metalness={0}
          envMapIntensity={0.4}
        />
      </mesh>
    </>
  )
}
