import { describe, expect, it } from 'vitest'
import { Color, MeshBasicMaterial, MeshStandardMaterial, Texture } from 'three'
import { LIT_METALNESS, LIT_ROUGHNESS, LitMaterialCache, toLit } from '@/lib/materials'

function makeUnlit(name = 'sushiSet'): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    name,
    map: new Texture(),
    color: new Color(0.8, 0.4, 0.2),
    transparent: true,
    opacity: 0.9,
  })
  material.alphaTest = 0.25
  return material
}

describe('toLit', () => {
  it('produces a MeshStandardMaterial', () => {
    expect(toLit(makeUnlit())).toBeInstanceOf(MeshStandardMaterial)
  })

  it('carries the baked texture over unchanged', () => {
    const source = makeUnlit()
    expect(toLit(source).map).toBe(source.map)
  })

  it('applies the project lit constants', () => {
    const lit = toLit(makeUnlit())
    expect(lit.roughness).toBe(LIT_ROUGHNESS)
    expect(lit.metalness).toBe(LIT_METALNESS)
  })

  it('preserves colour and transparency settings', () => {
    const source = makeUnlit()
    const lit = toLit(source)
    expect(lit.color.getHex()).toBe(source.color.getHex())
    expect(lit.transparent).toBe(true)
    expect(lit.opacity).toBe(0.9)
    expect(lit.alphaTest).toBe(0.25)
  })

  it('names the result after its source so it is identifiable in a debugger', () => {
    expect(toLit(makeUnlit('sushis')).name).toBe('sushis__lit')
  })

  it('does not mutate the source material', () => {
    const source = makeUnlit()
    toLit(source)
    expect(source).toBeInstanceOf(MeshBasicMaterial)
    expect(source.name).toBe('sushiSet')
  })
})

describe('LitMaterialCache', () => {
  it('returns the same instance for the same source material', () => {
    const cache = new LitMaterialCache()
    const source = makeUnlit()
    expect(cache.get(source)).toBe(cache.get(source))
  })

  it('returns distinct instances for distinct sources', () => {
    const cache = new LitMaterialCache()
    expect(cache.get(makeUnlit('a'))).not.toBe(cache.get(makeUnlit('b')))
  })

  it('empties itself on dispose so the next get rebuilds', () => {
    const cache = new LitMaterialCache()
    const source = makeUnlit()
    const first = cache.get(source)
    cache.dispose()
    expect(cache.get(source)).not.toBe(first)
  })
})
