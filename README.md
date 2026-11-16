# LUMO RING landing page

Scroll-driven 3D landing page for a fictional smart ring (swap the brand later).
Vite + React + TypeScript (strict), three `WebGPURenderer` with automatic WebGL2 fallback, TSL materials,
@react-three/fiber v9, Lenis, GSAP (ScrollTrigger + SplitText), detect-gpu.

> **Status: written, not yet run.** The code was authored in a sandbox without npm access, so nothing has been
> compiled, built or tested. Run the steps below and send back any errors. Every gate is "not verified" until you have run it.

## Run it

```bash
npm install              # also copies fonts + GPU benchmarks into /public (postinstall)
npm run pin              # once: rewrites package.json to exact installed versions, checks three / @types/three match
npm run dev              # http://localhost:5173
npm run build            # tsc --noEmit + production build
npm run test:install     # once: downloads the Playwright browser
npm run verify           # typecheck, build, placeholders, size budget, all Playwright gates, report
npm run check:placeholders
npm run lighthouse       # mobile Lighthouse against the production preview
```

Debug flags: `?tier=high|mid|low|poster` and `?renderer=webgl|webgpu`.
`window.__lumo` exposes `maxCalls` (max draw calls seen), `backend`, `frames`, `paused`, and the shared state.

## Folder structure

```
index.html                 title, description, Open Graph, font preloads
public/                    favicon, fonts/ and gpu-benchmarks/ (copied by scripts/assets.mjs)
src/content.ts             ALL business facts and fact-dependent copy (one file)
src/App.tsx                tier resolve, lazy 3D chunk, lazy motion chunk
src/lib/                   tier.ts (detect-gpu + software check), flags.ts, labelLayout.ts (pure)
src/scroll/                state.ts (shared S.p), ranges.ts (DOM-measured section ranges -> curve u)
src/gl/                    path.ts (camera curve + parameter table), ring.ts, env.ts (PMREM), particles.ts, world.ts, SceneRoot.tsx
src/motion/                index.ts (Lenis, ScrollTrigger, SplitText), pointer.ts (cursor, magnetic CTA)
src/sections/              Hero/Problem/Science/Materials/How, Anatomy, Waitlist, Footer
scripts/                   assets, pin, placeholders, size, lighthouse, build-mock, report
tests/                     Playwright gates c-j
```

## How the scroll works

Lenis and one ScrollTrigger write a single `S.p` (0-1). Section ranges are measured from the DOM on load, font load and
resize (`measureRanges`), turned into `[progress, u]` breakpoints, and the scene damps `S.p`, converts it to `u`, then samples
the camera `CatmullRomCurve3` and every object parameter (`sampleRow`) with that same `u`. Nothing is hard-coded to pixel offsets.

## Gates and what they need

| Gate | Command / file | Notes |
|---|---|---|
| a. tsc + build | `npm run build` | |
| b. placeholders | `npm run check:placeholders` | allowlist in `scripts/placeholder-allowlist.json`. Vendor code inside `dist` may need an allowlist entry on first run |
| c. rendered text | `tests/01-text.spec.ts` | 375/768/1440, 9 scroll stops + 9 anatomy stops, 3D / poster / reduced motion / form states |
| d. links | `tests/02-links.spec.ts` | motion + reduced motion, tab order, focus visible |
| e. layout, CLS | `tests/03-layout.spec.ts` | no h-scroll, no text over the ring, anatomy label rects |
| f. contrast | `tests/03-layout.spec.ts` | hides text, screenshots the composited page, samples pixels behind every text node |
| g. console / network | `tests/04-console-3d.spec.ts` | |
| h. 3D | `tests/04-console-3d.spec.ts` | non-blank, draw calls < 100, flags, hidden tab pause |
| i. form | `tests/05-form.spec.ts` | uses a second build (`dist-mock`, port 4174) with `VITE_WAITLIST_URL=/api/waitlist` |
| j. axe | `tests/06-axe.spec.ts` | |
| k. Lighthouse | `npm run lighthouse` | writes `test-results/lighthouse.json` |

If your machine falls back to a software GPU (SwiftShader / llvmpipe), 3D and WebGPU results are **not verified** and no frame rate
should be claimed from them. Real hardware is needed for that.

## Swap these

- Brand name, company, year, address, email, launch wording, disclaimer: `src/content.ts` (`business`)
- All copy, including the three anatomy texts, step text and finish text: `src/content.ts` (`copy`)
- Spec facts (sizes, sensors, battery, validation): the honest wording in `copy.anatomy` and `copy.science` is a stand-in until real facts exist
- Colour tokens: `:root` in `src/styles.css`, and `PAL` in `src/gl/ring.ts` (keep both in sync)
- Fonts: replace the files in `public/fonts`, and the `@font-face` rules in `src/styles.css`, and the preloads in `index.html`
- Waitlist endpoint: `VITE_WAITLIST_URL` (see `.env.example`). It receives `POST {"email": "..."}`
- Privacy text: `copy.privacy` in `src/content.ts`. **Flag for legal review.** It describes only what this page does
- Open Graph image: none is set yet. Add `og:image` and `og:url` once there is an image and a production URL
