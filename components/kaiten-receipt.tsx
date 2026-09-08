'use client'

import Image from 'next/image'
import { useMemo } from 'react'
import { type CartLine, cartCount } from '@/lib/cart'
import { formatYen } from '@/lib/sushi-menu'

/*
  レシート.

  The one thing in this scene that is not in the belt's projection, and
  deliberately: the box is on the counter and this is in your hand. Sheared
  type would also be unreadable, which is the practical half of the same
  answer.

  The torn edges are drawn rather than faked with a dashed border — a till
  receipt is torn off a roll at both ends, and the tear is the detail that
  says what kind of paper this is.
*/

/** A tear across the strip: pseudo-random, but the same every render. */
function tornEdge(down: boolean): string {
  const teeth = 34
  const points: string[] = []
  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100
    // A fixed wobble rather than Math.random: a tear that redraws itself on
    // every render is a tear nobody believes.
    const wobble = (Math.sin(i * 2.7) + Math.sin(i * 5.1) * 0.6) * 1.9
    points.push(`${x},${(down ? 5.5 : 2.5) + (down ? wobble : -wobble)}`)
  }
  return down
    ? `M0,0 L100,0 L100,4 ${points.map((p) => `L${p}`).join(' ')} L0,4 Z`
    : `M0,8 L100,8 L100,4 ${points.map((p) => `L${p}`).join(' ')} L0,4 Z`
}

export interface KaitenReceiptProps {
  lines: CartLine[]
  total: number
  /** Seconds to wait before it unrolls, and before the seal comes down. */
  at: { receipt: number; hanko: number }
}

export function KaitenReceipt({ lines, total, at }: KaitenReceiptProps) {
  /*
    Read at render, not in an effect, and safe here for a reason worth
    stating: this component is only ever mounted after someone has settled a
    bill, so its first render is always in the browser. It is never in the
    server's HTML, so there is no server-rendered time for a client-rendered
    one to disagree with.
  */
  const served = useMemo(
    () =>
      new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  )

  const count = cartCount(lines.flatMap((line) => Array(line.quantity).fill(line.piece.id)))

  return (
    <div
      /* Beside the box on a wide screen, below it on a tall one: the camera
         has pulled the box up into the top of the frame, and this is what
         goes in the room that leaves. */
      className="kaiten-receipt pointer-events-none absolute top-1/2 right-[clamp(1rem,6vw,5rem)] w-[clamp(15rem,23vw,19rem)] -translate-y-1/2 rotate-[-1.6deg] portrait:top-[47%] portrait:right-auto portrait:left-1/2 portrait:w-[min(17rem,82vw)] portrait:-translate-x-1/2 portrait:translate-y-0"
      style={{ animationDelay: `${at.receipt}s` }}
    >
      <Tear down />

      <div className="bg-paper-lit washi text-sumi px-7 pt-6 pb-8 shadow-[0_18px_44px_-26px_rgba(44,49,35,0.6)]">
        <div className="kaiten-receipt-line" style={{ animationDelay: `${at.receipt + 0.1}s` }}>
          <p className="font-mincho text-[1.05rem] leading-none">鮨 ねこもり</p>
          <p className="text-sumi-soft mt-2 font-sans text-[0.5rem] tracking-[0.32em] uppercase">
            Kaiten counter · Ginza
          </p>
        </div>

        <hr
          className="rule kaiten-receipt-line my-5"
          style={{ animationDelay: `${at.receipt + 0.16}s` }}
        />

        <ul className="flex flex-col gap-2.5">
          {lines.map((line, index) => (
            <li
              key={line.piece.id}
              className="kaiten-receipt-line flex items-baseline gap-2"
              style={{ animationDelay: `${at.receipt + 0.22 + index * 0.07}s` }}
            >
              <span className="font-sans text-[0.72rem]">{line.piece.name}</span>
              <span className="font-mincho text-sumi-soft text-[0.62rem]">{line.piece.nameJa}</span>
              <span className="text-sumi-soft font-sans text-[0.6rem] tabular-nums">
                ×{line.quantity}
              </span>
              <span className="border-sumi/15 mx-1 grow border-b border-dotted" />
              <span className="font-sans text-[0.7rem] tabular-nums">
                {formatYen(line.piece.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <hr
          className="rule kaiten-receipt-line my-5"
          style={{ animationDelay: `${at.receipt + 0.3 + lines.length * 0.07}s` }}
        />

        <div
          className="kaiten-receipt-line flex items-baseline justify-between"
          style={{ animationDelay: `${at.receipt + 0.36 + lines.length * 0.07}s` }}
        >
          <span className="font-mincho text-[0.85rem]">
            計 <span className="text-sumi-soft text-[0.6rem]">{count}貫</span>
          </span>
          <span
            className="text-shu font-sans text-[1.05rem] tabular-nums"
            data-testid="receipt-total"
          >
            {formatYen(total)}
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <p
            className="kaiten-receipt-line text-sumi-soft font-sans text-[0.5rem] leading-[1.7] tracking-[0.16em]"
            style={{ animationDelay: `${at.receipt + 0.44 + lines.length * 0.07}s` }}
          >
            内税
            <br />
            {served ?? ' '}
          </p>

          {/* The seal comes down last, and it is the shop's own — the same
              hanko that sits in the corner of the print. */}
          <span className="kaiten-hanko block" style={{ animationDelay: `${at.hanko}s` }}>
            <Image
              src="/brand/sushimeow-hanko.webp"
              alt="Sealed"
              width={107}
              height={170}
              className="h-[4.1rem] w-auto"
            />
          </span>
        </div>
      </div>

      <Tear />
    </div>
  )
}

function Tear({ down = false }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="block h-2 w-full"
    >
      <path d={tornEdge(down)} fill="var(--color-paper-lit)" />
    </svg>
  )
}
