import Image from 'next/image'
import Link from 'next/link'
import { PreloadModel } from '@/components/preload-model'
import { StageLoader } from '@/components/stage-loader'

const MODEL_FACTS: [string, string][] = [
  ['Geometry', '2 meshes, low-poly, no animation tracks'],
  ['Materials', '2 materials — sushiSet and sushis'],
  ['Textures', '2 baked PNG maps'],
  ['Extension', 'KHR_materials_unlit — the model ignores scene lights'],
  ['File', 'glTF 2.0 binary, 1.4 MB'],
]

/** The three that are the actual subject get the neta's colour; the rest are
 *  scaffolding and are set in outline. Not an alternating pattern — the
 *  emphasis says which of these the page is about. */
const STACK = [
  'Next.js 16 · App Router',
  'react-three-fiber 9',
  'drei 10',
  'three.js 0.185',
  'TypeScript',
  'Tailwind CSS 4',
]
const SUBJECT = /three|drei/i

export default function Home() {
  return (
    <main>
      <PreloadModel href="/models/sushis.glb" />

      <section className="relative h-[90dvh] w-full overflow-hidden sm:h-dvh">
        <StageLoader />

        {/*
          Server-rendered so the brand and the headline are present in the
          initial HTML, and so the wordmark's own <link rel=preload> is in
          the first response — it is the largest thing on the page (LCP
          budget). HeroOverlay, which owns the interactive toggle, is loaded
          client-only and renders beneath this in paint order — the top
          padding here is offset to clear its "Sushimeow / Menu / About" nav
          row instead of sitting flush under it. The block sits at the top,
          not the bottom: the model is centred (via Bounds, in stage.tsx)
          with enough margin to leave a clear band at the top of the frame
          for exactly this text, so the brand and the model's silhouette do
          not compete for the same space.

          The composition is the print's own: the brush wordmark arcs over
          the piece of nigiri. Here the nigiri underneath it happens to be
          live geometry.
        */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center gap-3 px-6 pt-14 sm:pt-16">
          <div className="relative w-full max-w-[min(21rem,66vw)]">
            <Image
              src="/brand/sushimeow-wordmark.webp"
              alt="Sushimeow"
              width={763}
              height={290}
              preload
              sizes="(max-width: 640px) 66vw, 21rem"
              className="h-auto w-full"
            />
            {/*
              The hanko sits where the press put it, off the wordmark's
              right shoulder, and off-square — see .stamp in globals.css.
            */}
            <Image
              src="/brand/sushimeow-hanko.webp"
              alt=""
              aria-hidden="true"
              width={107}
              height={170}
              sizes="72px"
              className="stamp absolute top-[4%] -right-[7%] h-auto w-[8%] min-w-6"
            />
          </div>

          <p className="font-display text-sumi/85 text-[clamp(0.8rem,2.1vw,1.05rem)] font-bold tracking-[0.05em]">
            Authentic <span className="text-shu px-0.5">•</span> Japanese{' '}
            <span className="text-shu px-0.5">•</span> Fresh
          </p>

          {/*
            The headline is set as the print sets its small type: a rule on
            either side of tracked caps. It is still the h1 — hierarchy here
            is the brand's job, and the wordmark above is doing it.
          */}
          <div className="flex w-full max-w-sm items-center gap-3">
            <span aria-hidden="true" className="bg-sumi/20 h-px flex-1" />
            <h1 className="text-shu font-sans text-[0.58rem] font-medium tracking-[0.3em] whitespace-nowrap uppercase">
              Handcrafted in WebGL
            </h1>
            <span aria-hidden="true" className="bg-sumi/20 h-px flex-1" />
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-16 px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="font-mincho text-shu text-[0.7rem] tracking-[0.45em]">お品書きの前に</p>
            <h2 className="font-display text-title mt-3 font-black tracking-[-0.015em]">
              About the model
            </h2>
            <p className="text-lede text-sumi/80 mt-6 max-w-prose leading-[1.8]">
              A low-poly sushi set loaded as glTF. It ships with unlit materials, which means no
              amount of scene lighting will shade it. Rather than work around that, the page
              leans into it: the default view is the artist&rsquo;s intent, and the toggle
              rebuilds every material as a standard PBR surface so the same geometry can catch
              the studio environment instead. The floor and its contact shadow are lit in both
              modes — that is what keeps the sushi from looking like a sticker.
            </p>

            <hr className="rule mt-10" />

            <dl className="divide-sumi/12 divide-y">
              {MODEL_FACTS.map(([label, value]) => (
                <div key={label} className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-6">
                  <dt className="text-sumi-soft font-sans text-[0.58rem] tracking-[0.26em] uppercase sm:pt-1">
                    {label}
                  </dt>
                  <dd className="text-sm leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/*
            The cat, given its own paper. It is the same keyed print as the
            wordmark above, so it sits on the page without an edge — no
            frame, no card, nothing containing it.
          */}
          <figure className="relative self-start lg:pt-14">
            <Image
              src="/brand/sushimeow-cat.webp"
              alt="A black cat wearing a hachimaki, carrying a slice of salmon nigiri on its back"
              width={709}
              height={518}
              sizes="(max-width: 1024px) 88vw, 40vw"
              className="h-auto w-full"
            />
            <Image
              src="/brand/sushimeow-hanko.webp"
              alt=""
              aria-hidden="true"
              width={107}
              height={170}
              sizes="56px"
              className="stamp-alt absolute right-[2%] -bottom-4 h-auto w-[7%] min-w-7"
            />
            <figcaption className="text-sumi-soft mt-6 font-sans text-[0.58rem] tracking-[0.28em] uppercase">
              Woodblock, ink and salmon on washi
            </figcaption>
          </figure>
        </div>
      </section>

      {/*
        A recessed band. The page has run on one paper tone for two screens
        by this point; dropping the ground a shade is what stops the last
        two blocks reading as more of the same section.
      */}
      <section className="border-sumi/12 bg-paper-deep/40 washi border-y px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-14 sm:grid-cols-[1.15fr_0.85fr] sm:gap-16">
          <div>
            <h2 className="font-display text-xl font-black tracking-[-0.01em] sm:text-2xl">
              Built with
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {STACK.map((item) => (
                <li
                  key={item}
                  className={
                    SUBJECT.test(item)
                      ? 'border-salmon-deep/45 bg-salmon/20 text-sumi rounded-full border px-3 py-1.5 font-sans text-[0.62rem] tracking-[0.14em] uppercase'
                      : 'border-sumi/20 text-sumi-soft rounded-full border px-3 py-1.5 font-sans text-[0.62rem] tracking-[0.14em] uppercase'
                  }
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-black tracking-[-0.01em] sm:text-2xl">
              Credit
            </h2>
            <p className="text-sumi/75 mt-6 max-w-prose text-sm leading-[1.8]">
              Sushi set model sourced from Sketchfab. Attribution and licence terms to be
              confirmed before this page is published.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 pt-14 pb-16 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {/*
              The whole cat, not a crop of its head: the leaping silhouette
              is what survives being 60px tall — a crop reads as a torn
              thumbnail at this size.
            */}
            <Image
              src="/brand/sushimeow-cat.webp"
              alt=""
              aria-hidden="true"
              width={709}
              height={518}
              sizes="96px"
              className="h-auto w-24"
            />
            <div>
              <p className="font-display text-lg leading-none font-black tracking-[0.06em]">
                SUSHIMEOW
              </p>
              <p className="font-mincho text-sumi-soft mt-2 text-xs tracking-[0.34em]">
                鮨 ねこもり
              </p>
            </div>
          </div>

          <Link
            href="/menu"
            className="text-shu decoration-shu/40 group font-sans text-[0.6rem] tracking-[0.3em] uppercase underline-offset-[6px] hover:underline"
          >
            Tonight&rsquo;s counter{' '}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </footer>
    </main>
  )
}
