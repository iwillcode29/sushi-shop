import { StageLoader } from '@/components/stage-loader'

const MODEL_FACTS: [string, string][] = [
  ['Geometry', '2 meshes, low-poly, no animation tracks'],
  ['Materials', '2 materials — sushiSet and sushis'],
  ['Textures', '2 baked PNG maps'],
  ['Extension', 'KHR_materials_unlit — the model ignores scene lights'],
  ['File', 'glTF 2.0 binary, 1.4 MB'],
]

const STACK = [
  'Next.js 16 · App Router',
  'react-three-fiber 9',
  'drei 10',
  'three.js 0.185',
  'TypeScript',
  'Tailwind CSS 4',
]

export default function Home() {
  return (
    <main>
      <section className="relative h-[90dvh] w-full overflow-hidden sm:h-dvh">
        <StageLoader />
      </section>

      <section id="about" className="mx-auto max-w-3xl scroll-mt-16 px-6 py-24 sm:py-32">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">About the model</h2>
        <p className="mt-4 max-w-prose text-sm leading-relaxed opacity-70">
          The asset ships with unlit materials, which means no amount of scene lighting will
          shade it. Rather than work around that, the page leans into it: the default view is
          the artist&rsquo;s intent, and the toggle rebuilds every material as a standard PBR
          surface so the same geometry can catch the studio environment instead. The floor and
          its contact shadow are lit in both modes — that is what keeps the sushi from looking
          like a sticker.
        </p>

        <dl className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-[10rem_1fr]">
          {MODEL_FACTS.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-xs tracking-[0.18em] uppercase opacity-50">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-20 text-2xl font-semibold tracking-tight sm:text-3xl">Built with</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {STACK.map((item) => (
            <li
              key={item}
              className="rounded-full border border-black/15 px-3 py-1.5 text-xs tracking-wide"
            >
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-20 text-2xl font-semibold tracking-tight sm:text-3xl">Credit</h2>
        <p className="mt-4 max-w-prose text-sm leading-relaxed opacity-70">
          Sushi set model sourced from Sketchfab. Attribution and licence terms to be confirmed
          before this page is published.
        </p>
      </section>
    </main>
  )
}
