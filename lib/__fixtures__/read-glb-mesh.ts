import { readFileSync } from 'node:fs'
import { BufferAttribute, BufferGeometry } from 'three'

/**
 * Reads one mesh's geometry straight out of a .glb, for tests that need to
 * assert against the real asset.
 *
 * three's own GLTFLoader is not usable here: under jsdom it never settles,
 * because parsing a GLB also kicks off texture decoding that the environment
 * cannot complete. This reads only the accessors a geometry needs, so no
 * image ever has to be decoded. It supports exactly the shapes the project's
 * asset uses and throws on anything else rather than reading garbage.
 */

const FLOAT = 5126
const UNSIGNED_SHORT = 5123
const UNSIGNED_INT = 5125

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
const BYTES: Record<number, number> = { [FLOAT]: 4, [UNSIGNED_SHORT]: 2, [UNSIGNED_INT]: 4 }

type Gltf = {
  meshes: { primitives: { attributes: Record<string, number>; indices?: number; material?: number }[] }[]
  materials?: { name?: string }[]
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string }[]
  bufferViews: { byteOffset?: number; byteStride?: number }[]
}

export function readGlbGeometryByMaterial(path: string, materialName: string): BufferGeometry {
  const file = readFileSync(path)
  if (file.toString('utf8', 0, 4) !== 'glTF') throw new Error(`${path} is not a .glb`)

  const jsonLength = file.readUInt32LE(12)
  const json = JSON.parse(file.toString('utf8', 20, 20 + jsonLength)) as Gltf
  // JSON chunk header (12 bytes of file header + 8 of chunk header), then the
  // BIN chunk's own 8-byte header.
  const binaryStart = 20 + jsonLength + 8

  const primitive = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .find((candidate) => json.materials?.[candidate.material ?? -1]?.name === materialName)
  if (!primitive) throw new Error(`no primitive uses material "${materialName}" in ${path}`)

  const read = (accessorIndex: number) => {
    const accessor = json.accessors[accessorIndex]
    const view = json.bufferViews[accessor.bufferView]
    const itemSize = COMPONENTS[accessor.type]
    const byteSize = BYTES[accessor.componentType]
    if (!itemSize || !byteSize) {
      throw new Error(`unsupported accessor: ${accessor.type}/${accessor.componentType}`)
    }
    const stride = view.byteStride || itemSize * byteSize
    const start = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)

    const values = new Float32Array(accessor.count * itemSize)
    for (let i = 0; i < accessor.count; i++) {
      for (let component = 0; component < itemSize; component++) {
        const at = start + i * stride + component * byteSize
        values[i * itemSize + component] =
          accessor.componentType === FLOAT
            ? file.readFloatLE(at)
            : accessor.componentType === UNSIGNED_SHORT
              ? file.readUInt16LE(at)
              : file.readUInt32LE(at)
      }
    }
    return { values, itemSize }
  }

  const geometry = new BufferGeometry()
  for (const [name, accessorIndex] of Object.entries(primitive.attributes)) {
    const key = name === 'TEXCOORD_0' ? 'uv' : name.toLowerCase()
    const { values, itemSize } = read(accessorIndex)
    geometry.setAttribute(key, new BufferAttribute(values, itemSize))
  }
  if (primitive.indices !== undefined) {
    geometry.setIndex([...read(primitive.indices).values])
  }
  return geometry
}
