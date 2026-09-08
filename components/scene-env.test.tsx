import { describe, expect, it, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Fog, Light, Mesh, MeshStandardMaterial, Scene } from 'three'

/** The test renderer types instances as bare Object3D; these are not. */
const fogOf = (scene: unknown) => (scene as Scene).fog as unknown as Fog
const fogColorOf = (scene: unknown) => fogOf(scene).color.getHexString()
const intensityOf = (light: unknown) => (light as Light).intensity
const floorColorOf = (floor: Mesh) => (floor.material as MeshStandardMaterial).color.getHexString()

vi.mock('@react-three/drei', () => ({
  Environment: () => null,
  ContactShadows: () => null,
}))

import { FLOOR_Y, SHELL_FLOOR, SHELL_FOG, SceneEnv } from '@/components/scene-env'

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

  // The fog exists to dissolve the floor's far reach into the page behind
  // it. That only works if it is the page's colour — on a dark route the
  // shell default paints a cream horizon across the bottom of the frame.
  describe('taking its colours from the page it sits on', () => {
    it('fogs to the shell background by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
      expect(fogColorOf(renderer.scene.instance)).toBe(SHELL_FOG.replace('#', ''))
    })

    it('fogs to whatever background it is given', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SceneEnv mode="lit" fogColor="#0d0b0a" />,
      )
      expect(fogColorOf(renderer.scene.instance)).toBe('0d0b0a')
    })

    it('keeps the shell floor by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
      const floor = renderer.scene.findByType('Mesh').instance as Mesh
      expect(floorColorOf(floor)).toBe(SHELL_FLOOR.replace('#', ''))
    })

    it('fogs across the shell distances by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
      expect(fogOf(renderer.scene.instance).near).toBe(10)
      expect(fogOf(renderer.scene.instance).far).toBe(30)
    })

    // A dark counter wants the floor to sink into black within a couple of
    // metres, so the set sits in a pool of light rather than on a lit plane
    // stretching to the horizon.
    it('takes fog distances of its own', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SceneEnv mode="lit" fogNear={3.5} fogFar={12} />,
      )
      expect(fogOf(renderer.scene.instance).near).toBe(3.5)
      expect(fogOf(renderer.scene.instance).far).toBe(12)
    })

    it('keeps the shell light levels by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
      expect(intensityOf(renderer.scene.findByType('AmbientLight').instance)).toBe(0.6)
      expect(intensityOf(renderer.scene.findByType('DirectionalLight').instance)).toBe(1.4)
    })

    // The shell rig is tuned to a bright cream page. Left at those levels it
    // lifts a near-black floor to mid grey, which is what "dark counter"
    // looked like on the first attempt.
    it('takes light levels of its own', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SceneEnv mode="lit" ambientIntensity={0.22} keyIntensity={1} />,
      )
      expect(intensityOf(renderer.scene.findByType('AmbientLight').instance)).toBe(0.22)
      expect(intensityOf(renderer.scene.findByType('DirectionalLight').instance)).toBe(1)
    })

    it('keys with white light by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
      expect(
        (renderer.scene.findByType('DirectionalLight').instance as Light).color.getHexString(),
      ).toBe('ffffff')
    })

    // The counter is lit by lanterns in the footage the visitor just walked
    // through; a neutral key breaks that continuity.
    it('takes a key colour of its own', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SceneEnv mode="lit" keyColor="#ffb877" />,
      )
      expect(
        (renderer.scene.findByType('DirectionalLight').instance as Light).color.getHexString(),
      ).toBe('ffb877')
    })

    it('takes a floor colour of its own', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SceneEnv mode="lit" floorColor="#241c17" />,
      )
      const floor = renderer.scene.findByType('Mesh').instance as Mesh
      expect(floorColorOf(floor)).toBe('241c17')
    })
  })
})
