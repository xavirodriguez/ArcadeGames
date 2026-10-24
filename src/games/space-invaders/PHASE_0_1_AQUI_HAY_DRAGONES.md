# Fase 0–4 — Aquí hay dragones

## Fase 0 (Opción A)
- Ids: `aqui_hay_dragones` | `nautical-chart`
- Activación: `new SpaceInvadersGame({ theme: aquiHayDragonesConceptPack })`

## Fase 1
- Palette tokens, geometry stubs, registry, tests

## Fase 2
- Lavados (WASH_OFFSET + alpha), ojos parchment, isla geometry
- `NauticalChartBackground` (Canvas + Skia)
- Background effect `parchment_chart`

## Fase 3
- [x] `NauticalWindSystem` — force 0–3, lateral accel on bullets
- [x] `IslandErosionSystem` — opacity/visibility from Shield HP
- [x] Systems registered in `SpaceInvadersGameScene`

## Fase 4
- [x] HUD náutico §10: Leguas, Viento + flecha, rosa, Tripulación (mini galeones)
- [x] Líneas de rumbo desde la rosa (§8.3), activa según viento
- [x] Ondas inclinadas / estiradas según fuerza del viento (§8.2)
- [x] `registerNauticalChartCanvasEffects` registra `parchment_chart` + `nautical_hud`
- [ ] Restaurar `SpaceInvadersGame.ts` / `SpaceInvadersCanvasVisuals.ts` si siguen stub
- [ ] HUD Skia parity (opcional)
- [ ] Sondas de profundidad (§8.4)

### Wiring local (si Game/Canvas están stub)
```ts
// SpaceInvadersGame.initializeRenderer → canvas:
const { registerNauticalChartCanvasEffects } = require("./rendering/registerNauticalChartEffects");
registerNauticalChartCanvasEffects(r);
// skia:
const { registerNauticalChartSkiaEffects } = require("./rendering/registerNauticalChartEffects");
registerNauticalChartSkiaEffects(r);
```
