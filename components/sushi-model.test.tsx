import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Texture,
} from 'three'

const scene = new Group()

function resetScene() {
  scene.clear()
  scene.position.set(0, 0, 0)

  for (const name of ['sushiSet', 'sushis']) {
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 1),
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

import { SushiModel } from '@/components/sushi-model'

function meshes() {
  return scene.children.filter((child): child is Mesh => (child as Mesh).isMesh)
}

beforeEach(() => {
  resetScene()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SushiModel', () => {
  it('mounts the loaded scene into the graph', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    expect(renderer.scene.findAllByType('Mesh')).toHaveLength(2)
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
    const originals = meshes().map((mesh) => mesh.material)
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    await renderer.update(<SushiModel mode="unlit" />)
    meshes().forEach((mesh, index) => {
      expect(mesh.material).toBe(originals[index])
    })
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
    const authoredOriginals = meshes().map((mesh) => mesh.material)

    const first = await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    await first.unmount()

    const second = await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    await second.update(<SushiModel mode="unlit" />)

    meshes().forEach((mesh, index) => {
      expect(mesh.material).toBe(authoredOriginals[index])
    })

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
