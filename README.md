# SUSHIMEOW（鮨 ねこもり）— sushi shop

A two-route demo. `/` is a scroll-driven sequence: an approach to the
shopfront, a low-poly sushi set as glTF on the counter — rendered with
react-three-fiber — then the prices. `/kaiten` is a belt you can take sushi
off, and a till that packs what you took into a box.

## Getting started

```bash
git clone https://github.com/iwillcode29/sushi-shop.git
npm install
npm run dev            # http://localhost:3000
```

The video, HDR and glTF under `public/` are ordinary git blobs, about 17MB
between them. They were tracked in Git LFS for a while; Vercel does not
resolve LFS, so its build shipped the 132-byte pointer stubs as static files
and every asset 404'd in spirit while returning 200. See `.gitattributes`.

| | |
|---|---|
| `npm test` | vitest |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | eslint |
| `npm run build` | production build |

## How the home route works

The whole route is one continuous page scroll. Both animated stages are
`position: sticky` sections whose progress is read from `getBoundingClientRect`
in an animation loop, so nothing on the route captures wheel events — whichever
component called `preventDefault` would win, and the scroll every other stage
depends on would stop arriving.

The intro never plays its video. Scroll position is written straight to
`currentTime`, so the camera walks up to the entrance exactly as fast as the
visitor scrolls. That only stays smooth because the clip is encoded all-intra;
with a long-GOP source, seeking to an arbitrary frame costs a decode from the
previous keyframe and the picture falls behind the scroll. To swap the clip:

```bash
ffmpeg -i input.mp4 -an -c:v libx264 -preset slow -crf 23 -g 1 \
  -pix_fmt yuv420p -movflags +faststart public/video/sushi-counter.mp4
```

`-g 1` makes every frame a keyframe and is the part that matters. Regenerate
the poster alongside it:

```bash
ffmpeg -i public/video/sushi-counter.mp4 -vf scale=1280:-2 -frames:v 1 -q:v 6 \
  public/video/sushi-counter-poster.jpg
```

iOS Safari will not paint a `<video>` that has never begun playback — seeks
complete but nothing renders — so the intro starts the element once and pauses
it immediately, retrying on the first touch for the case where Low Power Mode
refuses autoplay outright.

The mapping from scroll position to what each stage shows lives in pure
functions — `sectionProgress`, `introFrame`, `showcaseFrame` — because the
components read their input from layout geometry, which reports zero under
jsdom and so cannot be asserted on directly.

Visitors who prefer reduced motion get no intro and no camera move, and the
video is never requested.

## How /kaiten works

The scene is one oblique axonometric, `lib/kaiten-projection.ts`, built from
two screen vectors rather than a camera — travel `(1, -0.22)` and width
`(0.6, 0.72)`. Anything lying on the belt is authored as an axis-aligned
shape in belt space and mapped onto the page by a matrix whose columns are
those two vectors, so the slats are plain rects and the belt's travel is a
plain `translateX`. The sushi are the exception: a nigiri put through the
shear is a nigiri lying on its side, so pieces are placed in page space at
the projection of the point they are standing on.

The belt itself is CSS. Two animations, and their durations are not
independent — the strip travels one slat pitch per cycle and a roller is
r=26, so it turns 140/163.4 of a revolution in the same time, which is why
2.8s of travel has to be 3.27s of roll. The stylesheet cannot import those
numbers, so `components/kaiten-belt.test.tsx` reads `app/globals.css` and
checks the arithmetic that joins them.

Taking a piece leaves a hole, and the hole has to be refilled or the belt
runs out. `lib/kaiten-restock.ts` works out when: the row is a CSS animation
with a known timeline, so the moment a given slot is outside the frame is
arithmetic rather than observation, and nobody ever watches a piece of sushi
appear out of nothing.

Settling the bill packs the order into a 折詰 drawn in that same projection,
which is the point of it — a box in its own coordinate system is a card that
appeared over the page. On a portrait viewport the frame's crop is too tight
for the box to land inside it, so the scene pulls back; the belt carries the
same class and the same transform, or the box stops standing on it.

Every keyframe in the packing sequence declares only `from`, and every rule
uses `animation-fill-mode: backwards`. The resting state in the cascade is
the finished state, so a visitor who asked for reduced motion gets the packed
box and the receipt exactly as they end up, without having watched them
arrive — nothing duplicated, nothing left invisible if an animation never
runs.

## Brand

The palette and typography come from the logo, not the other way round: every
colour token in `app/globals.css` was sampled out of `public/brand/` — `paper`
is the print's own stock, `sumi` the ink of its brush strokes, `salmon` the
neta on the cat's back, `shu` the hanko. The artwork is keyed off its paper
into transparent WebP, so it sits on the page without an edge; the page ground
is the same washi, with the fibre drawn by an SVG turbulence tile rather than
shipped as a raster.

The home route is the same brand on a dark ground: the counter is that sumi taken
down rather than a neutral near-black, the fibre is re-emitted as paper
(`.washi-lit`) since sumi speckle over near-black is nothing at all, and the
wordmark is a reversed print — `sushimeow-wordmark-paper.webp` is the same
brush alpha with the pigment swapped for the stock it lands on. The hanko
needs no reversed version; its own vermilion carries on both grounds.

Fraunces carries display type, Archivo the tracked-caps small type. Japanese
is set in the reader's own mincho — a webfont subset for it is megabytes and
every platform here already ships a good one.

## Assets

- Sushi set (`public/models/sushis.glb`) sourced from Sketchfab. Attribution
  and licence terms to be confirmed.
- Logo and brand marks (`public/brand/`, `app/favicon.ico`,
  `app/apple-icon.jpg`, `app/opengraph-image.jpg`) derived from the
  commissioned SUSHIMEOW artwork.
- Sushi pieces on `/kaiten` (`public/sushi/`) cut out of the *asia food icon
  set* by macrovector / Freepik. The set ships an `.eps` and a 4500x4500 `.jpg`
  of the same sheet; these came off the JPEG, matted by flooding the white and
  the printed drop shadow away from the border rather than keying white
  globally, which would punch through the rice. Freepik's free licence
  requires the credit to appear on the site, and it does, at the foot of the
  route.
- Studio HDR (`public/hdr/`) from
  [pmndrs/drei-assets](https://github.com/pmndrs/drei-assets) @ `456060a`,
  vendored rather than fetched from a CDN at runtime.
