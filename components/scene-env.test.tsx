import { describe, expect, it, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'

vi.mock('@react-three/drei', () => ({
  Environment: () => null,
  ContactShadows: () => null,
}))

import { FLOOR_Y, SceneEnv } from '@/components/scene-env'

describe('SceneEnv', () => {
  it('provides both an ambient fill and a directional key light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
    expect(renderer.scene.findAllByType('AmbientLight')).toHaveLength(1)
    expect(renderer.scene.findAllByType('DirectionalLight')).toHaveLength(1)
  })

  it('casts shadows from the key light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
    expect(renderer.scene.findByType('DirectionalLight').instance.castShadow).toBe(true)
  })

  it('lays a floor at the grounding plane that receives shadow', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="unlit" />)
    const floor = renderer.scene.findByType('Mesh').instance as Mesh
    expect(floor.receiveShadow).toBe(true)
    expect(floor.position.y).toBeCloseTo(FLOOR_Y, 5)
  })

  it('keeps the floor horizontal', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="unlit" />)
    const floor = renderer.scene.findByType('Mesh').instance as Mesh
    expect(floor.rotation.x).toBeCloseTo(-Math.PI / 2, 5)
  })

  it('renders the floor in unlit mode too, since grounding is what sells the scene', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="unlit" />)
    expect(renderer.scene.findAllByType('Mesh')).toHaveLength(1)
  })
})
