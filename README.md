# SUSHIMEOW（鮨 ねこもり）— sushi shop

A two-route demo. `/` presents a low-poly sushi set as glTF, rendered with
react-three-fiber and shown both with its authored unlit materials and with a
converted PBR treatment. `/menu` is a scroll-driven sequence: an approach to
the shopfront, the set on the counter, then the prices.

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

## How /menu works

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

## Brand

The palette and typography come from the logo, not the other way round: every
colour token in `app/globals.css` was sampled out of `public/brand/` — `paper`
is the print's own stock, `sumi` the ink of its brush strokes, `salmon` the
neta on the cat's back, `shu` the hanko. The artwork is keyed off its paper
into transparent WebP, so it sits on the page without an edge; the page ground
is the same washi, with the fibre drawn by an SVG turbulence tile rather than
shipped as a raster.

`/menu` is the same brand on a dark ground: the counter is that sumi taken
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
- Studio HDR (`public/hdr/`) from
  [pmndrs/drei-assets](https://github.com/pmndrs/drei-assets) @ `456060a`,
  vendored rather than fetched from a CDN at runtime.
