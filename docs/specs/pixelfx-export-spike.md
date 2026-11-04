# PixelFX Export Spike

**Status:** Adapter validated against fixtures shaped like real `node tools/render.mjs <id> --sheet` output.
**Upstream:** patch-gg/pixelfx (main)

## Commands

```bash
cd pixelfx
node tools/render.mjs impacts/hit-flash --sheet --seed 17
node tools/render.mjs explosions/cartoon-pow --sheet --seed 5
```

Output: `<name>.png` + `<name>.json` with `meta.pixelfx` (`fps`, `loop`, `frameSize`, `pivot: [x,y]`, `columns`, optional `act`).

## Adapter mapping

| PixelFX | ArcadeGames |
|---------|-------------|
| `frames[].frame` | `SpriteFrameRect` |
| `meta.pixelfx.fps` | `frameDuration = 1 / fps` |
| `meta.pixelfx.loop` | `loop` |
| `meta.pixelfx.pivot` `[x,y]` | `anchor = { x: px/fw, y: py/fh }` |
| `meta.pixelfx.act` | preserved for Juice data |

**TTL:** `durationSeconds = frameCount / fps`

## Spike results

```bash
node scripts/pixelfx/spike-adapt-fixtures.mjs
```

| Effect | Frames | Size | Duration | Anchor | Scale |
|--------|--------|------|----------|--------|-------|
| hit-flash | 16 | 80×64 | 0.533s | (0.5, 0.8438) | ~0.9 |
| cartoon-pow | 32 | 184×144 | 1.067s | (0.5, 0.5) | ~0.45 |

Glow is baked into RGBA; no dual light buffer in V1.
