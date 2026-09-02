# Sushi GLB Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page portfolio landing site that renders a low-poly sushi GLB full-viewport with free-orbit interaction, idle auto-rotate, and a toggle between the asset's authored unlit materials and a converted lit (PBR) treatment.

**Architecture:** Next.js App Router. `app/page.tsx` is a server component holding the static below-the-fold copy; it renders `<StageLoader/>`, a thin client component that dynamically imports the R3F `Stage` with `ssr: false`. `Stage` is the single stateful component: it owns the lighting mode, the auto-rotate/idle state, and the frameloop gating, and renders both the `<Canvas>` and the DOM hero overlay so they can share that state. Inside the canvas, `SushiModel` owns the asset and its materials while `SceneEnv` owns light and grounding. All material conversion and geometry normalisation live in pure functions under `lib/`, so they are unit-testable without a renderer.

**Tech Stack:** Next.js 16.3.4, React 19.2.8, TypeScript 7.0.2, Tailwind CSS 4.3.3, three 0.185.1, @react-three/fiber 9.7.0, @react-three/drei 10.7.8. Tests: Vitest 4.1.11 + @testing-library/react 16.3.3 + @react-three/test-renderer 9.1.1 (unit/component), @playwright/test 1.62.1 (E2E).

**Spec:** `docs/superpowers/specs/2026-09-02-sushi-glb-landing-design.md`

## Global Constraints

- **React version is pinned by a peer range.** `@react-three/fiber@9.7.0` declares `react: ">=19 <19.3"`. Install `react@19.2.8` / `react-dom@19.2.8` exactly. Do not upgrade React past 19.2.x in this project.
- `@react-three/drei@10.7.8` requires `@react-three/fiber@^9`, `react@^19`, `three@>=0.159`. `three@0.185.1` satisfies this.
- **Asset:** `public/models/sushis.glb`, copied from `/Users/nack/Downloads/sushis.glb`. 1.4 MB, glTF 2.0, 2 meshes, 2 materials (`sushiSet`, `sushis`), 2 baked PNG textures, **0 animations**, uses **`KHR_materials_unlit`**.
- **The model does not receive light in `unlit` mode.** `KHR_materials_unlit` makes the loader produce `MeshBasicMaterial`. Never "fix" a dark model in unlit mode by adding lights — it will do nothing. Grounding in unlit mode comes from `ContactShadows` and a separate floor plane that does receive light.
- **Lit-mode constants:** `roughness = 0.55`, `metalness = 0`. Copy `map`, `color`, `transparent`, `opacity`, `side`, `alphaTest` from the source material.
- **Camera fov is 35.** A narrow lens keeps perspective distortion low and reads as a product shot.
- **Orbit constraints:** `enablePan={false}`, `minPolarAngle = 0.15 * Math.PI`, `maxPolarAngle = 0.48 * Math.PI` (prevents orbiting under the floor), clamped `minDistance`/`maxDistance`, `autoRotateSpeed = 0.6`, idle resume after **3000 ms**.
- **`prefers-reduced-motion: reduce` disables auto-rotate entirely.**
- **No post-processing.** No bloom, no depth of field. Default tone mapping plus `<Environment preset="studio" />`.
- **No failure path may leave an empty viewport.** Every error renders the fallback panel.
- **Performance budget:** LCP under 2.5 s. Do not add Draco or meshopt compression in this plan.
- **Out of scope, do not add:** CMS, i18n, analytics, a model switcher, a theme toggle, a contact form, visual-regression snapshots of 3D output.

## Deviations From The Spec

Three refinements, decided while writing this plan:

1. **`lib/scene-fit.ts` is added.** The spec relied on drei's `<Center>` semantics to sit the model on the floor. Doing the bounding-box maths explicitly is more predictable and, unlike a drei prop, directly unit-testable. `<Bounds>` is still used, but only for camera framing.
2. **`components/stage-loader.tsx` is added.** `next/dynamic` with `ssr: false` is not permitted inside a Server Component, so the dynamic import needs its own `'use client'` module between `page.tsx` and `Stage`.
3. **`public/poster.png` is dropped.** The spec's fallback was a pre-rendered still, which would have to be produced from the finished scene — a circular dependency, and a 200 KB asset to maintain. The fallback panel is instead a styled static block with the same copy. Nothing about the failure guarantee changes.

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/materials.ts` | `LightingMode` type; pure unlit→lit material conversion; a uuid-keyed cache so toggling never rebuilds materials |
| `lib/scene-fit.ts` | Pure geometry normalisation: centre an object on X/Z, sit its base at y=0 |
| `lib/webgl.ts` | WebGL availability detection |
| `lib/use-prefers-reduced-motion.ts` | Reactive `prefers-reduced-motion` hook |
| `components/sushi-model.tsx` | Loads the GLB, normalises it, swaps materials for the active mode |
| `components/scene-env.tsx` | Environment, lights, contact shadows, floor plane |
| `components/loader.tsx` | DOM load-progress bar driven by drei's `useProgress` |
| `components/fallback-poster.tsx` | Static panel for no-WebGL and load-failure cases |
| `components/model-error-boundary.tsx` | Error boundary that renders the fallback |
| `components/hero-overlay.tsx` | DOM hero text, rotate hint, lighting toggle. Knows nothing about three |
| `components/stage.tsx` | Client boundary. Owns all state; renders `<Canvas>` + overlay |
| `components/stage-loader.tsx` | `'use client'` dynamic import of `Stage` with `ssr: false` |
| `app/layout.tsx` | Metadata, fonts, GLB preload hint |
| `app/page.tsx` | Server component: hero section + below-the-fold content |
| `public/models/sushis.glb` | The asset |

---

### Task 1: Project scaffold, dependencies, and asset

Deliverable: a Next.js app that type-checks, builds, and serves a page, with the 3D dependencies installed and the GLB in place. No 3D code yet.

**Files:**
- Create: the Next.js scaffold (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `eslint.config.mjs`, `postcss.config.mjs`)
- Create: `public/models/sushis.glb`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: the `@/*` import alias mapped to the project root; npm scripts `dev`, `build`, `start`, `lint`.

- [ ] **Step 1: Scaffold into a temporary directory**

`create-next-app` refuses to run in a directory containing unrecognised entries, and this project already has `docs/`. Scaffold elsewhere, then move the files in.

```bash
cd /Users/nack/sushi
npx --yes create-next-app@16.3.4 /tmp/sushi-scaffold \
  --typescript --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: Move the scaffold into the project**

```bash
cd /Users/nack/sushi
rsync -a --exclude '.git' --exclude 'node_modules' /tmp/sushi-scaffold/ ./
rm -rf /tmp/sushi-scaffold
ls -a
```

Expected: `app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts` now exist alongside `docs/` and `.git/`.

- [ ] **Step 3: Install the 3D dependencies at pinned versions**

```bash
npm install --save-exact \
  react@19.2.8 react-dom@19.2.8 \
  three@0.185.1 @react-three/fiber@9.7.0 @react-three/drei@10.7.8
npm install --save-exact --save-dev @types/three@0.185.4
```

- [ ] **Step 4: Verify the peer ranges resolved cleanly**

```bash
npm ls react three @react-three/fiber @react-three/drei
```

Expected: no `invalid` or `UNMET PEER DEPENDENCY` markers. `react@19.2.8`, `three@0.185.1`.

- [ ] **Step 5: Copy the asset in**

```bash
mkdir -p public/models
cp /Users/nack/Downloads/sushis.glb public/models/sushis.glb
ls -lh public/models/sushis.glb
```

Expected: a 1.4M file.

- [ ] **Step 6: Confirm the asset survived the copy**

```bash
node -e '
const fs = require("fs");
const b = fs.readFileSync("public/models/sushis.glb");
if (b.slice(0, 4).toString() !== "glTF") throw new Error("not a GLB");
const json = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString("utf8"));
console.log("meshes:", json.meshes.length, "materials:", json.materials.map(m => m.name));
console.log("extensions:", json.extensionsUsed);
'
```

Expected: `meshes: 2 materials: [ 'sushiSet', 'sushis' ]` and `extensions: [ 'KHR_materials_unlit' ]`.

- [ ] **Step 7: Extend .gitignore**

The rsync in Step 2 replaced `.gitignore` wholesale with the scaffold's
version, which dropped the `.superpowers/` entry this branch already had.
Restore it alongside the testing entries, or Step 9's `git add -A` will
commit the scratch directory.

```bash
cat >> .gitignore <<'EOF'

# superpowers scratch
.superpowers/

# testing
/coverage
/test-results
/playwright-report
/.playwright
EOF
sort -u .gitignore -o .gitignore
git check-ignore -q .superpowers && echo "scratch ignored: ok"
```

Expected: `scratch ignored: ok`.

- [ ] **Step 8: Verify type-check and build pass**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with R3F dependencies and sushi GLB"
```

---

### Task 2: Material conversion (`lib/materials.ts`)

Deliverable: pure, tested functions that turn the GLB's unlit materials into lit ones and cache the result. Also establishes the Vitest toolchain, since this is the first test in the repo.

**Files:**
- Create: `vitest.config.mts`
- Create: `vitest.setup.ts`
- Create: `lib/materials.ts`
- Test: `lib/materials.test.ts`
- Modify: `package.json` (add the `test` scripts)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type LightingMode = 'unlit' | 'lit'`
  - `const LIT_ROUGHNESS = 0.55`, `const LIT_METALNESS = 0`
  - `function toLit(source: Material): MeshStandardMaterial`
  - `class LitMaterialCache` with `get(source: Material): MeshStandardMaterial` and `dispose(): void`

- [ ] **Step 1: Install the test toolchain**

```bash
npm install --save-exact --save-dev \
  vitest@4.1.11 @vitejs/plugin-react@6.1.1 jsdom@30.0.1 \
  @testing-library/react@16.3.3 @testing-library/jest-dom@7.0.1 \
  @react-three/test-renderer@9.1.1
```

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,lib}/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add the test scripts**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Write the failing test**

Create `lib/materials.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Color, MeshBasicMaterial, MeshStandardMaterial, Texture } from 'three'
import { LIT_METALNESS, LIT_ROUGHNESS, LitMaterialCache, toLit } from '@/lib/materials'

function makeUnlit(name = 'sushiSet'): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    name,
    map: new Texture(),
    color: new Color(0.8, 0.4, 0.2),
    transparent: true,
    opacity: 0.9,
  })
  material.alphaTest = 0.25
  return material
}

describe('toLit', () => {
  it('produces a MeshStandardMaterial', () => {
    expect(toLit(makeUnlit())).toBeInstanceOf(MeshStandardMaterial)
  })

  it('carries the baked texture over unchanged', () => {
    const source = makeUnlit()
    expect(toLit(source).map).toBe(source.map)
  })

  it('applies the project lit constants', () => {
    const lit = toLit(makeUnlit())
    expect(lit.roughness).toBe(LIT_ROUGHNESS)
    expect(lit.metalness).toBe(LIT_METALNESS)
  })

  it('preserves colour and transparency settings', () => {
    const source = makeUnlit()
    const lit = toLit(source)
    expect(lit.color.getHex()).toBe(source.color.getHex())
    expect(lit.transparent).toBe(true)
    expect(lit.opacity).toBe(0.9)
    expect(lit.alphaTest).toBe(0.25)
  })

  it('names the result after its source so it is identifiable in a debugger', () => {
    expect(toLit(makeUnlit('sushis')).name).toBe('sushis__lit')
  })

  it('does not mutate the source material', () => {
    const source = makeUnlit()
    toLit(source)
    expect(source).toBeInstanceOf(MeshBasicMaterial)
    expect(source.name).toBe('sushiSet')
  })
})

describe('LitMaterialCache', () => {
  it('returns the same instance for the same source material', () => {
    const cache = new LitMaterialCache()
    const source = makeUnlit()
    expect(cache.get(source)).toBe(cache.get(source))
  })

  it('returns distinct instances for distinct sources', () => {
    const cache = new LitMaterialCache()
    expect(cache.get(makeUnlit('a'))).not.toBe(cache.get(makeUnlit('b')))
  })

  it('empties itself on dispose so the next get rebuilds', () => {
    const cache = new LitMaterialCache()
    const source = makeUnlit()
    const first = cache.get(source)
    cache.dispose()
    expect(cache.get(source)).not.toBe(first)
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test -- lib/materials.test.ts`
Expected: FAIL — cannot resolve `@/lib/materials`.

- [ ] **Step 6: Write the implementation**

Create `lib/materials.ts`:

```ts
import { Color, Material, MeshBasicMaterial, MeshStandardMaterial } from 'three'

export type LightingMode = 'unlit' | 'lit'

/**
 * The sushi GLB uses KHR_materials_unlit, so three gives us MeshBasicMaterial
 * and the model ignores every light in the scene. Lit mode rebuilds each
 * material as MeshStandardMaterial so it responds to the environment.
 *
 * Roughness is deliberately mid-range: the textures are baked, so a shiny
 * surface would fight the shading already painted into them.
 */
export const LIT_ROUGHNESS = 0.55
export const LIT_METALNESS = 0

export function toLit(source: Material): MeshStandardMaterial {
  const basic = source as MeshBasicMaterial

  return new MeshStandardMaterial({
    name: `${source.name}__lit`,
    map: basic.map ?? null,
    color: basic.color ? basic.color.clone() : new Color(0xffffff),
    roughness: LIT_ROUGHNESS,
    metalness: LIT_METALNESS,
    transparent: source.transparent,
    opacity: source.opacity,
    side: source.side,
    alphaTest: source.alphaTest,
  })
}

/**
 * Keyed by material uuid so toggling lighting modes reuses the converted
 * materials instead of allocating new ones on every switch.
 */
export class LitMaterialCache {
  private readonly cache = new Map<string, MeshStandardMaterial>()

  get(source: Material): MeshStandardMaterial {
    const existing = this.cache.get(source.uuid)
    if (existing) return existing

    const lit = toLit(source)
    this.cache.set(source.uuid, lit)
    return lit
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose()
    this.cache.clear()
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- lib/materials.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.mts vitest.setup.ts lib/materials.ts lib/materials.test.ts package.json package-lock.json
git commit -m "feat: add unlit-to-lit material conversion with caching"
```

---

### Task 3: Geometry normalisation (`lib/scene-fit.ts`)

Deliverable: a pure function that seats an arbitrary loaded object on the floor plane and centres it horizontally, so no scale or position constants are hardcoded against this particular GLB.

**Files:**
- Create: `lib/scene-fit.ts`
- Test: `lib/scene-fit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function groundAndCenter(object: Object3D): void` — mutates `object.position` in place.

- [ ] **Step 1: Write the failing test**

Create `lib/scene-fit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { groundAndCenter } from '@/lib/scene-fit'

function makeOffsetGroup(): Group {
  const group = new Group()
  const mesh = new Mesh(new BoxGeometry(2, 4, 2), new MeshBasicMaterial())
  // Sitting well away from the origin on every axis.
  mesh.position.set(10, 20, -6)
  group.add(mesh)
  return group
}

function worldBox(group: Group): Box3 {
  group.updateWorldMatrix(true, true)
  return new Box3().setFromObject(group)
}

describe('groundAndCenter', () => {
  it('seats the base of the object on y=0', () => {
    const group = makeOffsetGroup()
    groundAndCenter(group)
    expect(worldBox(group).min.y).toBeCloseTo(0, 5)
  })

  it('centres the object on the x and z axes', () => {
    const group = makeOffsetGroup()
    groundAndCenter(group)
    const center = worldBox(group).getCenter(new Vector3())
    expect(center.x).toBeCloseTo(0, 5)
    expect(center.z).toBeCloseTo(0, 5)
  })

  it('leaves the object size untouched', () => {
    const group = makeOffsetGroup()
    const before = worldBox(group).getSize(new Vector3())
    groundAndCenter(group)
    const after = worldBox(group).getSize(new Vector3())
    expect(after.x).toBeCloseTo(before.x, 5)
    expect(after.y).toBeCloseTo(before.y, 5)
    expect(after.z).toBeCloseTo(before.z, 5)
  })

  it('is idempotent', () => {
    const group = makeOffsetGroup()
    groundAndCenter(group)
    const once = group.position.clone()
    groundAndCenter(group)
    expect(group.position.x).toBeCloseTo(once.x, 5)
    expect(group.position.y).toBeCloseTo(once.y, 5)
    expect(group.position.z).toBeCloseTo(once.z, 5)
  })

  it('tolerates an empty object', () => {
    const group = new Group()
    expect(() => groundAndCenter(group)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/scene-fit.test.ts`
Expected: FAIL — cannot resolve `@/lib/scene-fit`.

- [ ] **Step 3: Write the implementation**

Create `lib/scene-fit.ts`:

```ts
import { Box3, Object3D, Vector3 } from 'three'

/**
 * Moves an object so its bounding box is centred on X/Z and its base rests on
 * y = 0, which is where the floor plane and contact shadows live.
 *
 * The position is reset first so the function measures the object's intrinsic
 * bounds rather than accumulating offsets — that is what makes it idempotent.
 */
export function groundAndCenter(object: Object3D): void {
  object.position.set(0, 0, 0)
  object.updateWorldMatrix(true, true)

  const box = new Box3().setFromObject(object)
  if (box.isEmpty()) return

  const center = box.getCenter(new Vector3())
  object.position.set(-center.x, -box.min.y, -center.z)
  object.updateWorldMatrix(true, true)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/scene-fit.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/scene-fit.ts lib/scene-fit.test.ts
git commit -m "feat: add scene normalisation to seat the model on the floor"
```

---

### Task 4: Environment detection helpers

Deliverable: two small tested utilities the stage depends on — WebGL availability and a reactive reduced-motion hook.

**Files:**
- Create: `lib/webgl.ts`
- Create: `lib/use-prefers-reduced-motion.ts`
- Test: `lib/webgl.test.ts`
- Test: `lib/use-prefers-reduced-motion.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function hasWebGL(): boolean`
  - `function usePrefersReducedMotion(): boolean`

- [ ] **Step 1: Write the failing tests**

Create `lib/webgl.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasWebGL } from '@/lib/webgl'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hasWebGL', () => {
  it('reports false when no context can be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(hasWebGL()).toBe(false)
  })

  it('reports true when webgl2 is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (id: string) => (id === 'webgl2' ? ({} as RenderingContext) : null),
    )
    expect(hasWebGL()).toBe(true)
  })

  it('falls back to the webgl1 context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (id: string) => (id === 'webgl' ? ({} as RenderingContext) : null),
    )
    expect(hasWebGL()).toBe(true)
  })

  it('reports false instead of throwing when getContext throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('context creation blocked')
    })
    expect(hasWebGL()).toBe(false)
  })
})
```

Create `lib/use-prefers-reduced-motion.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

type Listener = (event: MediaQueryListEvent) => void

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => query)
  return {
    emit(matches: boolean) {
      query.matches = matches
      for (const listener of listeners) listener({ matches } as MediaQueryListEvent)
    },
    listenerCount: () => listeners.size,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePrefersReducedMotion', () => {
  it('reads the initial preference', () => {
    stubMatchMedia(true)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true)
  })

  it('reports false when motion is allowed', () => {
    stubMatchMedia(false)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false)
  })

  it('updates when the preference changes', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    act(() => media.emit(true))
    expect(result.current).toBe(true)
  })

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(false)
    renderHook(() => usePrefersReducedMotion()).unmount()
    expect(media.listenerCount()).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/webgl.test.ts lib/use-prefers-reduced-motion.test.ts`
Expected: FAIL — both modules unresolved.

- [ ] **Step 3: Write the implementations**

Create `lib/webgl.ts`:

```ts
/**
 * Probes for a real WebGL context rather than sniffing the user agent. Some
 * browsers expose WebGLRenderingContext but refuse to hand out a context
 * (blocklisted GPU, hardware acceleration disabled), so creating one is the
 * only reliable check.
 */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
```

Create `lib/use-prefers-reduced-motion.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const query = window.matchMedia(QUERY)
    setPrefersReduced(query.matches)

    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/webgl.test.ts lib/use-prefers-reduced-motion.test.ts`
Expected: PASS, 8 tests.

Note on the first render: the hook starts at `false` and corrects itself in an effect. That is intentional — reading `matchMedia` during render would differ between server and client. `Stage` is client-only, so the correction lands before the first frame matters.

- [ ] **Step 5: Commit**

```bash
git add lib/webgl.ts lib/webgl.test.ts lib/use-prefers-reduced-motion.ts lib/use-prefers-reduced-motion.test.ts
git commit -m "feat: add WebGL detection and reduced-motion hook"
```

---

### Task 5: The model component (`components/sushi-model.tsx`)

Deliverable: a component that loads the GLB, normalises its placement, and swaps materials to match the active lighting mode — verified against a scene graph, not a browser.

**Files:**
- Create: `components/sushi-model.tsx`
- Test: `components/sushi-model.test.tsx`

**Interfaces:**
- Consumes: `LightingMode`, `LitMaterialCache` from `@/lib/materials`; `groundAndCenter` from `@/lib/scene-fit`.
- Produces:
  - `const MODEL_URL = '/models/sushis.glb'`
  - `function SushiModel(props: { mode: LightingMode; onConversionError?: (error: unknown) => void }): JSX.Element`

- [ ] **Step 1: Write the failing test**

The GLB is never loaded in tests: parsing a real 1.4 MB binary under jsdom is slow and would couple these assertions to the asset. `useGLTF` is mocked with a hand-built scene that mirrors the real one — a group holding two meshes with `MeshBasicMaterial`, exactly what `KHR_materials_unlit` produces.

Create `components/sushi-model.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Texture,
} from 'three'

const scene = new Group()

function resetScene() {
  scene.clear()
  scene.position.set(0, 0, 0)

  for (const name of ['sushiSet', 'sushis']) {
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ name, map: new Texture() }),
    )
    mesh.name = `${name}_mesh`
    mesh.position.set(5, 7, 5)
    scene.add(mesh)
  }
}

vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(() => ({ scene }), { preload: vi.fn() }),
}))

import { SushiModel } from '@/components/sushi-model'

function meshes() {
  return scene.children.filter((child): child is Mesh => (child as Mesh).isMesh)
}

beforeEach(() => {
  resetScene()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SushiModel', () => {
  it('mounts the loaded scene into the graph', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    expect(renderer.scene.findAllByType('Mesh')).toHaveLength(2)
  })

  it('keeps the authored basic materials in unlit mode', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    for (const mesh of meshes()) {
      expect(mesh.material).toBeInstanceOf(MeshBasicMaterial)
    }
  })

  it('swaps to standard materials in lit mode', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    for (const mesh of meshes()) {
      expect(mesh.material).toBeInstanceOf(MeshStandardMaterial)
    }
  })

  it('preserves the baked texture through the swap', async () => {
    const original = (meshes()[0].material as MeshBasicMaterial).map
    await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    expect((meshes()[0].material as MeshStandardMaterial).map).toBe(original)
  })

  it('restores the original materials when switching back to unlit', async () => {
    const originals = meshes().map((mesh) => mesh.material)
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="lit" />)
    await renderer.update(<SushiModel mode="unlit" />)
    meshes().forEach((mesh, index) => {
      expect(mesh.material).toBe(originals[index])
    })
  })

  it('enables shadow casting only in lit mode', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    expect(meshes().every((mesh) => mesh.castShadow)).toBe(false)

    await renderer.update(<SushiModel mode="lit" />)
    expect(meshes().every((mesh) => mesh.castShadow)).toBe(true)
  })

  it('seats the model on the floor', async () => {
    await ReactThreeTestRenderer.create(<SushiModel mode="unlit" />)
    // The meshes sit at y=7 with height 1, so the base is at 6.5 before fitting.
    expect(scene.position.y).toBeCloseTo(-6.5, 5)
  })

  it('keeps the authored materials and reports upward when conversion fails', async () => {
    const onConversionError = vi.fn()
    const source = meshes()[0].material as MeshBasicMaterial
    // toLit clones the source colour, so this is the realistic failure point.
    vi.spyOn(source.color, 'clone').mockImplementation(() => {
      throw new Error('material conversion failed')
    })

    await ReactThreeTestRenderer.create(
      <SushiModel mode="lit" onConversionError={onConversionError} />,
    )

    expect(onConversionError).toHaveBeenCalledOnce()
    expect(meshes()[0].material).toBeInstanceOf(MeshBasicMaterial)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- components/sushi-model.test.tsx`
Expected: FAIL — cannot resolve `@/components/sushi-model`.

- [ ] **Step 3: Write the implementation**

Create `components/sushi-model.tsx`:

```tsx
'use client'

import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo } from 'react'
import type { Material, Mesh } from 'three'
import { LitMaterialCache, type LightingMode } from '@/lib/materials'
import { groundAndCenter } from '@/lib/scene-fit'

export const MODEL_URL = '/models/sushis.glb'

type SushiModelProps = {
  mode: LightingMode
  /**
   * Called when lit-mode conversion throws. The authored materials are left in
   * place, so the caller's job is only to move its own state back to unlit.
   */
  onConversionError?: (error: unknown) => void
}

export function SushiModel({ mode, onConversionError }: SushiModelProps) {
  const { scene } = useGLTF(MODEL_URL)
  const cache = useMemo(() => new LitMaterialCache(), [])

  // Captured before any swap, so unlit mode always has something to restore.
  const originals = useMemo(() => {
    const byUuid = new Map<string, Material | Material[]>()
    scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) byUuid.set(mesh.uuid, mesh.material)
    })
    return byUuid
  }, [scene])

  useEffect(() => {
    groundAndCenter(scene)
  }, [scene])

  const applyMode = useCallback(
    (target: LightingMode) => {
      scene.traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.isMesh) return

        const original = originals.get(mesh.uuid)
        if (!original) return

        if (target === 'lit') {
          mesh.material = Array.isArray(original)
            ? original.map((material) => cache.get(material))
            : cache.get(original)
        } else {
          mesh.material = original
        }

        // Pointless in unlit mode — the model neither casts into nor reads the
        // shadow map — and it costs a shadow-map pass, so it is gated.
        mesh.castShadow = target === 'lit'
        mesh.receiveShadow = target === 'lit'
      })
    },
    [cache, originals, scene],
  )

  useEffect(() => {
    try {
      applyMode(mode)
    } catch (error) {
      // A malformed material must not blank the canvas: keep what the GLB
      // shipped with and let the stage return its own state to unlit.
      applyMode('unlit')
      onConversionError?.(error)
    }
  }, [applyMode, mode, onConversionError])

  useEffect(() => () => cache.dispose(), [cache])

  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- components/sushi-model.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add components/sushi-model.tsx components/sushi-model.test.tsx
git commit -m "feat: add sushi model component with lighting mode swapping"
```

---

### Task 6: Scene environment (`components/scene-env.tsx`)

Deliverable: the lighting, grounding, and floor that make the sushi read as an object sitting on a surface — in both lighting modes.

**Files:**
- Create: `components/scene-env.tsx`
- Test: `components/scene-env.test.tsx`

**Interfaces:**
- Consumes: `LightingMode` from `@/lib/materials`.
- Produces: `function SceneEnv(props: { mode: LightingMode }): JSX.Element`

- [ ] **Step 1: Write the failing test**

drei's `Environment` loads an HDR over the network, so it is stubbed. `ContactShadows` renders to an offscreen target and is stubbed for the same reason. What is worth asserting is the light rig and the floor.

Create `components/scene-env.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'

vi.mock('@react-three/drei', () => ({
  Environment: () => null,
  ContactShadows: () => null,
}))

import { FLOOR_Y, SceneEnv } from '@/components/scene-env'

describe('SceneEnv', () => {
  it('provides both an ambient fill and a directional key light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
    expect(renderer.scene.findAllByType('AmbientLight')).toHaveLength(1)
    expect(renderer.scene.findAllByType('DirectionalLight')).toHaveLength(1)
  })

  it('casts shadows from the key light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="lit" />)
    expect(renderer.scene.findByType('DirectionalLight').instance.castShadow).toBe(true)
  })

  it('lays a floor at the grounding plane that receives shadow', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="unlit" />)
    const floor = renderer.scene.findByType('Mesh').instance as Mesh
    expect(floor.receiveShadow).toBe(true)
    expect(floor.position.y).toBeCloseTo(FLOOR_Y, 5)
  })

  it('keeps the floor horizontal', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="unlit" />)
    const floor = renderer.scene.findByType('Mesh').instance as Mesh
    expect(floor.rotation.x).toBeCloseTo(-Math.PI / 2, 5)
  })

  it('renders the floor in unlit mode too, since grounding is what sells the scene', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneEnv mode="unlit" />)
    expect(renderer.scene.findAllByType('Mesh')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- components/scene-env.test.tsx`
Expected: FAIL — cannot resolve `@/components/scene-env`.

- [ ] **Step 3: Write the implementation**

Create `components/scene-env.tsx`:

```tsx
'use client'

import { ContactShadows, Environment } from '@react-three/drei'
import type { LightingMode } from '@/lib/materials'

/**
 * A hair below zero so the floor never z-fights with geometry that
 * groundAndCenter has seated at exactly y = 0.
 */
export const FLOOR_Y = -0.002

type SceneEnvProps = {
  mode: LightingMode
}

export function SceneEnv({ mode }: SceneEnvProps) {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />

      {/*
        The model itself is unlit, so in unlit mode the only thing tying it to
        the ground is this shadow. It is kept in both modes for consistency.
      */}
      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={mode === 'lit' ? 0.35 : 0.5}
        scale={12}
        blur={2.4}
        far={4}
        resolution={512}
        color="#1c1410"
      />

      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#efe7dc" roughness={0.9} metalness={0} />
      </mesh>
    </>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- components/scene-env.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/scene-env.tsx components/scene-env.test.tsx
git commit -m "feat: add scene environment with lit floor and contact shadows"
```

---

### Task 7: DOM chrome — loader, fallback, error boundary

Deliverable: the three pieces that guarantee the viewport is never blank: a load-progress bar, a static fallback panel, and an error boundary that renders it.

**Files:**
- Create: `components/loader.tsx`
- Create: `components/fallback-poster.tsx`
- Create: `components/model-error-boundary.tsx`
- Test: `components/loader.test.tsx`
- Test: `components/fallback-poster.test.tsx`
- Test: `components/model-error-boundary.test.tsx`

**Interfaces:**
- Consumes: `useProgress` from `@react-three/drei`.
- Produces:
  - `function Loader(): JSX.Element | null`
  - `type FallbackReason = 'no-webgl' | 'load-failed'`
  - `function FallbackPoster(props: { reason: FallbackReason; onRetry?: () => void }): JSX.Element`
  - `class ModelErrorBoundary extends Component<{ children: ReactNode; onRetry?: () => void }>`

- [ ] **Step 1: Write the failing tests**

Create `components/loader.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const progress = { active: true, progress: 0 }

vi.mock('@react-three/drei', () => ({
  useProgress: () => progress,
}))

import { Loader } from '@/components/loader'

describe('Loader', () => {
  it('renders nothing once loading has finished', () => {
    progress.active = false
    const { container } = render(<Loader />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes progress to assistive technology while loading', () => {
    progress.active = true
    progress.progress = 42.7
    render(<Loader />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '43')
  })

  it('reflects progress in the bar width', () => {
    progress.active = true
    progress.progress = 25
    render(<Loader />)
    expect(screen.getByTestId('loader-fill')).toHaveStyle({ width: '25%' })
  })
})
```

Create `components/fallback-poster.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FallbackPoster } from '@/components/fallback-poster'

describe('FallbackPoster', () => {
  it('explains a missing WebGL context', () => {
    render(<FallbackPoster reason="no-webgl" />)
    expect(screen.getByText(/WebGL/i)).toBeInTheDocument()
  })

  it('offers no retry when the browser simply cannot render', () => {
    render(<FallbackPoster reason="no-webgl" onRetry={() => {}} />)
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('offers a retry when a load failed', async () => {
    const onRetry = vi.fn()
    render(<FallbackPoster reason="load-failed" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('still names the subject so the panel is never contentless', () => {
    render(<FallbackPoster reason="load-failed" />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })
})
```

Create `components/model-error-boundary.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelErrorBoundary } from '@/components/model-error-boundary'

function Boom(): never {
  throw new Error('GLB parse failed')
}

beforeEach(() => {
  // React logs caught render errors; silence the expected noise.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ModelErrorBoundary', () => {
  it('renders its children when nothing goes wrong', () => {
    render(
      <ModelErrorBoundary>
        <p>scene</p>
      </ModelErrorBoundary>,
    )
    expect(screen.getByText('scene')).toBeInTheDocument()
  })

  it('renders the fallback panel when a child throws', () => {
    render(
      <ModelErrorBoundary>
        <Boom />
      </ModelErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Install the interaction testing library**

```bash
npm install --save-exact --save-dev @testing-library/user-event@14.6.1
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- components/loader.test.tsx components/fallback-poster.test.tsx components/model-error-boundary.test.tsx`
Expected: FAIL — all three modules unresolved.

- [ ] **Step 4: Write the implementations**

Create `components/loader.tsx`:

```tsx
'use client'

import { useProgress } from '@react-three/drei'

/**
 * Lives in the DOM rather than inside the canvas: drei's useProgress reads a
 * store fed by three's DefaultLoadingManager, which works outside <Canvas>,
 * and DOM text stays crisp at any device pixel ratio.
 */
export function Loader() {
  const { active, progress } = useProgress()
  if (!active) return null

  const value = Math.round(progress)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-6 pb-6 sm:px-10 sm:pb-10">
      <div
        role="progressbar"
        aria-label="Loading the sushi model"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-px w-full overflow-hidden bg-black/10"
      >
        <div
          data-testid="loader-fill"
          className="h-full bg-black/60 transition-[width] duration-200 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
```

Create `components/fallback-poster.tsx`:

```tsx
'use client'

export type FallbackReason = 'no-webgl' | 'load-failed'

const COPY: Record<FallbackReason, { heading: string; body: string }> = {
  'no-webgl': {
    heading: 'Handcrafted in WebGL',
    body: 'This browser cannot open a WebGL context, so the sushi cannot be rendered here. Everything below still works.',
  },
  'load-failed': {
    heading: 'Handcrafted in WebGL',
    body: 'The 3D model did not finish loading.',
  },
}

type FallbackPosterProps = {
  reason: FallbackReason
  onRetry?: () => void
}

export function FallbackPoster({ reason, onRetry }: FallbackPosterProps) {
  const { heading, body } = COPY[reason]

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_50%_35%,#faf4ea_0%,#e7dccb_55%,#d8c9b3_100%)] px-6 text-center">
      <span aria-hidden="true" className="text-5xl">
        🍣
      </span>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      <p className="max-w-sm text-sm opacity-70">{body}</p>

      {reason === 'load-failed' && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-black/20 px-5 py-2 text-xs tracking-widest uppercase transition-colors hover:bg-black/5"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
```

Create `components/model-error-boundary.tsx`:

```tsx
'use client'

import { Component, type ReactNode } from 'react'
import { FallbackPoster } from '@/components/fallback-poster'

type Props = {
  children: ReactNode
  onRetry?: () => void
}

type State = {
  failed: boolean
}

/**
 * Catches GLB fetch/parse failures and anything thrown while building the
 * scene, so a broken asset degrades to the static panel instead of an empty
 * viewport. Error boundaries have no hook equivalent, hence the class.
 */
export class ModelErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  private handleRetry = () => {
    this.setState({ failed: false })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.failed) {
      return <FallbackPoster reason="load-failed" onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- components/loader.test.tsx components/fallback-poster.test.tsx components/model-error-boundary.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add components/loader.tsx components/loader.test.tsx components/fallback-poster.tsx components/fallback-poster.test.tsx components/model-error-boundary.tsx components/model-error-boundary.test.tsx package.json package-lock.json
git commit -m "feat: add loader, fallback panel, and model error boundary"
```

---

### Task 8: Hero overlay (`components/hero-overlay.tsx`)

Deliverable: the DOM layer over the canvas — headline, rotate hint, lighting toggle — with pointer events arranged so dragging the headline still rotates the model.

**Files:**
- Create: `components/hero-overlay.tsx`
- Test: `components/hero-overlay.test.tsx`

**Interfaces:**
- Consumes: `LightingMode` from `@/lib/materials`.
- Produces: `function HeroOverlay(props: { mode: LightingMode; onToggleMode: () => void }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `components/hero-overlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HeroOverlay } from '@/components/hero-overlay'

describe('HeroOverlay', () => {
  it('renders the headline as the page heading', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Handcrafted in WebGL/i)
  })

  it('reports the toggle as unpressed in unlit mode', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByRole('button', { name: /lighting/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('reports the toggle as pressed in lit mode', () => {
    render(<HeroOverlay mode="lit" onToggleMode={() => {}} />)
    expect(screen.getByRole('button', { name: /lighting/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls back when the toggle is activated', async () => {
    const onToggleMode = vi.fn()
    render(<HeroOverlay mode="unlit" onToggleMode={onToggleMode} />)
    await userEvent.click(screen.getByRole('button', { name: /lighting/i }))
    expect(onToggleMode).toHaveBeenCalledOnce()
  })

  it('lets pointer events fall through to the canvas', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByTestId('hero-overlay').className).toContain('pointer-events-none')
  })

  it('re-enables pointer events on the toggle itself', () => {
    render(<HeroOverlay mode="unlit" onToggleMode={() => {}} />)
    expect(screen.getByRole('button', { name: /lighting/i }).className).toContain(
      'pointer-events-auto',
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- components/hero-overlay.test.tsx`
Expected: FAIL — cannot resolve `@/components/hero-overlay`.

- [ ] **Step 3: Write the implementation**

Create `components/hero-overlay.tsx`:

```tsx
'use client'

import type { LightingMode } from '@/lib/materials'

type HeroOverlayProps = {
  mode: LightingMode
  onToggleMode: () => void
}

export function HeroOverlay({ mode, onToggleMode }: HeroOverlayProps) {
  return (
    <div
      data-testid="hero-overlay"
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 sm:p-10"
    >
      <header className="flex items-start justify-between text-xs tracking-[0.25em] uppercase">
        <span className="font-semibold">Sushi</span>
        <a
          href="#about"
          className="pointer-events-auto opacity-60 underline-offset-4 transition-opacity hover:opacity-100 hover:underline"
        >
          About
        </a>
      </header>

      <div className="flex flex-col gap-5">
        <h1 className="max-w-2xl text-4xl leading-[1.03] font-semibold tracking-tight text-balance sm:text-6xl">
          Handcrafted in WebGL
        </h1>
        <p className="max-w-sm text-sm leading-relaxed opacity-65">
          A low-poly sushi set loaded as glTF. Its materials are unlit by design — flip the
          switch to see the same geometry rebuilt to catch light.
        </p>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.65rem] tracking-[0.2em] uppercase opacity-50">
            Drag to rotate
          </span>
          <button
            type="button"
            onClick={onToggleMode}
            aria-pressed={mode === 'lit'}
            aria-label="Toggle lighting mode"
            className="pointer-events-auto rounded-full border border-black/20 px-4 py-2 text-[0.65rem] tracking-[0.2em] uppercase transition-colors hover:bg-black/5"
          >
            {mode === 'lit' ? 'Lit' : 'Unlit'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- components/hero-overlay.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add components/hero-overlay.tsx components/hero-overlay.test.tsx
git commit -m "feat: add hero overlay with lighting toggle"
```

---

### Task 9: The stage (`components/stage.tsx`, `components/stage-loader.tsx`)

Deliverable: the assembled interactive scene — canvas, controls with their constraints, idle auto-rotate, frameloop gating, WebGL guard — plus the client wrapper that dynamically imports it.

**Files:**
- Create: `components/stage.tsx`
- Create: `components/stage-loader.tsx`
- Test: `components/stage.test.tsx`

**Interfaces:**
- Consumes: `SushiModel`, `SceneEnv`, `HeroOverlay`, `Loader`, `FallbackPoster`, `ModelErrorBoundary`, `hasWebGL`, `usePrefersReducedMotion`, `LightingMode`.
- Produces:
  - `const ORBIT_LIMITS` — `{ minPolarAngle, maxPolarAngle, minDistance, maxDistance, autoRotateSpeed }`
  - `const IDLE_RESUME_MS = 3000`
  - `function Stage(): JSX.Element` (default export as well, for `next/dynamic`)
  - `function StageLoader(): JSX.Element`

- [ ] **Step 1: Write the failing test**

`<Canvas>` needs a real WebGL context, so it is stubbed to render its children plainly. That keeps the assertions on what this component actually decides: which subtree to show, and what props the controls receive.

Create `components/stage.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const orbitProps: Record<string, unknown>[] = []
let reducedMotion = false

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) => (
    <div data-testid="canvas" data-frameloop={String(rest.frameloop)}>
      {children}
    </div>
  ),
  useFrame: () => {},
}))

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  Bounds: ({ children }: { children: ReactNode }) => <>{children}</>,
  Environment: () => null,
  ContactShadows: () => null,
  PerformanceMonitor: () => null,
  Preload: () => null,
  OrbitControls: (props: Record<string, unknown>) => {
    orbitProps.push(props)
    return null
  },
  useProgress: () => ({ active: false, progress: 100 }),
  useGLTF: Object.assign(() => ({ scene: { traverse: () => {}, position: { set: () => {} } } }), {
    preload: vi.fn(),
  }),
}))

vi.mock('@/components/sushi-model', () => ({
  MODEL_URL: '/models/sushis.glb',
  SushiModel: ({
    mode,
    onConversionError,
  }: {
    mode: string
    onConversionError?: (error: unknown) => void
  }) => (
    <div data-testid="model" data-mode={mode}>
      <button
        type="button"
        data-testid="break-materials"
        onClick={() => onConversionError?.(new Error('material conversion failed'))}
      />
    </div>
  ),
}))

// Canvas is a plain div here, so real R3F intrinsics (<ambientLight>,
// <planeGeometry args={...}>) would reach React DOM and warn. SceneEnv is
// already covered against a real three scene graph in its own test.
vi.mock('@/components/scene-env', () => ({
  FLOOR_Y: -0.002,
  SceneEnv: ({ mode }: { mode: string }) => <div data-testid="scene-env" data-mode={mode} />,
}))

vi.mock('@/lib/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => reducedMotion,
}))

import { IDLE_RESUME_MS, ORBIT_LIMITS, Stage } from '@/components/stage'

function stubWebGL(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    available ? ({} as RenderingContext) : null,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  orbitProps.length = 0
  reducedMotion = false
})

describe('Stage', () => {
  it('renders the fallback panel when WebGL is unavailable', () => {
    stubWebGL(false)
    render(<Stage />)
    expect(screen.getByText(/cannot open a WebGL context/i)).toBeInTheDocument()
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument()
  })

  it('renders the canvas and the overlay together when WebGL is available', () => {
    stubWebGL(true)
    render(<Stage />)
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('starts in unlit mode', () => {
    stubWebGL(true)
    render(<Stage />)
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'unlit')
  })

  it('switches the model to lit mode from the overlay toggle', async () => {
    stubWebGL(true)
    render(<Stage />)
    await userEvent.click(screen.getByRole('button', { name: /lighting/i }))
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'lit')
  })

  it('applies the orbit constraints from the spec', () => {
    stubWebGL(true)
    render(<Stage />)
    const props = orbitProps.at(-1)!
    expect(props.enablePan).toBe(false)
    expect(props.makeDefault).toBe(true)
    expect(props.minPolarAngle).toBeCloseTo(ORBIT_LIMITS.minPolarAngle, 5)
    expect(props.maxPolarAngle).toBeCloseTo(ORBIT_LIMITS.maxPolarAngle, 5)
    expect(props.minDistance).toBe(ORBIT_LIMITS.minDistance)
    expect(props.maxDistance).toBe(ORBIT_LIMITS.maxDistance)
  })

  it('auto-rotates on mount', () => {
    stubWebGL(true)
    render(<Stage />)
    expect(orbitProps.at(-1)!.autoRotate).toBe(true)
  })

  it('never auto-rotates when reduced motion is preferred', () => {
    reducedMotion = true
    stubWebGL(true)
    render(<Stage />)
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)
  })

  it('stops auto-rotating while the user interacts, and resumes after the idle delay', () => {
    vi.useFakeTimers()
    stubWebGL(true)
    render(<Stage />)

    const onStart = orbitProps.at(-1)!.onStart as () => void
    act(() => onStart())
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    const onEnd = orbitProps.at(-1)!.onEnd as () => void
    act(() => onEnd())
    expect(orbitProps.at(-1)!.autoRotate).toBe(false)

    act(() => vi.advanceTimersByTime(IDLE_RESUME_MS))
    expect(orbitProps.at(-1)!.autoRotate).toBe(true)
  })

  it('returns to unlit when the model reports a conversion failure', async () => {
    stubWebGL(true)
    render(<Stage />)

    await userEvent.click(screen.getByRole('button', { name: /lighting/i }))
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'lit')

    await userEvent.click(screen.getByTestId('break-materials'))
    expect(screen.getByTestId('model')).toHaveAttribute('data-mode', 'unlit')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- components/stage.test.tsx`
Expected: FAIL — cannot resolve `@/components/stage`.

- [ ] **Step 3: Write the stage**

Create `components/stage.tsx`:

```tsx
'use client'

import {
  AdaptiveDpr,
  Bounds,
  OrbitControls,
  PerformanceMonitor,
  Preload,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { FallbackPoster } from '@/components/fallback-poster'
import { HeroOverlay } from '@/components/hero-overlay'
import { Loader } from '@/components/loader'
import { ModelErrorBoundary } from '@/components/model-error-boundary'
import { SceneEnv } from '@/components/scene-env'
import { SushiModel } from '@/components/sushi-model'
import type { LightingMode } from '@/lib/materials'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { hasWebGL } from '@/lib/webgl'

export const IDLE_RESUME_MS = 3000

export const ORBIT_LIMITS = {
  minPolarAngle: 0.15 * Math.PI,
  maxPolarAngle: 0.48 * Math.PI,
  minDistance: 1.6,
  maxDistance: 9,
  autoRotateSpeed: 0.6,
} as const

/**
 * Exposes a frame count on window so the end-to-end suite can assert the
 * scene is genuinely rendering, rather than that a canvas element exists.
 */
function FrameProbe() {
  useFrame(() => {
    const scope = window as unknown as { __sushiFrames?: number }
    scope.__sushiFrames = (scope.__sushiFrames ?? 0) + 1
  })
  return null
}

export function Stage() {
  // Stage is loaded with ssr: false, so probing during the initial render is safe.
  const [webglAvailable] = useState(hasWebGL)
  const [mode, setMode] = useState<LightingMode>('unlit')
  const [spinning, setSpinning] = useState(true)
  const [degraded, setDegraded] = useState(false)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')

  const prefersReducedMotion = usePrefersReducedMotion()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'unlit' ? 'lit' : 'unlit'))
  }, [])

  // The model keeps its authored materials on a conversion failure; all this
  // has to do is stop claiming the scene is lit.
  const handleConversionError = useCallback(() => setMode('unlit'), [])

  const handleInteractionStart = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    setSpinning(false)
  }, [])

  const handleInteractionEnd = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setSpinning(true), IDLE_RESUME_MS)
  }, [])

  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
  }, [])

  // Stop burning GPU on a scene nobody is looking at.
  useEffect(() => {
    const element = wrapper.current
    if (!element || typeof IntersectionObserver === 'undefined') return

    let onScreen = true
    let tabVisible = !document.hidden
    const sync = () => setFrameloop(onScreen && tabVisible ? 'always' : 'never')

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting
        sync()
      },
      { threshold: 0 },
    )
    observer.observe(element)

    const onVisibilityChange = () => {
      tabVisible = !document.hidden
      sync()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  if (!webglAvailable) {
    return <FallbackPoster reason="no-webgl" />
  }

  return (
    <div ref={wrapper} className="absolute inset-0">
      <ModelErrorBoundary>
        <Canvas
          frameloop={frameloop}
          shadows
          dpr={degraded ? 1 : [1, 2]}
          camera={{ fov: 35, position: [3.4, 2.4, 3.4], near: 0.1, far: 100 }}
          gl={{ antialias: true }}
        >
          <PerformanceMonitor onDecline={() => setDegraded(true)} />
          <AdaptiveDpr pixelated />
          <FrameProbe />

          <SceneEnv mode={mode} />

          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.15}>
              <SushiModel mode={mode} onConversionError={handleConversionError} />
            </Bounds>
            <Preload all />
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate={spinning && !prefersReducedMotion}
            autoRotateSpeed={ORBIT_LIMITS.autoRotateSpeed}
            minPolarAngle={ORBIT_LIMITS.minPolarAngle}
            maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
            minDistance={ORBIT_LIMITS.minDistance}
            maxDistance={ORBIT_LIMITS.maxDistance}
            onStart={handleInteractionStart}
            onEnd={handleInteractionEnd}
          />
        </Canvas>
      </ModelErrorBoundary>

      <HeroOverlay mode={mode} onToggleMode={toggleMode} />
      <Loader />
    </div>
  )
}

export default Stage
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- components/stage.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 5: Write the client-side dynamic wrapper**

`next/dynamic` with `ssr: false` throws inside a Server Component, so the import lives here.

Create `components/stage-loader.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'

const Stage = dynamic(() => import('@/components/stage'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#faf4ea_0%,#e7dccb_55%,#d8c9b3_100%)]" />
  ),
})

export function StageLoader() {
  return <Stage />
}
```

- [ ] **Step 6: Verify the whole suite and the type-check pass**

```bash
npm test
npx tsc --noEmit
```

Expected: all tests pass; `tsc` exits 0.

- [ ] **Step 7: Commit**

```bash
git add components/stage.tsx components/stage.test.tsx components/stage-loader.tsx
git commit -m "feat: assemble interactive stage with orbit controls and idle auto-rotate"
```

---

### Task 10: The page (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`)

Deliverable: the actual landing page — metadata, GLB preload hint, the hero section, and the below-the-fold content — running in the browser.

**Files:**
- Modify: `app/layout.tsx` (replace the scaffold's version)
- Modify: `app/page.tsx` (replace the scaffold's version)
- Modify: `app/globals.css` (add the palette tokens)
- Test: `app/page.test.tsx`

**Interfaces:**
- Consumes: `StageLoader` from `@/components/stage-loader`.
- Produces: the rendered route `/`.

- [ ] **Step 1: Write the failing test**

Create `app/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/stage-loader', () => ({
  StageLoader: () => <div data-testid="stage" />,
}))

import Home from '@/app/page'

describe('Home', () => {
  it('mounts the stage', () => {
    render(<Home />)
    expect(screen.getByTestId('stage')).toBeInTheDocument()
  })

  it('documents the model below the fold', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /about the model/i })).toBeInTheDocument()
  })

  it('states the facts that were read out of the GLB', () => {
    render(<Home />)
    expect(screen.getByText(/KHR_materials_unlit/)).toBeInTheDocument()
    expect(screen.getByText(/^2 meshes/i)).toBeInTheDocument()
  })

  it('credits the source of the asset', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /credit/i })).toBeInTheDocument()
  })

  it('lists what the page is built with', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /built with/i })).toBeInTheDocument()
    expect(screen.getByText(/react-three-fiber/i)).toBeInTheDocument()
  })

  it('anchors the About link target', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('#about')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- app/page.test.tsx`
Expected: FAIL — the scaffold page has none of this content.

- [ ] **Step 3: Write the page**

Replace `app/page.tsx` entirely:

```tsx
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
```

- [ ] **Step 4: Write the layout**

Replace `app/layout.tsx` entirely:

```tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sushi — Handcrafted in WebGL',
  description:
    'A low-poly sushi set rendered in the browser with react-three-fiber, shown with its authored unlit materials and with a converted PBR treatment.',
}

export const viewport: Viewport = {
  themeColor: '#efe7dc',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          The GLB is the largest thing on the critical path and is fetched by a
          lazily-imported client chunk, so the browser would otherwise not
          learn about it until late.
        */}
        <link rel="preload" href="/models/sushis.glb" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Add the palette**

Append to `app/globals.css`:

```css
@theme inline {
  --color-shell: #efe7dc;
  --color-ink: #211a13;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-shell);
  color: var(--color-ink);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- app/page.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 7: Verify it actually renders in a browser**

```bash
npm run build
npm run dev
```

Open `http://localhost:3000`. Confirm by eye: the sushi is visible, centred, sitting on the floor with a shadow under it; it rotates by itself; dragging rotates it and the spin resumes about three seconds after releasing; the model cannot be orbited below the floor; the Unlit/Lit toggle visibly changes the shading; the About link scrolls to the second section.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/page.tsx app/page.test.tsx app/globals.css
git commit -m "feat: build the landing page around the sushi stage"
```

---

### Task 11: End-to-end coverage

Deliverable: a Playwright suite proving the page renders real frames in a real browser and that the toggle works — the one thing the mocked component tests cannot show.

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/landing.spec.ts`
- Modify: `package.json` (add `test:e2e`)

**Interfaces:**
- Consumes: the `window.__sushiFrames` counter written by `FrameProbe` in `components/stage.tsx`.
- Produces: the `test:e2e` script.

- [ ] **Step 1: Install Playwright and its browser**

```bash
npm install --save-exact --save-dev @playwright/test@1.62.1
npx playwright install chromium --with-deps
```

- [ ] **Step 2: Add the Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

- [ ] **Step 3: Add the script**

In `package.json`, inside `"scripts"`, add:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 4: Write the failing spec**

Create `e2e/landing.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

type FrameScope = { __sushiFrames?: number }

test.describe('sushi landing page', () => {
  test('renders real frames into a canvas', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Handcrafted in WebGL')
    await expect(page.locator('canvas')).toBeVisible()

    // Proves the render loop is running, not merely that a canvas exists.
    await expect
      .poll(() => page.evaluate(() => (window as FrameScope).__sushiFrames ?? 0), {
        timeout: 20_000,
      })
      .toBeGreaterThan(5)
  })

  test('toggles between unlit and lit materials', async ({ page }) => {
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /toggle lighting mode/i })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(toggle).toHaveText(/unlit/i)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle).toHaveText(/lit/i)
  })

  test('keeps rendering after the model is dragged', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2, { steps: 12 })
    await page.mouse.up()

    const before = await page.evaluate(() => (window as FrameScope).__sushiFrames ?? 0)
    await expect
      .poll(() => page.evaluate(() => (window as FrameScope).__sushiFrames ?? 0))
      .toBeGreaterThan(before)
  })

  test('serves the below-the-fold content to crawlers and readers', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /about the model/i })).toBeVisible()
    await expect(page.getByText(/KHR_materials_unlit/)).toBeVisible()
    await expect(page.getByRole('heading', { name: /built with/i })).toBeVisible()
  })

  test('serves the GLB itself', async ({ page }) => {
    const response = await page.request.get('/models/sushis.glb')
    expect(response.status()).toBe(200)
    // Measured from the body rather than content-length: that header is
    // absent under chunked transfer, which would fail the test for the
    // wrong reason.
    expect((await response.body()).byteLength).toBeGreaterThan(1_000_000)
  })
})
```

- [ ] **Step 5: Run the spec**

Run: `npm run test:e2e`
Expected: 5 tests pass. Headless Chromium renders WebGL through SwiftShader, so the frame counter will advance even without a GPU.

- [ ] **Step 6: Run everything once more**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:e2e
```

Expected: all four exit 0.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/landing.spec.ts package.json package-lock.json
git commit -m "test: add end-to-end coverage for the sushi landing page"
```

---

## Remaining Open Item

**The asset licence is unresolved.** The GLB was generated by Sketchfab, which usually means a CC-BY-style licence requiring named attribution. The Credit section currently says attribution is "to be confirmed". Before this page is deployed anywhere public, the original Sketchfab listing must be located and the required author credit and licence link written into that section. This is a publishing blocker, not an implementation one, so it does not gate any task above.
