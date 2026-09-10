import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MenuCard } from '@/components/menu-card'
import { KAITEN_PIECES } from '@/lib/kaiten-pieces'
import { formatYen } from '@/lib/yen'

describe('MenuCard', () => {
  it('heads the section so it can be linked and skimmed', () => {
    render(<MenuCard />)
    expect(screen.getByRole('heading', { name: /お品書き|menu/i })).toBeInTheDocument()
  })

  // A price list is a list. Screen readers announce how many items it has,
  // which is exactly what a visitor wants to know here.
  it('marks the prices up as a list', () => {
    render(<MenuCard />)
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(
      KAITEN_PIECES.length,
    )
  })

  // Row by row rather than page-wide: sixteen neta share prices between
  // them, so a bare getByText(formatYen(...)) matches four rows at once and
  // proves nothing about the one being checked.
  it('names and prices every item', () => {
    render(<MenuCard />)
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    for (const [i, item] of KAITEN_PIECES.entries()) {
      const row = within(rows[i])
      expect(row.getByText(item.name)).toBeInTheDocument()
      expect(row.getByText(item.nameJa)).toBeInTheDocument()
      expect(row.getByText(formatYen(item.price))).toBeInTheDocument()
    }
  })

  // The counter serves what the belt carries, and the belt's artwork is
  // what says which neta a row is for.
  it('shows every neta as the picture the belt carries of it', () => {
    const { container } = render(<MenuCard />)
    // next/image rewrites src through the optimiser, which percent-encodes
    // the path it is given.
    const sources = [...container.querySelectorAll('img')].map((img) =>
      decodeURIComponent(img.getAttribute('src') ?? ''),
    )
    for (const item of KAITEN_PIECES) {
      expect(sources.some((src) => src.includes(`/sushi/${item.id}.webp`))).toBe(true)
    }
  })

  // Sixteen readings of "a black cat carrying salmon" is a worse list than
  // none; the row already names the neta in two scripts.
  it('leaves the pictures out of the accessibility tree', () => {
    render(<MenuCard />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('anchors itself so the route can link down to it', () => {
    const { container } = render(<MenuCard />)
    expect(container.querySelector('#menu')).not.toBeNull()
  })
})
