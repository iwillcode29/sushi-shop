# Sushi GLB Landing Page — Design

**Date:** 2026-09-02
**Status:** Approved (design), pending implementation plan
**Path:** Architectural (new project)

## Purpose

A portfolio landing page whose job is to demonstrate 3D/WebGL competence. A
stylized low-poly sushi set is displayed as the centerpiece: full-viewport,
freely orbitable, auto-rotating when idle. Success means a visitor
immediately understands that the author can integrate, light, ground, and
tune a real 3D asset on the web — not merely embed a stock viewer.

Non-goals: selling sushi, a restaurant site, a general-purpose model viewer,
or a 3D playground with an editor-style control surface.

## Asset

Source file: `/Users/nack/Downloads/sushis.glb` → copied to
`public/models/sushis.glb`.

Inspected contents (glTF 2.0 binary, JSON chunk parsed 2026-09-02):

| Property | Value |
| --- | --- |
| Generator | Sketchfab 17.20.0 |
| Size | 1.4 MB |
| Nodes | 6 (`Sketchfab_model` → `root` → `GLTF_SceneRootNode` → `sushisSetwithSushis_0` → `Object_4`, `Object_5`) |
| Meshes | 2 (`Object_0`, `Object_1`) |
| Materials | 2 (`sushiSet`, `sushis`) |
| Textures | 2, both `image/png`, baked |
| Animations | 0 |
| Extensions used | `KHR_materials_unlit` |

Two consequences drive the whole scene design:

1. **The model does not receive light.** `KHR_materials_unlit` makes the
   loader produce `MeshBasicMaterial`. Adding lights changes nothing on the
   model itself.
2. **There is no animation track.** All motion must come from camera and
   controls.

The asset's license must be confirmed before any public deploy. Sketchfab
provenance implies attribution is likely required; the About section carries
the credit line.

## Architecture

```
sushi/
  app/
    layout.tsx            metadata, font, global styles
    page.tsx              server component; static copy + dynamic <Stage/>
  components/
    stage.tsx             'use client' — owns lighting state; <Canvas> + overlay
    sushi-model.tsx       useGLTF load, applies the active material mode
    scene-env.tsx         Environment, lights, ContactShadows, floor plane
    loader.tsx            progress overlay driven by useProgress
    hero-overlay.tsx      DOM title, subline, rotate hint, lighting toggle
    fallback-poster.tsx   static image shown when WebGL is unavailable
  lib/
    materials.ts          unlit ↔ MeshStandardMaterial conversion
  public/
    models/sushis.glb
    poster.png            single pre-rendered still for the fallback
```

**Unit boundaries.** `stage.tsx` is the client boundary and the only stateful
component: it owns the lighting mode and renders both the `<Canvas>` and the
DOM overlay, since the two must share that state. `sushi-model` owns the asset
and its materials.
`scene-env` owns everything about light and grounding. They are separated
because material work and lighting work change for different reasons and at
different rates; keeping them apart means a lighting change cannot break
model loading. `lib/materials.ts` is pure — it takes a material and returns a
material — so it is unit-testable without a renderer. `hero-overlay` is
plain DOM and knows nothing about Three.js; it receives the lighting mode and
a setter as props.

**Stack:** Next.js 15 (App Router), React, `@react-three/fiber`,
`@react-three/drei`, TypeScript, Tailwind CSS.

## 3D scene

**Material — dual mode.** A single `'unlit' | 'lit'` state, owned by
`stage.tsx` — the outermost client component — and passed down to both
`sushi-model` and `hero-overlay`. `page.tsx` stays a server component and
holds only the static below-the-fold copy; it cannot hold this state.

- `unlit` (default): the materials as authored. Crisp, stylized, faithful to
  the artist's intent. Grounding comes from `ContactShadows` plus a separate
  floor plane that *does* receive light, so the model reads as sitting on a
  surface even though it is not shaded.
- `lit`: each material is cloned into `MeshStandardMaterial`, carrying over
  `map`, with `roughness ≈ 0.55` and `metalness = 0`, so the model responds
  to the environment and casts/receives shadow.

Both modes ship because neither is strictly better: `unlit` alone looks flat,
and `lit` alone double-shades — the baked textures already contain shading.
Letting the visitor compare the two *is* the demonstration. Conversion is
memoized and the original materials are retained so toggling is reversible
without reloading the GLB.

**Camera.** `PerspectiveCamera`, fov 35 — a narrow lens keeps perspective
distortion low and reads as a product shot rather than a game view.

**Controls.** `OrbitControls` with:

- `autoRotate` at speed 0.6
- `enablePan={false}`
- `minPolarAngle ≈ 0.15π`, `maxPolarAngle ≈ 0.48π` — prevents orbiting under
  the floor plane
- clamped `minDistance` / `maxDistance`
- auto-rotate suspends on user interaction and resumes after 3 s idle

**Framing.** `<Bounds fit clip observe>` fits the model to the frame, so no
scale or position constants are hardcoded against this particular asset.

**Post-processing:** none. Bloom and depth-of-field buy little against unlit
materials and cost real frame time on mobile. Default tone mapping plus
`<Environment preset="studio" />` instead.

## Page layout

Mobile-first, two zones.

```
┌─────────────────────────────┐
│  ·SUSHI                 GH  │  floating transparent header
│                             │
│        [ 3D canvas ]        │  100dvh desktop / 90dvh mobile
│                             │
│  Handcrafted in WebGL       │  h1 + one subline
│  ↻ drag to rotate    [lit]  │  hint left, lighting toggle right
└─────────────────────────────┘
             ↓ scroll
┌─────────────────────────────┐
│  About the model            │  poly count, textures, credit, license
│  Built with                 │  Next.js · R3F · drei
└─────────────────────────────┘
```

Hero text is DOM layered over the canvas, not `<Text>` inside the scene: it
stays crisp at any DPR, remains readable to crawlers and screen readers, and
adds no draw calls. The overlay is `pointer-events-none` except for the
header link and the lighting toggle, so a drag that starts on the headline
still rotates the model.

Everything below the fold is static HTML with no 3D.

## Performance

- `dynamic(() => import('./stage'), { ssr: false })` — R3F gains nothing from
  SSR and would risk hydration mismatch.
- `useGLTF.preload()` plus a `<link rel="preload" as="fetch">` for the GLB.
- `dpr={[1, 2]}` and `<AdaptiveDpr pixelated />` to drop resolution while
  orbiting.
- `<PerformanceMonitor>` lowers dpr when frame rate falls. `frameloop="demand"`
  is deliberately *not* used, because auto-rotate needs a continuous loop.
- Rendering pauses when the tab is hidden or the canvas leaves the viewport
  (IntersectionObserver).
- `prefers-reduced-motion` disables auto-rotate.

Budget: LCP under 2.5 s. The 1.4 MB GLB is acceptable over a gzip-enabled
CDN. Draco/meshopt compression is deferred until measurement shows it is
needed.

## Error handling

| Failure | Behavior |
| --- | --- |
| No WebGL context | Render `fallback-poster` (static PNG) with a short explanatory line |
| GLB fetch or parse fails | Error boundary around the Suspense boundary → same poster plus a retry button |
| Slow GLB load | `loader.tsx` progress overlay from `useProgress`; the page's text content is already visible behind it |
| Material conversion throws | Fall back to `unlit` and keep the scene alive; never blank the canvas |

No failure path results in an empty viewport.

## Testing

- **Vitest + React Testing Library** — `lib/materials.ts`: conversion
  produces `MeshStandardMaterial`, preserves `map`, sets the intended
  roughness/metalness, and round-trips back to the original material.
  `hero-overlay`: renders, and the toggle invokes its callback.
- **`@react-three/test-renderer`** — scene graph assertions: the model
  mounts, the environment mounts, and `OrbitControls` receives the intended
  polar-angle and distance constraints.
- **Playwright** — the page loads; the canvas paints more than one distinct
  colour (i.e. something actually rendered); the lighting toggle changes
  state; `prefers-reduced-motion` disables auto-rotate.
- No visual-regression snapshots of 3D output — GPU differences across
  machines make them flaky.

## Out of scope

CMS, i18n, analytics, a model switcher, a dark/light theme toggle, a contact
form, post-processing effects, and mesh compression.

## Open items

- Confirm the Sketchfab license and exact attribution wording before deploy.
- `poster.png` must be produced once from the finished scene; until then the
  fallback shows the text-only variant.
