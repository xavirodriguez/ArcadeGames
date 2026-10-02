# Hit&Run

**Option A clone** of `echorunner` — same platformer + pulse combat loop, new identity.

## Status

- Branch: `feature/hit-and-run`
- `gameId`: `hitandrun`
- Route: `/hitandrun`
- Core: `HitAndRunGame` currently extends `EchoRunnerGame` with a distinct `gameId` so scores, story and routing are isolated.
- Types, config schema, palette, story encounter and Expo shell are fully renamed.

## Next steps (kids / violent modes)

1. Detach the full body of `HitAndRunGame` from EchoRunner (copy systems/blueprints into this folder).
2. Add `gameOptions.mode: "kids" | "violent"`:
   - **kids** — softer enemies, no gore, more collectibles / puzzle focus
   - **violent** — Metal Slug-style weapons, stronger feedback, more aggressive AI
3. Wire menu entry + i18n keys under `t.hitandrun.*`.

## Run

```bash
pnpm start
# open /hitandrun
```
