import { BufferAttribute, BufferGeometry, Mesh, type InterleavedBufferAttribute } from 'three'

type Attribute = BufferAttribute | InterleavedBufferAttribute

/**
 * Swaps a mesh out for one mesh per piece of its geometry, so the pieces can be
 * moved independently. The pieces take the slot the source held in its parent.
 */
export function splitMeshInPlace(mesh: Mesh, namePrefix: string): Mesh[] {
  const { parent } = mesh
  if (!parent) throw new Error('splitMeshInPlace needs a mesh that is in a scene graph')

  const pieces = splitIntoPieces(mesh.geometry).map((geometry, index) => {
    const piece = new Mesh(geometry, mesh.material)
    piece.name = `${namePrefix}${index}`
    piece.position.copy(mesh.position)
    piece.quaternion.copy(mesh.quaternion)
    piece.scale.copy(mesh.scale)
    piece.castShadow = mesh.castShadow
    piece.receiveShadow = mesh.receiveShadow
    return piece
  })

  const slot = parent.children.indexOf(mesh)
  parent.remove(mesh)
  parent.add(...pieces)

  // add() appends. Move the pieces into the slot the source held, so callers
  // that index into the parent's children see no reshuffle.
  const appended = parent.children.splice(parent.children.length - pieces.length, pieces.length)
  parent.children.splice(slot, 0, ...appended)

  // Nothing references the source geometry now. The material is deliberately
  // left alone: the pieces still share it.
  mesh.geometry.dispose()

  return pieces
}

/**
 * Splits a geometry into one geometry per visually separate piece.
 *
 * A piece is a set of connected triangles, so the split is a connected-component
 * pass over the index buffer.
 */
export function splitIntoPieces(geometry: BufferGeometry): BufferGeometry[] {
  const vertexCount = geometry.attributes.position.count
  // A geometry with no index still has triangles — each run of three vertices
  // is one — so give it the index it implies rather than refusing to split it.
  const index =
    geometry.getIndex() ??
    new BufferAttribute(Uint32Array.from({ length: vertexCount }, (_, i) => i), 1)

  const parent = new Int32Array(vertexCount)
  for (let i = 0; i < parent.length; i++) parent[i] = i

  const find = (i: number): number => {
    let root = i
    while (parent[root] !== root) root = parent[root]
    while (parent[i] !== root) {
      const next = parent[i]
      parent[i] = root
      i = next
    }
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }

  const triangleCount = index.count / 3
  for (let t = 0; t < triangleCount; t++) {
    const a = index.getX(t * 3)
    const b = index.getX(t * 3 + 1)
    const c = index.getX(t * 3 + 2)
    union(a, b)
    union(a, c)
  }

  const trianglesByRoot = new Map<number, number[]>()
  for (let t = 0; t < triangleCount; t++) {
    const root = find(index.getX(t * 3))
    const bucket = trianglesByRoot.get(root)
    if (bucket) bucket.push(t)
    else trianglesByRoot.set(root, [t])
  }

  const islands = [...trianglesByRoot.values()]
  return mergeOverlapping(geometry, index, islands).map((triangles) =>
    subGeometry(geometry, index, triangles),
  )
}

type Footprint = { minX: number; maxX: number; minZ: number; maxZ: number }

/**
 * Joins islands that occupy the same ground area. A sushi's rice and its
 * topping are separate connected components — nothing welds them — yet they sit
 * one above the other and have to move as a unit. Overlap is measured on XZ
 * only, so two pieces standing side by side stay apart even though their
 * heights overlap completely.
 */
function mergeOverlapping(
  geometry: BufferGeometry,
  index: Attribute,
  islands: number[][],
): number[][] {
  const position = geometry.attributes.position as Attribute
  const footprints = islands.map((triangles) => footprintOf(position, index, triangles))

  const parent = islands.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }

  for (let a = 0; a < islands.length; a++) {
    for (let b = a + 1; b < islands.length; b++) {
      if (!overlaps(footprints[a], footprints[b])) continue
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) parent[rb] = ra
    }
  }

  // Keyed by root and filled in island order, so the output order stays
  // deterministic: pieces come out ordered by their first triangle.
  const byRoot = new Map<number, number[]>()
  islands.forEach((triangles, i) => {
    const root = find(i)
    const bucket = byRoot.get(root)
    if (bucket) bucket.push(...triangles)
    else byRoot.set(root, [...triangles])
  })
  return [...byRoot.values()]
}

function footprintOf(position: Attribute, index: Attribute, triangles: number[]): Footprint {
  const footprint: Footprint = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  }
  for (const t of triangles) {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index.getX(t * 3 + corner)
      const x = position.getX(vertex)
      const z = position.getZ(vertex)
      if (x < footprint.minX) footprint.minX = x
      if (x > footprint.maxX) footprint.maxX = x
      if (z < footprint.minZ) footprint.minZ = z
      if (z > footprint.maxZ) footprint.maxZ = z
    }
  }
  return footprint
}

function overlaps(a: Footprint, b: Footprint): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minZ <= b.maxZ && b.minZ <= a.maxZ
}

/** Copies the given triangles into a new geometry with a compacted vertex buffer. */
function subGeometry(
  source: BufferGeometry,
  index: Attribute,
  triangles: number[],
): BufferGeometry {
  const remapped = new Map<number, number>()
  const kept: number[] = []
  const newIndex: number[] = []

  for (const t of triangles) {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index.getX(t * 3 + corner)
      let mapped = remapped.get(vertex)
      if (mapped === undefined) {
        mapped = kept.length
        remapped.set(vertex, mapped)
        kept.push(vertex)
      }
      newIndex.push(mapped)
    }
  }

  const geometry = new BufferGeometry()
  for (const [name, attribute] of Object.entries(source.attributes)) {
    geometry.setAttribute(name, sliceAttribute(attribute as Attribute, kept))
  }
  geometry.setIndex(newIndex)
  return geometry
}

function sliceAttribute(attribute: Attribute, kept: number[]): BufferAttribute {
  const { itemSize } = attribute
  const values = new Float32Array(kept.length * itemSize)
  for (let i = 0; i < kept.length; i++) {
    for (let component = 0; component < itemSize; component++) {
      values[i * itemSize + component] = attribute.getComponent(kept[i], component)
    }
  }
  return new BufferAttribute(values, itemSize, attribute.normalized)
}
