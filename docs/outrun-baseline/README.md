# Out Run visual baseline (roadmap T0.3)

Deterministic PNG frames of the Out Run renderer, captured from the Expo web
build in headless Chromium through Playwright.

## Command

```bash
pnpm exec playwright test e2e/outrun-baseline.spec.ts
```

The suite drives `window.__outrunDebug`, the E2E control surface that the Out Run
screen (`src/app/outrun/index.tsx`) installs **only** when
`EXPO_PUBLIC_E2E_HOOKS=true` — the Playwright web server already exports that
flag (`playwright.config.ts`). The surface fixes the seed, parks the camera on a
deterministic `playerZ`, freezes the simulation and reads the state back
(`src/games/outrun/debug/OutrunE2EDebug.ts`).

## Fixed parameters

| Parameter | Value |
|---|---|
| Seed | `20260101` (loaded through `/outrun?seed=20260101`) |
| Track length | `97200` world units (486 segments × 200) |
| Viewport | 1280×720 (`playwright.config.ts`) |
| Canvas backing store | 800×600 (`config.WIDTH` / `config.HEIGHT`) |
| `playerX` | `0` |
| `speed` | `0` |
| Simulation | paused (`IsPaused`) before every frame |

The capture happens while the race is still in its countdown phase: traffic only
moves once the countdown ends, so the frozen world keeps the deterministic spawn
state of the seeded track. The suite asserts that two consecutive frames of the
same scene are byte-identical, so a stored frame can be compared across commits.

A second test in the same file switches the seed at runtime
(`window.__outrunDebug.setSeed(4242)`) and asserts that the game is rebuilt with
the new deterministic track.

## Captures

| File | `playerZ` | Scene |
|---|---|---|
| `straight.png` | 1200 | Straight segment (`curve = 0`, `hill = 0`) |
| `curve-left.png` | 35000 | Strongest left curve of the track |
| `curve-right.png` | 31000 | Strongest right curve of the track |
| `crest.png` | 19000 | First crest (`hill` flips from up to down) |
| `descent.png` | 66600 | Middle of the longest descending stretch |
| `scenario-coast.png` | 24300 | Scenario change — coast (25 % of the lap) |
| `scenario-desert.png` | 53460 | Scenario change — desert (55 % of the lap) |
| `scenario-mountain.png` | 68040 | Scenario change — mountain/sierra (70 % of the lap) |
| `before-wrap-end.png` | 97199 | Lap close — last world unit before the wrap (pre-fix) |
| `before-wrap-start.png` | 0 | Lap close — first world unit after the wrap (pre-fix) |
| `after-wrap-end.png` | 97199 | Lap close — last world unit before the wrap (post-fix) |
| `after-wrap-start.png` | 0 | Lap close — first world unit after the wrap (post-fix) |

Every frame except the `before-wrap-*` pair was captured with the curvature
parallax fix of roadmap task T3.3 in place; the `before-wrap-*` pair documents
the behaviour before that fix.

## Lap-close pair

`before-wrap-end.png` and `before-wrap-start.png` bracket the lap close: the
camera sits one world unit before `playerZ` wraps and then at the wrapped
position. The pair documents the curvature parallax jump that roadmap task T3.3
fixed — before the fix the horizon layers were displaced by the accumulated
curvature of the whole lap at the wrap.

Measured on the captured frames (same camera position, before vs after the fix):

| Pair | Pixels changed | Bounding box of the change |
|---|---|---|
| `before-wrap-end.png` vs `after-wrap-end.png` | 65 687 / 921 600 (7.13 %) | `(0, 131) – (1280, 332)` (horizon band) |
| `before-wrap-start.png` vs `after-wrap-start.png` | 2 183 / 921 600 (0.24 %) | `(4, 666) – (54, 716)` (touch-control overlay, not the canvas) |

So the fix moves the horizon layers only where the jump used to happen: at the
end of the lap. The wrapped position (`playerZ = 0`) keeps the same horizon.

The `after-wrap-*.png` frames are the same two positions captured once the fix
landed; they are produced by the same command with a different tag:

```bash
OUTRUN_BASELINE_WRAP_TAG=after pnpm exec playwright test e2e/outrun-baseline.spec.ts
```

## Renderer backend

The frames above come from the **Canvas2D** backend. The suite prints
`OUTRUN_CANVAS_BACKEND>>>canvas2d<<<` and asserts it: the Out Run screen mounts
`CanvasRenderer` (`components/CanvasRenderer.tsx`), never the Skia one
(`components/GameRenderer.tsx`), so the Skia backend is not reachable from the
`/outrun` route and no Skia baseline can be captured from it.
