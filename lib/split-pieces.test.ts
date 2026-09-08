import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from 'three'
import { readGlbGeometryByMaterial } from '@/lib/__fixtures__/read-glb-mesh'
import { splitIntoPieces, splitMeshInPlace } from '@/lib/split-pieces'

type Quad = { x: number; y?: number; z: number; half?: number }

/**
 * Builds one indexed geometry from a set of axis-aligned quads. Each quad is a
 * separate connected component unless two of them are given identical corner
 * positions, which is how the seam case below is expressed.
 */
function geometryOf(quads: Quad[]): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (const { x, y = 0, z, half = 0.1 } of quads) {
    const base = positions.length / 3
    positions.push(
      x - half, y, z - half,
      x + half, y, z - half,
      x + half, y, z + half,
      x - half, y, z + half,
    )
    for (let corner = 0; corner < 4; corner++) {
      normals.push(0, 1, 0)
      // u carries the source vertex index, so a test can tell which original
      // vertex any remapped vertex came from.
      uvs.push(base + corner, 0)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

/** Every triangle as its three corner positions, for order-independent compare. */
function trianglesOf(geometry: BufferGeometry): string[] {
  const index = geometry.getIndex()
  if (!index) throw new Error('expected an indexed geometry')
  const position = geometry.attributes.position

  const triangles: string[] = []
  for (let t = 0; t < index.count / 3; t++) {
    const corners = [0, 1, 2].map((corner) => {
      const vertex = index.getX(t * 3 + corner)
      return `${position.getX(vertex)},${position.getY(vertex)},${position.getZ(vertex)}`
    })
    triangles.push(corners.join(' | '))
  }
  return triangles
}

describe('splitIntoPieces', () => {
  it('separates components whose XZ footprints do not overlap', () => {
    const pieces = splitIntoPieces(geometryOf([{ x: -1, z: 0 }, { x: 1, z: 0 }]))

    expect(pieces).toHaveLength(2)
  })

  it('merges stacked components into one piece when their XZ footprints overlap', () => {
    // The topping sits above the rice and never touches it, but the two read as
    // a single sushi and have to lift together.
    const pieces = splitIntoPieces(geometryOf([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0.5, z: 0 }]))

    expect(pieces).toHaveLength(1)
  })

  it('reproduces every source triangle exactly once across the pieces', () => {
    const source = geometryOf([{ x: -1, z: 0 }, { x: 1, z: 0 }])

    const pieces = splitIntoPieces(source)

    expect(pieces.flatMap(trianglesOf).sort()).toEqual(trianglesOf(source).sort())
  })

  it('carries normals and uvs over to the vertex they belong to', () => {
    const source = geometryOf([{ x: -1, z: 0 }, { x: 1, z: 0 }])
    const sourcePosition = source.attributes.position

    for (const piece of splitIntoPieces(source)) {
      const { position, uv, normal } = piece.attributes
      expect(uv.count).toBe(position.count)
      expect(normal.count).toBe(position.count)

      for (let i = 0; i < position.count; i++) {
        // geometryOf writes the source vertex index into u, so the vertex a uv
        // ended up on has to be the one it started on.
        const sourceVertex = uv.getX(i)
        expect(position.getX(i)).toBe(sourcePosition.getX(sourceVertex))
        expect(position.getZ(i)).toBe(sourcePosition.getZ(sourceVertex))
      }
    }
  })

  it('splits a geometry that carries no index buffer', () => {
    const source = geometryOf([{ x: -1, z: 0 }, { x: 1, z: 0 }]).toNonIndexed()

    expect(splitIntoPieces(source)).toHaveLength(2)
  })
})

describe('splitIntoPieces on the shipped sushi asset', () => {
  // Guards the asset, not the algorithm: the hover interaction is built on the
  // sushi mesh resolving to exactly two liftable pieces, and nothing else in
  // the codebase would notice if a re-export changed that.
  const geometry = readGlbGeometryByMaterial('public/models/sushis.glb', 'sushis')

  it('resolves the sushi mesh into two pieces', () => {
    expect(splitIntoPieces(geometry)).toHaveLength(2)
  })

  it('leaves the two pieces standing apart along X', () => {
    const [left, right] = splitIntoPieces(geometry).map((piece) => {
      piece.computeBoundingBox()
      return piece.boundingBox!
    })

    expect(left.max.x).toBeLessThan(right.min.x)
  })

  it('loses no triangles in the split', () => {
    const pieces = splitIntoPieces(geometry)
    const total = pieces.reduce((sum, piece) => sum + piece.getIndex()!.count, 0)

    expect(total).toBe(geometry.getIndex()!.count)
  })
})

describe('splitMeshInPlace', () => {
  function parentedMesh() {
    const parent = new Group()
    const before = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    before.name = 'before'
    const after = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    after.name = 'after'
    const source = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    source.name = 'source'

    parent.add(before, source, after)
    return { parent, source }
  }

  it('replaces the source mesh with its pieces, in the slot the source held', () => {
    const { parent, source } = parentedMesh()

    const pieces = splitMeshInPlace(source, 'piece-')

    expect(pieces).toHaveLength(1)
    expect(parent.children.map((child) => child.name)).toEqual(['before', 'piece-0', 'after'])
  })

  it('carries the source transform onto every piece', () => {
    // The GLB may hang the mesh off its parent with an offset; the geometry is
    // authored in the mesh's own space, so a piece that drops the transform
    // renders somewhere else entirely.
    const { source } = parentedMesh()
    source.position.set(5, 7, 5)
    source.scale.set(2, 2, 2)
    source.rotation.set(0, Math.PI / 4, 0)

    const [piece] = splitMeshInPlace(source, 'piece-')

    expect(piece.position.toArray()).toEqual([5, 7, 5])
    expect(piece.scale.toArray()).toEqual([2, 2, 2])
    expect(piece.quaternion.toArray()).toEqual(source.quaternion.toArray())
  })

  it('shares the source material so a mode swap still reaches every piece', () => {
    const { source } = parentedMesh()

    const [piece] = splitMeshInPlace(source, 'piece-')

    expect(piece.material).toBe(source.material)
  })

  it('disposes the geometry it replaced', () => {
    const { source } = parentedMesh()
    const disposed = vi.fn()
    source.geometry.addEventListener('dispose', disposed)

    splitMeshInPlace(source, 'piece-')

    expect(disposed).toHaveBeenCalledOnce()
  })
})
