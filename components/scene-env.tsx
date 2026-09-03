'use client'

import { ContactShadows, Environment } from '@react-three/drei'
import type { LightingMode } from '@/lib/materials'

/**
 * A hair below zero so the floor never z-fights with geometry that
 * groundAndCenter has seated at exactly y = 0.
 */
export const FLOOR_Y = -0.002

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
      />

      {/*
        The model itself is unlit, so in unlit mode the only thing tying it to
        the ground is this shadow. It is kept in both modes for consistency.
      */}
      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={mode === 'lit' ? 0.35 : 0.5}
        scale={12}
        blur={2.4}
        far={4}
        resolution={512}
        color="#1c1410"
      />

      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#efe7dc" roughness={0.9} metalness={0} />
      </mesh>
    </>
  )
}
