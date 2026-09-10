import { describe, expect, it } from 'vitest'
import { formatYen } from '@/lib/yen'

describe('formatYen', () => {
  it('prefixes the yen sign', () => {
    expect(formatYen(320)).toBe('¥320')
  })

  it('groups thousands', () => {
    expect(formatYen(1200)).toBe('¥1,200')
  })

  it('formats zero without a sign of its own', () => {
    expect(formatYen(0)).toBe('¥0')
  })
})
