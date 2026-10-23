# Sesión 5 — Runtime safety y baseline de performance

**Branch:** `feat/outrun-session5-runtime-safety-baseline`
**Base:** `feat/outrun-session4-traffic-driving-feel`

## T5.1 — Invariante de avance

### Cálculo real del engine

| Parámetro | Valor | Fuente |
|-----------|-------|--------|
| `maxDelta` | **0.25 s** | `packages/core/src/loop/GameLoop.ts`, `BaseGame` |
| `maxSpeed` | 12000 | `OutrunConfigSchema` |
| `segmentLength` | 200 | idem |
| `collisionZ` | 120 (`0.6 * segmentLength`) | `TrafficSystem` |
| `d_frame` @ maxDelta | **3000** | `maxSpeed * maxDelta` |
| Segmentos saltables / frame | **15** | `3000 / 200` |
| Substeps mínimos anti-túnel | **25** | `ceil(3000 / 120)` |

| Régimen | dt | travel | Substeps S4 (fijo 4) | ¿OK? |
|---------|-----|--------|----------------------|------|
| 60 fps | 1/60 | 200 | 4 | Sí |
| Hitch / maxDelta | 0.25 | 3000 | 4 | **No** |

### Decisiones

1. **Colisión:** substeps **adaptativos** `collisionSubstepsForFrame(..., min=4, max=32)` — sin cap de velocidad.
2. **`currentSegment`:** scan lineal correcto tras saltos multi-segmento → `findSegmentIndexAtZ`. Sin binary search (no bottleneck).
3. T4.4 de sesión 4 **cerrada** para maxDelta.

## T5.2 — Baseline

| Trabajo | Coste (Node microbench) |
|---------|-------------------------|
| `findSegmentIndexAtZ` n=400 | ~0.4 µs |
| Proxy `projectRoad` 300 segs | ~3.3 µs |
| Frame Canvas/Skia completo | Requiere device (método en informe) |

`drawDistance` producción = **300**.

## T5.3 — Optimizaciones

**Ninguna** — sin bottleneck medido en hot path de simulación.

## T5.4 — Regresión

```bash
npx jest src/games/outrun/__tests__/RoadProjection.test.ts
npx jest src/games/outrun/__tests__/RoadStretch.test.ts
npx jest src/games/outrun/__tests__/OutrunFog.test.ts
npx jest src/games/outrun/__tests__/TrafficSteering.test.ts
npx jest src/games/outrun/__tests__/RuntimeSafety.test.ts
npx jest src/games/outrun/__tests__/OutrunGameplay.test.ts
```
