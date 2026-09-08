import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MenuCard } from '@/components/menu-card'
import { formatYen, SUSHI_MENU } from '@/lib/sushi-menu'

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
      SUSHI_MENU.length,
    )
  })

  it('names and prices every item', () => {
    render(<MenuCard />)
    for (const item of SUSHI_MENU) {
      expect(screen.getByText(item.name)).toBeInTheDocument()
      expect(screen.getByText(item.nameJa)).toBeInTheDocument()
      expect(screen.getByText(formatYen(item.price))).toBeInTheDocument()
    }
  })

  it('anchors itself so the route can link down to it', () => {
    const { container } = render(<MenuCard />)
    expect(container.querySelector('#menu')).not.toBeNull()
  })
})
