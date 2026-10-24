# Fase 0–3 — Aquí hay dragones

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
- [x] Helpers: `islandPhaseFromRatio`, visual scale/alpha
- [x] Systems registered in `SpaceInvadersGameScene`
- [ ] Wire `parchment_chart` in `SpaceInvadersGame.initializeRenderer` (restore if stubbed)
- [ ] Shield drawer customGeom (restore if stubbed)
- [ ] Visual wind rhumb lines on HUD
