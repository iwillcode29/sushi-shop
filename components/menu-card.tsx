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
      className="scroll-mt-16 bg-[#0d0b0a] px-6 pt-24 pb-32 text-[#f4efe7] sm:px-10"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-semibold tracking-[0.2em]">お品書き</h2>
        <p className="mt-3 text-center text-[0.65rem] tracking-[0.25em] uppercase opacity-50">
          Tonight&rsquo;s counter · prices per piece
        </p>

        <ul className="mt-14 grid gap-x-14 gap-y-1 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 border-b border-white/8 py-3.5 last:border-b-0 sm:last:border-b"
            >
              <span
                aria-hidden="true"
                className="size-7 shrink-0 rounded-[7px]"
                style={{ background: `linear-gradient(135deg, ${item.colorA}, ${item.colorB})` }}
              />
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs opacity-45">{item.nameJa}</span>
              {/*
                The leader is decorative rule, not content: it grows to fill
                whatever gap the two labels leave, which is what carries the
                eye across to the price on a wide row.
              */}
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
              <span className="text-sm tabular-nums text-[#d4a04a]">{formatYen(item.price)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
