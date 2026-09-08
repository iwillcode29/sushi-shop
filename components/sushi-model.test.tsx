import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Texture,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const scene = new Group()

/**
 * Two boxes with a gap between them, standing in for the real asset's two
 * sushi, which arrive as disconnected islands of a single mesh. Both sit well
 * inside the tray box's extent so they never move the scene's bounding box.
 */
function twoPieceGeometry(): BufferGeometry {
  const left = new BoxGeometry(0.2, 0.2, 0.2).translate(-0.3, 0, 0)
  const right = new BoxGeometry(0.2, 0.2, 0.2).translate(0.3, 0, 0)
  return mergeGeometries([left, right])
}

function resetScene() {
  scene.clear()
  scene.position.set(0, 0, 0)

  for (const name of ['sushiSet', 'sushis']) {
    const mesh = new Mesh(
      name === 'sushis' ? twoPieceGeometry() : new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ name, map: new Texture() }),
    )
    mesh.name = `${name}_mesh`
    mesh.position.set(5, 7, 5)
    scene.add(mesh)
  }
}

vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(() => ({ scene }), { preload: vi.fn() }),
}))

// The component reads both of these itself; the tests drive them directly
// rather than through matchMedia, which jsdom does not implement.
const env = vi.hoisted(() => ({ hasHover: true, reducedMotion: false }))
vi.mock('@/lib/use-has-hover', () => ({ useHasHover: () => env.hasHover }))
vi.mock('@/lib/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => env.reducedMotion,
}))

import { SUSHI_LIFT, SushiModel } from '@/components/sushi-model'

function meshes() {
  return scene.children.filter((child): child is Mesh => (child as Mesh).isMesh)
}

const BASE_Y = 7

function piece(index: number) {
  return scene.getObjectByName(`sushi-piece-${index}`) as Mesh
}

/** The <primitive> that carries the pointer handlers. */
function primitiveOf(renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) {
  return renderer.scene.children[0]
}

/** Long enough for the easing to settle within the assertions' tolerance. */
async function settle(renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) {
  await renderer.advanceFrames(60, 1 / 60)
}

beforeEach(() => {
  env.hasHover = true
  env.reducedMotion = false
  resetScene()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SushiModel', () => {
  it('mounts the loaded scene into the graph', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    // The tray, plus one mesh per sushi split out of the sushi mesh.
    expect(renderer.scene.findAllByType('Mesh')).toHaveLength(3)
  })

  it('splits the sushi mesh into one mesh per sushi and leaves the tray whole', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)

    expect(meshes().map((mesh) => mesh.name)).toEqual([
      'sushiSet_mesh',
      'sushi-piece-0',
      'sushi-piece-1',
    ])
  })

  it('keeps the authored basic materials in unlit mode', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    for (const mesh of meshes()) {
      expect(mesh.material).toBeInstanceOf(MeshBasicMaterial)
    }
  })

  it('swaps to standard materials in lit mode', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    for (const mesh of meshes()) {
      expect(mesh.material).toBeInstanceOf(MeshStandardMaterial)
    }
  })

  it('preserves the baked texture through the swap', async () => {
    const original = (meshes()[0].material as MeshBasicMaterial).map
    await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    expect((meshes()[0].material as MeshStandardMaterial).map).toBe(original)
  })

  it('restores the original materials when switching back to unlit', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    // Captured after mount: the sushi mesh has been split by now, so a capture
    // taken before it would not line up with the meshes in the scene.
    const authored = new Map(meshes().map((mesh) => [mesh.uuid, mesh.material]))

    await renderer.update(<SushiModel mode="lit" />)
    await renderer.update(<SushiModel mode="unlit" />)

    for (const mesh of meshes()) {
      expect(mesh.material).toBe(authored.get(mesh.uuid))
    }
  })

  it('enables shadow casting only in lit mode', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    expect(meshes().every((mesh) => mesh.castShadow)).toBe(false)

    await renderer.update(<SushiModel mode="lit" />)
    expect(meshes().every((mesh) => mesh.castShadow)).toBe(true)
  })

  it('seats the model on the floor', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    // The meshes sit at y=7 with height 1, so the base is at 6.5 before fitting.
    expect(scene.position.y).toBeCloseTo(-6.5, 5)
  })

  it('restores authored materials on unmount so a remount does not inherit disposed ones', async () => {
    // useGLTF caches the scene and hands back the same object on every mount
    // (mirrored here by the mock reusing the module-scope `scene`), so if
    // unmount disposes the converted materials without restoring the
    // authored ones first, the next mount's `originals` capture will be the
    // disposed materials instead of the real MeshBasicMaterial instances.
    // Keyed by material name rather than by mesh, because the first mount
    // splits the sushi mesh and the piece meshes did not exist yet. The pieces
    // share the material their source mesh carried, so the names still line up.
    const authoredByName = new Map(
      meshes().map((mesh) => [(mesh.material as MeshBasicMaterial).name, mesh.material]),
    )

    const first = await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    await first.unmount()

    const second = await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    await second.update(<SushiModel mode="unlit" />)

    for (const mesh of meshes()) {
      const material = mesh.material as MeshBasicMaterial
      expect(material).toBe(authoredByName.get(material.name))
    }

    // Switching modes still works after the remount.
    await second.update(<SushiModel mode="lit" />)
    for (const mesh of meshes()) {
      expect(mesh.material).toBeInstanceOf(MeshStandardMaterial)
    }
  })

  it('keeps the authored materials and reports upward when conversion fails', async () => {
    const onConversionError = vi.fn()
    const source = meshes()[0].material as MeshBasicMaterial
    // toLit clones the source colour, so this is the realistic failure point.
    vi.spyOn(source.color, 'clone').mockImplementation(() => {
      throw new Error('material conversion failed')
    })

    await ReactThreeTestRenderer.create(
      <SushiModel mode="lit" onConversionError={onConversionError} />,
    )

    expect(onConversionError).toHaveBeenCalledOnce()
    expect(meshes()[0].material).toBeInstanceOf(MeshBasicMaterial)
  })
})

describe('SushiModel hover lift', () => {
  it('raises the sushi under the pointer', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    await settle(renderer)

    expect(piece(0).position.y).toBeCloseTo(BASE_Y + SUSHI_LIFT, 3)
  })

  it('leaves the sushi the pointer is not on alone', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    await settle(renderer)

    expect(piece(1).position.y).toBeCloseTo(BASE_Y, 3)
  })

  it('sets the sushi back down when the pointer leaves the model', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    await settle(renderer)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerOut', {})
    await settle(renderer)

    expect(piece(0).position.y).toBeCloseTo(BASE_Y, 3)
  })

  it('hands the lift over when the pointer crosses to the other sushi', async () => {
    // Worth its own test: the handler sits on the whole model, so crossing from
    // one sushi to the next produces no out/over pair to react to — only moves.
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    await settle(renderer)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(1) })
    await settle(renderer)

    expect(piece(1).position.y).toBeCloseTo(BASE_Y + SUSHI_LIFT, 3)
    expect(piece(0).position.y).toBeCloseTo(BASE_Y, 3)
  })

  it('lifts nothing while the pointer is over the tray', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: meshes()[0] })
    await settle(renderer)

    expect(piece(0).position.y).toBeCloseTo(BASE_Y, 3)
    expect(piece(1).position.y).toBeCloseTo(BASE_Y, 3)
  })

  it('reports whether a sushi is hovered so the caller can stop the turntable', async () => {
    const onHoverChange = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <SushiModel mode="unlit" onHoverChange={onHoverChange} />,
    )

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    expect(onHoverChange).toHaveBeenLastCalledWith(true)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerOut', {})
    expect(onHoverChange).toHaveBeenLastCalledWith(false)
  })

  it('says nothing about hover until the pointer reaches a sushi', async () => {
    // Mounting is not a hover change. Reporting one would have the caller
    // treat it as an interaction ending and arm its idle timer for nothing.
    const onHoverChange = vi.fn()

    await ReactThreeTestRenderer.create(<SushiModel mode="unlit" onHoverChange={onHoverChange} />)

    expect(onHoverChange).not.toHaveBeenCalled()
  })

  it('reports a sushi being left only once, not on every render', async () => {
    const onHoverChange = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <SushiModel mode="unlit" onHoverChange={onHoverChange} />,
    )

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerOut', {})
    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: meshes()[0] })

    expect(onHoverChange).not.toHaveBeenCalled()
  })

  it('skips the lift on a device that cannot hover', async () => {
    env.hasHover = false

    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)

    expect(primitiveOf(renderer).props.onPointerMove).toBeUndefined()
    expect(primitiveOf(renderer).props.onPointerOut).toBeUndefined()
  })

  it('jumps straight to the lifted position when motion is reduced', async () => {
    env.reducedMotion = true
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)

    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    await renderer.advanceFrames(1, 1 / 60)

    expect(piece(0).position.y).toBe(BASE_Y + SUSHI_LIFT)
  })

  it('sets the sushi back down on unmount so a remount does not start lifted', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
    await settle(renderer)

    await renderer.unmount()

    expect(piece(0).position.y).toBe(BASE_Y)
  })

  it('eases by elapsed time, not by frame count', async () => {
    const liftAfter = async (frames: number, delta: number) => {
      resetScene()
      const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
      await renderer.fireEvent(primitiveOf(renderer), 'onPointerMove', { object: piece(0) })
      await renderer.advanceFrames(frames, delta)
      const lift = piece(0).position.y - BASE_Y
      await renderer.unmount()
      return lift
    }

    // A tenth of a second of easing, sampled at 30fps and at 120fps.
    const slow = await liftAfter(3, 1 / 30)
    const fast = await liftAfter(12, 1 / 120)

    // Mid-ease, so a rate mismatch has somewhere to show up.
    expect(slow).toBeGreaterThan(0)
    expect(slow).toBeLessThan(SUSHI_LIFT)
    expect(slow).toBeCloseTo(fast, 6)
  })
})
