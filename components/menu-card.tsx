import Image from 'next/image'
import { KAITEN_PIECES, type KaitenPiece } from '@/lib/kaiten-pieces'
import { formatYen } from '@/lib/yen'

/**
 * The price list, in ordinary page flow below the pinned sections.
 *
 * Deliberately not pinned and not scroll-driven: by the time a visitor is
 * reading prices they want to compare them, which means being able to look
 * at two at once and scroll at their own speed rather than having each one
 * handed to them in turn.
 *
 * Each neta is shown as the artwork the belt carries — a cat with the piece
 * on its back — served on a dish. It used to be a two-stop gradient sampled
 * off the cut of fish, which was standing in for a picture the site already
 * had. The dish is not decoration: the cats are black and this section is
 * counter-dark, so paper has to go underneath them somewhere (see
 * .neta-plate in app/globals.css).
 */
export function MenuCard({ items = KAITEN_PIECES }: { items?: KaitenPiece[] }) {
  return (
    <section
      id="menu"
      className="bg-counter text-paper-lit washi-lit counter-pool relative isolate scroll-mt-16 px-6 pt-24 pb-24 sm:px-10"
    >
      <div className="relative mx-auto max-w-3xl">
        <h2 className="font-mincho text-center text-[1.6rem] tracking-[0.32em]">お品書き</h2>
        <p className="text-paper-lit/60 mt-4 text-center font-sans text-[0.6rem] tracking-[0.3em] uppercase">
          Sixteen neta · each on its own cat · priced by the piece
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

        <ul className="mt-14 grid gap-x-12 gap-y-1 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-paper-lit/8 flex items-end gap-4 border-b py-3 last:border-b-0 sm:last:border-b"
            >
              {/*
                The picture carries no information the row does not already
                give in two scripts and a price, and sixteen readings of "a
                black cat carrying salmon" is a worse list than none. The
                joke is put into the standfirst above instead, where every
                reader gets it once.
              */}
              <span aria-hidden="true" className="neta-dish">
                <span className="neta-plate" />
                <Image
                  src={`/sushi/${item.id}.webp`}
                  alt=""
                  width={item.w}
                  height={item.h}
                  sizes="(max-width: 640px) 60px, 76px"
                  className="neta-cat"
                />
              </span>

              <span className="min-w-0 flex-1 pb-1.5">
                <span className="flex items-baseline gap-3">
                  <span className="font-display text-[1.05rem] leading-none font-semibold">
                    {item.name}
                  </span>
                  {/*
                    The leader is decorative rule, not content: it grows to
                    fill whatever gap the name and the price leave, which is
                    what carries the eye across a wide row.
                  */}
                  <span aria-hidden="true" className="bg-paper-lit/12 h-px flex-1" />
                  {/* The neta's own colour, from the logo. The gold this
                      used to be belonged to no other part of the brand. */}
                  <span className="text-salmon font-sans text-sm tabular-nums">
                    {formatYen(item.price)}
                  </span>
                </span>
                <span className="font-mincho text-paper-lit/55 mt-1.5 block text-xs tracking-[0.14em]">
                  {item.nameJa}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
