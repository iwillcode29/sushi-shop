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

/** --color-shell: the page background every route but /menu sits on. */
export const SHELL_FOG = '#efe7dc'
export const SHELL_FLOOR = '#7d6b53'

type SceneEnvProps = {
  mode: LightingMode
  /**
   * The colour the floor's far reach dissolves into. It has to match the page
   * behind the canvas or the horizon reads as a band of the wrong colour
   * across the bottom of the frame — which is exactly what the shell default
   * does on a dark route.
   */
  fogColor?: string
  /**
   * Where the floor starts and finishes dissolving into `fogColor`. The
   * defaults sit well beyond the home page's orbit limits so the model is
   * never inside the fogged band; a dark counter wants them much nearer, so
   * the floor sinks into black within a couple of metres and the set reads as
   * sitting in a pool of light.
   */
  fogNear?: number
  fogFar?: number
  floorColor?: string
  shadowColor?: string
  /**
   * The rig's levels. The defaults are tuned to the bright cream page; left
   * at those, a near-black floor is lifted to mid grey.
   */
  ambientIntensity?: number
  keyIntensity?: number
  /** Tint of the key light. Warm on a lantern-lit counter, neutral in a studio. */
  keyColor?: string
  /** Scales the studio IBL, which lights the model and the floor alike. */
  environmentIntensity?: number
}

export function SceneEnv({
  mode,
  fogColor = SHELL_FOG,
  fogNear = 10,
  fogFar = 30,
  floorColor = SHELL_FLOOR,
  shadowColor = '#1c1410',
  ambientIntensity = 0.6,
  keyIntensity = 1.4,
  keyColor = '#ffffff',
  environmentIntensity = 1,
}: SceneEnvProps) {
  return (
    <>
      <Environment preset="studio" environmentIntensity={environmentIntensity} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={keyIntensity}
        color={keyColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        // three's default directional-light shadow camera is an
        // orthographic box just ±5 units on a side — short even of what's
        // actually visible, let alone the literal 300x300 floor (see
        // planeGeometry below). It doesn't need to cover the floor's full
        // extent, only the region that's ever visibly distinct from the
        // page background: past ~30 units of eye-space distance the floor
        // is already fog-converged to --color-shell (see the <fog> below)
        // and indistinguishable from empty space, so nothing out there
        // needs correct shadow-testing regardless of what the shadow map
        // contains. ±101 comfortably covers that visible region at every
        // camera position the orbit allows — it is sized to the fog
        // convergence distance, not to the floor's own size. (This was
        // ruled out as the cause of the seam described below —
        // castShadow={false} reproduced the seam identically — but it is a
        // real, independent gap worth closing while touching this light.)
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
        color={shadowColor}
      />

      {/*
        Fog matches the page background behind the canvas — --color-shell
        (#efe7dc) by default, see SHELL_FOG — and fades the plane's far reach
        into it, so it reads as a horizon dissolving into the page. near/far
        are set well beyond the orbit's maxDistance (9), so the model and the
        floor immediately around it are never inside the fogged band at any
        zoom level the orbit allows.
      */}
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

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
          color={floorColor}
          roughness={0.9}
          metalness={0}
          envMapIntensity={0.4}
        />
      </mesh>
    </>
  )
}
