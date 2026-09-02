import { Color, Material, MeshBasicMaterial, MeshStandardMaterial } from 'three'

export type LightingMode = 'unlit' | 'lit'

/**
 * The sushi GLB uses KHR_materials_unlit, so three gives us MeshBasicMaterial
 * and the model ignores every light in the scene. Lit mode rebuilds each
 * material as MeshStandardMaterial so it responds to the environment.
 *
 * Roughness is deliberately mid-range: the textures are baked, so a shiny
 * surface would fight the shading already painted into them.
 */
export const LIT_ROUGHNESS = 0.55
export const LIT_METALNESS = 0

export function toLit(source: Material): MeshStandardMaterial {
  const basic = source as MeshBasicMaterial

  return new MeshStandardMaterial({
    name: `${source.name}__lit`,
    map: basic.map ?? null,
    color: basic.color ? basic.color.clone() : new Color(0xffffff),
    roughness: LIT_ROUGHNESS,
    metalness: LIT_METALNESS,
    transparent: source.transparent,
    opacity: source.opacity,
    side: source.side,
    alphaTest: source.alphaTest,
  })
}

/**
 * Keyed by material uuid so toggling lighting modes reuses the converted
 * materials instead of allocating new ones on every switch.
 */
export class LitMaterialCache {
  private readonly cache = new Map<string, MeshStandardMaterial>()

  get(source: Material): MeshStandardMaterial {
    const existing = this.cache.get(source.uuid)
    if (existing) return existing

    const lit = toLit(source)
    this.cache.set(source.uuid, lit)
    return lit
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose()
    this.cache.clear()
  }
}
