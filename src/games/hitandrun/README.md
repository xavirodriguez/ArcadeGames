# Hit&Run

**Option A clone** of `echorunner` — platformer + run-and-gun feel (Metal Slug inspired), new identity.

## Status

- Branch: `feature/hit-and-run`
- `gameId`: `hitandrun`
- Route: `/hitandrun`
- Core: `HitAndRunGame` currently extends `EchoRunnerGame` with a distinct `gameId`.

## Task A — Juice / Feedback ✅

```
src/games/hitandrun/systems/
  HitRunFeedbackTypes.ts      # profiles data-driven por category
  HitRunFeedbackSystem.ts     # GameRules: hit-stop, shake, hitFlash
  registerHitRunFeedback.ts   # helper de registro
  index.ts
```

### Integración

```ts
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";

// en onRegisterSystems():
registerHitRunFeedback(this.world);
```

En sistemas de **Simulation** que deben pausar durante hit-stop:

```ts
import { isSimulationFrozen } from "./systems";

if (isSimulationFrozen(world)) return;
```

### Contrato

| Resource / evento | Uso |
|-------------------|-----|
| `combat:hit` / `combat:death` | Emitidos por `CombatSystem` (no tocar) |
| `HitStopRemaining` | Segundos de freeze global |
| `HitRunScreenShake` | `{ intensity, duration, elapsed }` — leído en render |
| `Render.hitFlashFrames` | Flash en víctima |

## Next steps

1. **Task B** — Arsenal data-driven (HMG, escopeta, lanzacohetes) con `category` → juice automático
2. **Task C** — WaveSystem + JSON de spawns
3. Detach completo de EchoRunner + modos `kids` / `violent`

## Run

```bash
git checkout feature/hit-and-run
pnpm start
# open /hitandrun
```
