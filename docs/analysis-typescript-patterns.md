# Análisis de patrones TypeScript — Tiny Aster (ArcadeGames)

> Skill aplicada: `typescript-patterns`. Verificación previa: `typecheck:app`, `typecheck:core` y `check:agent-guardrails` pasan.
> Inventario cuantitativo: `docs/typecast-inventory.json` (`scripts/typecast-inventory.ts`).

## 1. Resumen

Monorepo TypeScript grande (≈1.860 archivos `.ts/.tsx`) con ECS genérico bien tipado y guardrails maduros.

**Fortalezas:** `World<TComponents,TEvents,TBlueprints>` + `ComponentRegistry`/`ComponentType`/`ComponentOf`; `const … as const` en lugar de `enum` (`GameLifecycleState`, `GameId`, `CanonicalActionName`); discriminated unions (`CampaignScreenPhase`); Zod en 40 archivos de frontera; type guards en puntos clave (`isGameId`, `isCanonicalActionName`); ratchet de casts.

**Deuda (F0):** 861 casts totales, de los cuales **229 en producción** (64 `as any` + 165 `as unknown`), 632 en tests, 0 en scripts. Hotspots de producción: `SharedVFX.ts` (24), `GeometryWarsGameScene.ts` (9), `CanvasRenderer.ts` (7), `CombatSystem.ts` (6), `PlatformerMovementSystem.ts` (5), `NullBaseGame.ts` (5), `FlappyBirdGame.ts` (5). Solo 27 type guards con predicado; 0 branded types (`__brand`).

## 2. Patrones bien aplicados

- Genericidad ECS en `packages/core/src/ecs/Component.ts` y `World.ts`.
- Const objects + `typeof …[keyof typeof …]` (sin `enum`).
- Discriminated unions en `src/hooks/campaign/useCampaignScreenPhase.ts`.
- Template literal types en `CanonicalActionName<TExtra>` y `GameId` (unión de literales derivada de `as const`).
- Zod en configs por juego, `NetTypes`, `ContentLoader`, `AssetLoader`, story DSL, server rooms.
- Type guards `value is T` en fronteras.

## 3. Anti-patrones y deuda (con decisiones de auditoría)

### 3.1 Casts en producción (229)
Causa raíz: sistemas genéricos que conocen nombres de componentes ("Damage", "Health") pero el compilador solo sabe que `TComponents extends ComponentRegistry`. Ejemplo: `CombatSystem` (6 casts). Solución propuesta: fortalecer contrato genérico mínimo (Fase 1 del plan), **no** crear registro universal sin inventariar consumidores.

### 3.2 Renderizadores (descartado como refactor global)
Ya existe `IDrawAdapter` con `CanvasDrawAdapter` y `SkiaDrawAdapter` (`src/games/shared/rendering/DrawAdapter.ts`). Los casts de `SharedVFX` (24) son adaptación de drawers a registros genéricos. Tarea: investigación acotada (Fase 3), sin nueva abstracción.

### 3.3 `isRecord` (no centralizar indiscriminadamente)
Implementaciones difieren (una excluye arrays, otra no). Consolidar solo con equivalencia semántica (Fase 4).

### 3.4 `NullBaseGame` (candidato real)
`snapshot()` construye objeto con `as unknown as WorldSnapshot`; casts en `GameplayFreezeMixin`. Investigar y corregir (Fase 2).

### 3.5 Branded types / template literal types / guards
Investigación opcional (Fase 5). No hay evidencia de confusión de tipos ni de insuficiencia cuantitativa. No confundir unión de literales (`GameId`) con template literal types (`combat:${'hit'|'death'}`).

### 3.6 Configuración TS
Activar `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` incrementalmente por paquete (empezar por `core`).

## 4. Recomendaciones priorizadas

Ver `docs/TYPE_SAFETY_REFACTOR_PLAN.md` (Fases 0–5). Orden: F0 ✅ → F1 (CombatSystem) → F2 (NullBaseGame) → F3 (SharedVFX, auditoría) → F4 (guards) → F5 (opcional).

## 5. Lo que no se hará

No crear nuevo sistema universal de renderizado; no aumentar artificialmente guards; no eliminar todos los casts; no branded types globales; no reescribir eventos con template literals; no centralizar todos los `isRecord`; no tocar rollback/snapshots en F1.

## 6. Métricas de referencia

| Métrica | Actual | Objetivo |
|---|---|---|
| Casts en producción | 229 | reducir por contrato verificable |
| Casts en tests | 632 | reducir con seams tipados |
| Type guards con predicado | 27 | ≥ donde haya contrato real |
| Branded types | 0 | investigación (F5) |
| Paquetes con `noUncheckedIndexedAccess` | 0 | empezar por core |
EOF
ls -l docs/analysis-typescript-patterns.md