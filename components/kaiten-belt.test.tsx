import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAITEN_GEOMETRY, KaitenBelt } from '@/components/kaiten-belt'

// Resolved off the project root, not import.meta.url: under the jsdom
// environment that is not a file: URL and readFileSync refuses it.
const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

/** The `to` transform and the duration of one named animation. */
function animation(name: string) {
  const frames = new RegExp(`@keyframes ${name}\\s*\\{[^}]*\\{([^}]*)\\}`).exec(css)
  const rule = new RegExp(`animation:\\s*${name}\\s+([\\d.]+)s`).exec(css)
  return { to: frames?.[1].trim(), seconds: Number(rule?.[1]) }
}

// The belt's geometry lives in the component and its motion lives in the
// stylesheet, which cannot import a constant. Everything below is the
// arithmetic that joins them; without it the two drift apart silently and the
// symptom is a belt that slips under its own rollers, or a row of sushi that
// reshuffles once every thirty seconds.
describe('KaitenBelt motion, against app/globals.css', () => {
  const travel = animation('kaiten-travel')
  const roll = animation('kaiten-roll')
  const ride = animation('kaiten-ride')
  const cast = animation('kaiten-ride-cast')

  it('travels exactly one slat pitch per cycle', () => {
    expect(travel.to).toBe(`transform: translateX(${KAITEN_GEOMETRY.slatPitch}px);`)
  })

  it('turns the rollers at the rate the belt runs over them', () => {
    const turnsPerCycle = KAITEN_GEOMETRY.slatPitch / KAITEN_GEOMETRY.rollerTurn
    expect(roll.seconds).toBeCloseTo(travel.seconds / turnsPerCycle, 1)
  })

  it('moves the pieces at the speed of the belt beneath them', () => {
    const cycles = KAITEN_GEOMETRY.rideLoop / KAITEN_GEOMETRY.slatPitch
    expect(ride.seconds).toBeCloseTo(travel.seconds * cycles, 6)
    expect(cast.seconds).toBe(ride.seconds)
  })

  it('climbs the pieces up the same rake the slats run on', () => {
    const { rideLoop, rideRise } = KAITEN_GEOMETRY
    expect(ride.to).toBe(`transform: translate(${rideLoop}px, ${rideRise}px);`)
    // The shadows travel in belt space, where the rake is the parent's job.
    expect(cast.to).toBe(`transform: translateX(${rideLoop}px);`)
  })

  it('stops everything for a visitor who asked for less motion', () => {
    // The stylesheet has more than one of these blocks, so take them all.
    const reduced = [...css.matchAll(/prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
      .map((m) => m[1])
      .join('\n')
    for (const name of ['kaiten-travel', 'kaiten-roll', 'kaiten-ride', 'kaiten-ride-cast']) {
      expect(reduced).toContain(`.${name}`)
    }
  })
})

describe('KaitenBelt', () => {
  it('names itself for anyone who cannot see it', () => {
    const { container } = render(<KaitenBelt />)
    expect(container.querySelector('svg')).toHaveAttribute('role', 'img')
    expect(container.querySelector('svg')).toHaveAccessibleName(/conveyor belt/i)
  })

  // With nothing to press it is a picture of a belt; with pieces that can be
  // taken it is a group holding them, because `img` would make every one of
  // them presentational.
  it('stops being a picture once its pieces are controls', () => {
    const { container } = render(<KaitenBelt onTake={() => {}} />)
    expect(container.querySelector('svg')).toHaveAttribute('role', 'group')
  })

  // Pressing a piece must not move focus onto it: the ring that leaves behind
  // is drawn around the image's box, and on a nigiri that is a rectangle with
  // a piece of sushi in it.
  it('does not take focus when a piece is pressed with a mouse', () => {
    const taken: number[] = []
    const { container } = render(<KaitenBelt onTake={(slot) => taken.push(slot)} />)
    const piece = container.querySelector('.kaiten-piece') as SVGImageElement

    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    piece.dispatchEvent(press)

    expect(press.defaultPrevented).toBe(true)
  })

  it('crops rather than letterboxes, so the belt always leaves the frame', () => {
    const { container } = render(<KaitenBelt />)
    expect(container.querySelector('svg')).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice')
  })

  // The travel animation moves the strip by one pitch and loops. If the strip
  // were ever generated at a different spacing than the 140px in globals.css,
  // the loop would jump — and it would jump identically on every cycle, which
  // is the kind of thing that reads as a rendering bug rather than a mistake.
  it('spaces the slats at exactly the distance the loop travels', () => {
    const { container } = render(<KaitenBelt />)
    const strip = container.querySelector('.kaiten-travel')
    const grooves = [...(strip?.querySelectorAll(':scope > g > rect:first-child') ?? [])]
    const xs = grooves.map((r) => Number(r.getAttribute('x')))

    expect(xs.length).toBeGreaterThan(2)
    const gaps = new Set(xs.slice(1).map((x, i) => x - xs[i]))
    expect(gaps).toEqual(new Set([140]))
  })

  it('overruns the frame at both ends of the belt', () => {
    const { container } = render(<KaitenBelt />)
    const surface = container.querySelector('g[transform^="matrix"] > rect')
    expect(Number(surface?.getAttribute('x'))).toBeLessThan(0)
    expect(Number(surface?.getAttribute('x')) + Number(surface?.getAttribute('width'))).toBeGreaterThan(1400)
  })

  // The pieces travel by eight slots and start over. A jump of one slot would
  // land every piece where its neighbour was, so the loop only closes if the
  // sequence is exactly as long as the jump — and if the strip is seeded a
  // full sequence to the left of the first slot the frame can show.
  it('carries a whole sequence of pieces and repeats on that sequence', () => {
    const { container } = render(<KaitenBelt />)
    const hrefs = [...container.querySelectorAll('.kaiten-ride image')].map((n) =>
      n.getAttribute('href'),
    )
    const distinct = new Set(hrefs)

    expect(distinct.size).toBe(8)
    expect(hrefs.length).toBeGreaterThan(distinct.size * 2)
    for (let i = 0; i + 8 < hrefs.length; i++) {
      expect(hrefs[i + 8]).toBe(hrefs[i])
    }
  })

  it('seeds the strip far enough left that the frame is never short a piece', () => {
    const { container } = render(<KaitenBelt />)
    const xs = [...container.querySelectorAll('.kaiten-ride image')].map((n) =>
      Number(n.getAttribute('x')),
    )
    // Eight slots of 210 is the distance the loop travels; everything inside
    // the frame at the end of a cycle has to have been on the strip at its
    // start.
    expect(Math.min(...xs)).toBeLessThan(-8 * 210)
    expect(Math.max(...xs)).toBeGreaterThan(1400)
  })

  // A piece that has been taken leaves the belt, and so does what it was
  // putting back on it — a shadow with nothing above it is a hole in the
  // illusion the belt is otherwise carrying.
  it('takes a piece and its shadow off the belt together', () => {
    const plain = render(<KaitenBelt />)
    const pieces = plain.container.querySelectorAll('.kaiten-ride image').length
    const shadows = plain.container.querySelectorAll('.kaiten-ride-cast ellipse').length
    plain.unmount()

    const { container } = render(<KaitenBelt taken={new Set([0, 3])} />)

    expect(container.querySelectorAll('.kaiten-ride image')).toHaveLength(pieces - 2)
    expect(container.querySelectorAll('.kaiten-ride-cast ellipse')).toHaveLength(shadows - 2)
  })

  it('gives every piece a shadow that travels with it', () => {
    const { container } = render(<KaitenBelt />)
    const pieces = container.querySelectorAll('.kaiten-ride image')
    const shadows = container.querySelectorAll('.kaiten-ride-cast ellipse')
    expect(shadows.length).toBe(pieces.length)
  })

  // A piece is placed where it touches the belt, not where its box starts, so
  // the bottom edge has to land on the projection of the belt's centre line:
  // page y = -0.22x + 511.4 for a piece at belt x.
  it('stands each piece on the belt rather than over it', () => {
    const { container } = render(<KaitenBelt />)
    for (const n of container.querySelectorAll('.kaiten-ride image')) {
      const x = Number(n.getAttribute('x'))
      const w = Number(n.getAttribute('width'))
      const foot = Number(n.getAttribute('y')) + Number(n.getAttribute('height'))
      const beltX = x + w / 2 - 0.6 * 120
      expect(foot).toBeCloseTo(-0.22 * beltX + 0.72 * 120 + 425, 6)
    }
  })

  // Every mark inside a roller has to be centred on the axle, because the
  // rotation origin comes from the group's bounding box.
  it('centres the roller marks on the axle they turn about', () => {
    const { container } = render(<KaitenBelt />)
    const roll = container.querySelector('.kaiten-roll')
    const spoke = roll?.querySelector('line')

    expect(Number(spoke?.getAttribute('y1'))).toBe(-Number(spoke?.getAttribute('y2')))
    expect(roll?.querySelector('circle')).toHaveAttribute('r', '6')
  })
})
