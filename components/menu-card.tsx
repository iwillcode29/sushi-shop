import Image from 'next/image'
import { formatYen, SUSHI_MENU, type MenuItem } from '@/lib/sushi-menu'

/**
 * The price list, in ordinary page flow below the pinned sections.
 *
 * Deliberately not pinned and not scroll-driven: by the time a visitor is
 * reading prices they want to compare them, which means being able to look
 * at two at once and scroll at their own speed rather than having each one
 * handed to them in turn.
 */
export function MenuCard({ items = SUSHI_MENU }: { items?: MenuItem[] }) {
  return (
    <section
      id="menu"
      className="bg-counter text-paper-lit washi-lit scroll-mt-16 px-6 pt-24 pb-24 sm:px-10"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="font-mincho text-center text-[1.6rem] tracking-[0.32em]">お品書き</h2>
        <p className="text-paper-lit/60 mt-4 text-center font-sans text-[0.6rem] tracking-[0.3em] uppercase">
          Tonight&rsquo;s counter · prices per piece
        </p>
        {/*
          The hanko under the heading, the way a list of the day is stamped
          rather than ruled. It needs no reversed print — the stamp's own
          vermilion reads on the counter as it does on paper.
        */}
        <Image
          src="/brand/sushimeow-hanko.webp"
          alt=""
          aria-hidden="true"
          width={107}
          height={170}
          sizes="34px"
          className="stamp mx-auto mt-7 h-auto w-[1.55rem]"
        />

        <ul className="mt-12 grid gap-x-14 gap-y-1 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-paper-lit/10 flex items-center gap-3 border-b py-3.5 last:border-b-0 sm:last:border-b"
            >
              <span
                aria-hidden="true"
                className="size-7 shrink-0 rounded-[7px]"
                style={{ background: `linear-gradient(135deg, ${item.colorA}, ${item.colorB})` }}
              />
              <span className="text-sm font-medium">{item.name}</span>
              <span className="font-mincho text-paper-lit/60 text-xs">{item.nameJa}</span>
              {/*
                The leader is decorative rule, not content: it grows to fill
                whatever gap the two labels leave, which is what carries the
                eye across to the price on a wide row.
              */}
              <span aria-hidden="true" className="bg-paper-lit/12 h-px flex-1" />
              {/* The neta's own colour, from the logo. The gold this used to
                  be belonged to no other part of the brand. */}
              <span className="text-salmon font-sans text-sm tabular-nums">
                {formatYen(item.price)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
