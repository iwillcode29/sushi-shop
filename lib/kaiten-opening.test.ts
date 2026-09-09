import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chromeDelay, layDelay, OPENING } from '@/lib/kaiten-opening'
import { WIDE_X, WIDE_Y } from '@/lib/kaiten-projection'

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

describe('layDelay', () => {
  it('lays the pieces down one after another, downstream', () => {
    expect(layDelay(0)).toBeCloseTo(OPENING.firstPiece, 6)
    expect(layDelay(3) - layDelay(2)).toBeCloseTo(OPENING.pieceStep, 6)
  })

  // A stagger nobody can see is only a delay. The strip is seeded a whole
  // sequence to the left of the frame and runs a long way off the right of
  // it; giving those slots their own beats would have stretched the sequence
  // out behind the scenery at both ends.
  it('lays everything off the frame down at once', () => {
    expect(layDelay(-9)).toBe(layDelay(0))
    expect(layDelay(40)).toBe(layDelay(OPENING.lastPiece))
  })

  // The switch is not thrown until every piece the frame can show has at
  // least been started. It may still be settling — that overlap is the point,
  // see OPENING.drive — but nothing appears on a belt already running.
  it('has the whole service on its way down before the switch is thrown', () => {
    expect(layDelay(OPENING.lastPiece)).toBeLessThanOrEqual(OPENING.drive)
  })
})

describe('the opening, against app/globals.css', () => {
  // The machine is pushed into place across itself: `across` units along W,
  // the across-the-belt vector of the route's projection. The stylesheet has
  // to carry that as a pair of page pixels, because a keyframe cannot import
  // one — and a keyframe that drifts off W is a belt sliding in from nowhere
  // in particular.
  it('pushes the machine in along the across-the-belt vector', () => {
    const across = 90
    const from = /@keyframes kaiten-open\s*\{\s*from\s*\{([^}]*)\}/.exec(css)?.[1]

    expect(from).toContain(`translate(${-WIDE_X * across}px, ${-WIDE_Y * across}px)`)
  })

  // Everything the components schedule by hand is in lib/kaiten-opening; the
  // one beat the stylesheet schedules for itself is the shadows under the
  // service, which fade as a group because the group carries the blur.
  it('brings the shadows in with the first piece', () => {
    const cast = /\n\.kaiten-ride-cast\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(cast).toContain(`kaiten-fade 900ms ease-out ${OPENING.firstPiece * 1000}ms backwards`)
  })

  it('hands the open counter straight to anyone who asked for less motion', () => {
    const reduced = [...css.matchAll(/prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
      .map((match) => match[1])
      .join('\n')

    for (const name of ['kaiten-lamp', 'kaiten-open', 'kaiten-lay', 'kaiten-rise']) {
      expect(reduced).toContain(`.${name}`)
    }
  })

  // Every one of these keyframes declares only `from`. That is the contract
  // the whole route's motion keeps: the resting state in the cascade is the
  // finished state, so nothing is left invisible if an animation never runs.
  it('never declares where the opening ends, only where it starts', () => {
    for (const name of ['kaiten-open', 'kaiten-lay', 'kaiten-rise']) {
      const frames = new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? ''
      expect(frames).toContain('from {')
      expect(frames).not.toContain('to {')
    }
  })
})

describe('chromeDelay', () => {
  it('follows the counter rather than arriving with it', () => {
    expect(chromeDelay(0)).toBeGreaterThan(OPENING.drive)
    expect(chromeDelay(2) - chromeDelay(1)).toBeCloseTo(OPENING.chromeStep, 6)
  })
})
