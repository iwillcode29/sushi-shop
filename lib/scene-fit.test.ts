import { describe, expect, it } from 'vitest'
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { groundAndCenter } from '@/lib/scene-fit'

function makeOffsetGroup(): Group {
  const group = new Group()
  const mesh = new Mesh(new BoxGeometry(2, 4, 2), new MeshBasicMaterial())
  // Sitting well away from the origin on every axis.
  mesh.position.set(10, 20, -6)
  group.add(mesh)
  return group
}

function worldBox(group: Group): Box3 {
  group.updateWorldMatrix(true, true)
  return new Box3().setFromObject(group)
}

describe('groundAndCenter', () => {
  it('seats the base of the object on y=0', () => {
    const group = makeOffsetGroup()
    groundAndCenter(group)
    expect(worldBox(group).min.y).toBeCloseTo(0, 5)
  })

  it('centres the object on the x and z axes', () => {
    const group = makeOffsetGroup()
    groundAndCenter(group)
    const center = worldBox(group).getCenter(new Vector3())
    expect(center.x).toBeCloseTo(0, 5)
    expect(center.z).toBeCloseTo(0, 5)
  })

  it('leaves the object size untouched', () => {
    const group = makeOffsetGroup()
    const before = worldBox(group).getSize(new Vector3())
    groundAndCenter(group)
    const after = worldBox(group).getSize(new Vector3())
    expect(after.x).toBeCloseTo(before.x, 5)
    expect(after.y).toBeCloseTo(before.y, 5)
    expect(after.z).toBeCloseTo(before.z, 5)
  })

  it('is idempotent', () => {
    const group = makeOffsetGroup()
    groundAndCenter(group)
    const once = group.position.clone()
    groundAndCenter(group)
    expect(group.position.x).toBeCloseTo(once.x, 5)
    expect(group.position.y).toBeCloseTo(once.y, 5)
    expect(group.position.z).toBeCloseTo(once.z, 5)
  })

  it('tolerates an empty object', () => {
    const group = new Group()
    expect(() => groundAndCenter(group)).not.toThrow()
  })
})
