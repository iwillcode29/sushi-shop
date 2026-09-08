import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { KaitenOrder } from '@/components/kaiten-order'
import { KAITEN_PIECES } from '@/lib/kaiten-pieces'

const price = (id: string) => KAITEN_PIECES.find((p) => p.id === id)!.price

/** The first piece on the belt whose label names this neta. */
const onBelt = (name: string) => screen.getAllByRole('button', { name: new RegExp(name, 'i') })[0]

const openBill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /order/i }))
  return screen.getByRole('dialog', { name: /お品書き/ })
}

/** The itemised lines, without the total — which reads the same as the only
 *  line when there is only one of them. */
const items = (bill: HTMLElement) => within(within(bill).getByRole('list'))

/**
 * jsdom has no Web Animations API, so a flight there takes the "cannot
 * animate" path and is over before it starts. These tests hand the piece an
 * animation whose ending they control.
 */
function stubAnimations() {
  const flights: { finish: () => void; cancel: () => void; cancelled: boolean }[] = []

  // Defined rather than spied on: jsdom has no `animate` to spy on, and
  // vi.spyOn refuses a property that is not there.
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: () => {
      let settle!: (value: void) => void
      let reject!: (reason: Error) => void
      const finished = new Promise<void>((resolve, no) => {
        settle = resolve
        reject = no
      })
      // The rejection is handled by the component; this keeps the test run
      // from seeing it as unhandled if the component ever stops listening.
      finished.catch(() => {})
      const flight = {
        finish: () => settle(),
        cancel: () => {
          flight.cancelled = true
          reject(new Error('cancelled'))
        },
        cancelled: false,
      }
      flights.push(flight)
      // Only `finished` and `cancel` are read; the rest of Animation is not.
      return { finished, cancel: flight.cancel } as unknown as Animation
    },
  })

  return flights
}

function unstubAnimations() {
  delete (HTMLElement.prototype as { animate?: unknown }).animate
}

describe('KaitenOrder at the till', () => {
  const settle = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /settle/i }))
    return screen.findByRole('img', { name: /bento/i })
  }

  // Nothing to settle is not an error state to explain, it is a button that
  // has no reason to be there yet.
  it('offers nothing to settle until something has been taken', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await openBill(user)

    expect(screen.queryByRole('button', { name: /settle/i })).not.toBeInTheDocument()
  })

  it('packs what was taken into the box', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    await user.click(onBelt('maguro'))
    await user.click(onBelt('ikura'))
    await openBill(user)

    const box = await settle(user)

    expect(box).toHaveAccessibleName(/2 pieces/)
    expect(box.querySelectorAll('image')).toHaveLength(2)
  })

  it('bills the same total on the receipt as it did on the bill', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    await user.click(onBelt('ikura'))
    await user.click(onBelt('ikura'))
    await openBill(user)

    await settle(user)

    expect(screen.getByTestId('receipt-total')).toHaveTextContent(
      `¥${(price('ikura') * 2).toLocaleString('en-US')}`,
    )
  })

  it('closes the belt down while the order is being packed', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    await user.click(onBelt('ebi'))
    await openBill(user)

    await settle(user)

    expect(screen.queryAllByRole('button', { name: /take the/i })).toHaveLength(0)
    // `hidden` takes it out of the accessibility tree, which is the point:
    // the order cannot be added to or reopened while it is being packed.
    expect(screen.queryByRole('button', { name: /order/i })).toBeNull()
  })

  it('starts a fresh order on the way out', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    const stocked = screen.getAllByRole('button', { name: /take the/i }).length
    await user.click(onBelt('tamago'))
    await openBill(user)
    await settle(user)

    await user.click(screen.getByRole('button', { name: 'またどうぞ' }))

    expect(screen.queryByRole('img', { name: /bento/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /order/i })).toHaveTextContent('0')
    expect(screen.getAllByRole('button', { name: /take the/i })).toHaveLength(stocked)
  })
})

describe('KaitenOrder in flight', () => {
  afterEach(unstubAnimations)

  it('shows the piece on its way to the basket', async () => {
    stubAnimations()
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await user.click(onBelt('maguro'))

    expect(document.querySelector('img[src="/sushi/maguro.webp"]')).toBeInTheDocument()
  })

  // The flight's promise rejects when it is cancelled, and cleanup cancels —
  // which under StrictMode's double-invoked effects happens right after the
  // first run. Counting that as an arrival deleted every piece the instant it
  // left the belt, and nothing was ever seen in the air.
  it('keeps the piece in the air when a flight is cancelled rather than finished', async () => {
    const flights = stubAnimations()
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await user.click(onBelt('maguro'))
    // Inside act, so that any state change the cancellation provokes has
    // actually been flushed by the time this asserts nothing changed.
    await act(async () => flights[0].cancel())

    expect(document.querySelector('img[src="/sushi/maguro.webp"]')).toBeInTheDocument()
  })

  it('clears the piece away once it lands', async () => {
    const flights = stubAnimations()
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await user.click(onBelt('maguro'))
    await act(async () => flights[0].finish())

    expect(document.querySelector('img[src="/sushi/maguro.webp"]')).not.toBeInTheDocument()
  })
})

describe('KaitenOrder', () => {
  it('puts the belt on the page', () => {
    render(<KaitenOrder />)
    expect(screen.getByRole('group', { name: /conveyor belt/i })).toBeInTheDocument()
  })

  // `role="img"` makes an element's whole subtree presentational, which on a
  // belt whose pieces are buttons hands a screen reader one picture instead
  // of eighteen controls. jsdom does not apply that rule — these tests went
  // on finding the buttons — so this asserts the role directly.
  it('does not present the belt as a picture while it can be taken from', () => {
    const { container } = render(<KaitenOrder />)
    expect(container.querySelector('svg[role="img"][aria-label*="conveyor"]')).toBeNull()
  })

  it('opens with an empty order and the bill put away', () => {
    render(<KaitenOrder />)
    expect(screen.getByRole('button', { name: /order/i })).toHaveTextContent('0')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('takes a piece off the belt and into the order', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    const before = screen.getAllByRole('button', { name: /take the/i }).length

    await user.click(onBelt('maguro'))

    expect(screen.getByRole('button', { name: /order/i })).toHaveTextContent('1')
    expect(screen.getAllByRole('button', { name: /take the/i })).toHaveLength(before - 1)
  })

  it('takes the piece that was clicked, not one of its twins', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    const taken = onBelt('maguro')

    await user.click(taken)

    // The row carries the sequence more than once over, so the other Maguro
    // slots have to still be there.
    expect(screen.getAllByRole('button', { name: /maguro/i }).length).toBeGreaterThan(0)
  })

  it('bills the piece at the price on its label', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await user.click(onBelt('ikura'))
    const bill = await openBill(user)

    expect(items(bill).getByText('Ikura')).toBeInTheDocument()
    expect(items(bill).getByText(`¥${price('ikura')}`)).toBeInTheDocument()
  })

  it('groups a repeat into one line and totals it', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await user.click(onBelt('tamago'))
    await user.click(onBelt('tamago'))
    const bill = await openBill(user)

    expect(items(bill).getByText('×2')).toBeInTheDocument()
    expect(items(bill).getByText(`¥${price('tamago') * 2}`)).toBeInTheDocument()
  })

  it('adds the lines up', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await user.click(onBelt('ikura'))
    await user.click(onBelt('tamago'))
    const bill = await openBill(user)
    const total = price('ikura') + price('tamago')

    expect(within(bill).getByTestId('bill-total')).toHaveTextContent(
      `¥${total.toLocaleString('en-US')}`,
    )
  })

  it('puts the bill away again', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)
    await user.click(onBelt('ebi'))

    await openBill(user)
    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('puts the bill away on Escape', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    await openBill(user)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // The bill is the only place a taken piece can be seen, so it has to be
  // reachable before anything is in it — otherwise the count on the button is
  // the only feedback there is and it cannot be inspected.
  it('opens the bill even when nothing has been taken', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    const bill = await openBill(user)

    expect(within(bill).getByText(/nothing/i)).toBeInTheDocument()
  })

  it('takes a piece from the keyboard', async () => {
    const user = userEvent.setup()
    render(<KaitenOrder />)

    onBelt('sake').focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: /order/i })).toHaveTextContent('1')
  })
})
