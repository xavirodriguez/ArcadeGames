# Cierre de Fase 5 — Investigación de mejoras opcionales de tipos (P4)

> Rama: `chore/tipos-fase5`. Cada cifra proviene de un comando ejecutado (se indica el comando y la salida resumida).

## Tarea A — Firma de `emitDeferred`

**Qué se ejecutó:**
```
sed -n '251,310p' packages/core/src/events/EventBus.ts
```
**Salida relevante:**
```
emit<K extends keyof CombinedEvents<TEvents> & string>(
  event: K,
  payload: CombinedEvents<TEvents>[K]
): void { ... }

emitDeferred<K extends keyof CombinedEvents<TEvents> & string>(
  event: K,
  payload: CombinedEvents<TEvents>[K]
): void { ... }
```

**Resultado:** `emitDeferred` **ya es genérico** sobre `CombinedEvents<TEvents>` (igual que `emit`, `on`, `once`, `off`). La afirmación del informe de Fase 5 ("`emitDeferred` acepta `string`") es **falsa**. No se cambió nada.

**Problema adyacente (no corregido):** existen casts a `EventBus` no genérico que borran el registro y permiten nombres arbitrarios:
```
const eventBus = world.getEventBus() as EventBus;
```
Ocurre en `packages/core/src/systems/BaseGameStateSystem.ts:89`, `packages/gameplay-kit/src/combat/systems/CombatSystem.ts:142`, `packages/gameplay-kit/src/spawn/systems/SpawnDirectorSystem.ts:59/115`, `packages/gameplay-kit/src/arcade/systems/AchievementSystem.ts:57/173`, `src/games/hitandrun/systems/HitRunCombatSystem.ts:123`, `src/games/shared/story/StoryDirectorSystem.ts:56`. Corregirlo exigiría constreñir `TEvents` en esos sistemas; fuera del alcance de esta tarea.

## Tarea B — Spike de `EntityId` (branded)

**Distinción en el código:** sí existe. `Entity = number` empaqueta índice (20 bits) + generación (12 bits) mediante `packEntity`/`unpackEntityIndex`/`unpackEntityGeneration` (`packages/core/src/ecs/Entity.ts`). El índice de storage (`EntityIndex`) se extrae con `unpackEntityIndex`.

**Experimento:** rama temporal `temp/entity-brand`, brand aplicado solo a `Entity`:
```
export type Entity = number & { readonly __brand: "Entity" };
```
con `as Entity` en `packEntity`.

**Comandos:**
```
pnpm run typecheck:core  -> 111 errores
NODE_OPTIONS=... npx tsc -p tsconfig.json --noEmit -> 1578 errores (app)
```
Total: **1689 errores** (umbral: < 40).

**Muestreo reproducible:** 40 errores tomados cada 42.º de la lista combinada (`awk 'NR % 42 == 0'`, N = 1689/40 ≈ 42). Resultado: todos son ruido (`number` → `Entity` en call sites, genéricos de `World`, tests/mocks) o genéricos de `World`. No se identificó ningún error de tipo (a) "mezcla real de id e índice".

**Decisión:** descartado (1689 ≫ 40). No se integró.

## Tarea C — Muestreo de `noUncheckedIndexedAccess`

**Comando (core):**
```
cd packages/core && npx tsc --noEmit --noUncheckedIndexedAccess -p tsconfig.json
```
**Salida:** 689 errores totales → **657 en producción, 32 en tests**. (Cifra del informe confirmada.)

**Muestreo reproducible:** 30 errores de producción tomados cada 21.º de la lista (`awk 'NR % 21 == 0'`, N = 657/30 ≈ 21.9), tomados de `/tmp/nuia-prod.txt`.

**Clasificación de los 30:**
- (a) bug potencial real: ~1–2 (`NetworkManager` acceso a `soaComponentData[type]`, `SceneManager` asignación de escena).
- (b) índice acotado por bucle/invariante no visto por el compilador: ~24.
- (c) acceso a typed array del storage SoA: ~2 (`SoADeserializer`, `SparseSetStorage`).
- (d) otro: ~2.

**Conteos en otros paquetes (solo número, sin clasificar):**
```
arcade-sound-kit: 260
core: 689
gameplay-kit: 696
network-colyseus: 655
network: 18
react-native: 656
renderer-canvas: 663
renderer-skia: 661
server: 1269
```

**Recomendación:** casi todos los errores son (b)/(c); dejar `noUncheckedIndexedAccess` apagado en core. El único paquete con coste bajo es `network` (18 errores): candidato a adopción incremental si se desea.

## Comprobación D — Zod en server

**Comando:**
```
grep -rn "onMessage\|safeParse\|\.parse(" server/src
```

| Room | Mensaje | Validado con `safeParse` |
|---|---|---|
| BaseRoom | `input` | ✅ `BaseInputFrameSchema` |
| BaseRoom | `sync_tick` | ❌ (tipado `SyncTickData`, sin `safeParse`) |
| AsteroidsRoom | `start_game` | ❌ |
| AsteroidsRoom | `metrics` | ❌ |
| GeometryWarsRoom | `start_game` | ❌ |
| SpaceInvadersRoom | `start_game` | ❌ |
| FlappyBirdRoom | `jump` | ❌ |
| PongRoom | `move` | ❌ (payload tipado `any`) |

Las opciones de sala y joins (`BaseRoomOptionsSchema`, `BaseJoinOptionsSchema`, `RoomOptionsSchema`) sí pasan por `safeParse`. No se añadieron schemas (fuera de alcance).

## Comprobación E — Contador de casts

**Por qué `CombatSystem` aparece con `as Parameters<...>` "no contabilizado":** el Typecast Ratchet (`scripts/typecast-ratchet.ts`) solo cuenta expresiones `as any` y `as unknown` (nodo de tipo literal `any`/`unknown`). Un cast `as Parameters<WorldCommandBuffer<TComponents>["addComponent"]>[1]` no se cuenta.

**Recuento con AST (todas las aserciones de tipo, cualquier destino) en los cinco módulos de la tabla:**

| Módulo | Aserciones totales | De las cuales `as any`/`as unknown` (ratchet) |
|---|---|---|
| `packages/gameplay-kit/src/combat/systems/CombatSystem.ts` | 15 | 0 |
| `src/games/shared/rendering/SharedVFX.ts` | 30 | 5 |
| `src/games/geometrywars/scenes/GeometryWarsGameScene.ts` | 22 | 9 |
| `packages/renderer-canvas/src/CanvasRenderer.ts` | 18 | 7 |
| `packages/core/src/physics/systems/PlatformerMovementSystem.ts` | 24 | 5 |

Comando usado (script temporal en `scripts/count-as.ts`, eliminado tras la medición):
```
NODE_OPTIONS=... pnpm exec tsx scripts/count-as.ts <5 archivos>
```

## Lo que no se pudo comprobar

- `Tick`, `Seed` y `NetworkSequence` (branded): descartados explícitamente por el enunciado; no se investigaron.
- Si `emitDeferred` acepta `string` en consumidores con cast a `EventBus` no genérico: se identificaron los call sites, pero no se midió cuántos compilarían con la firma genérica sin el cast (fuera de alcance, requiere constreñir `TEvents`).
- Impacto de habilitar `noUncheckedIndexedAccess` en `server/`: solo se contó (1269); no se clasificó.
- Validación Zod de mensajes `start_game`, `metrics`, `jump`, `move`, `sync_tick`: no se añadieron schemas (prohibido por las reglas).
EOF
echo done