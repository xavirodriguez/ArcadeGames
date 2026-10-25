# Hit&Run → Fantasy Belt-Scroll Beat'em-up

Conversión de **platformer run-and-gun** a **belt-scroll beat'em-up** fantasy
(melee + armas a distancia, single-player primero).

**Branch:** `feature/belt-brawler-fantasy` · **gameId:** `hitandrun`

## Dirección de diseño

| Pilar | Decisión |
|-------|----------|
| Movimiento | Libre en X + profundidad (Y). Hop corto opcional en Z |
| Cámara | Gates por sección hasta limpiar enemigos |
| Combate | Combos melee + throw + special; armas fantasy + proyectiles |
| Estética | Fantasy oscuro: goblins, esqueletos, orcos, wraiths |
| Debug Overlay | Visualizador de profundidad, carriles `depthMin`/`depthMax` y colliders |

## Modelo de Profundidad y Elevación (Belt-Scroll)

> **Transform.y** = línea de pies en el plano del suelo (eje Y = profundidad entre `depthMin=280` y `depthMax=520`).
> **elevation.z** = altura sobre el suelo en píxeles (`z >= 0`, afectado por salto, hop y knockback).

### Reglas de Render y Física
- **Pies anclados:** El sprite se dibuja desplazado hacia arriba por `-z`. El origen `(x, y)` son los pies.
- **Sombra en el suelo:** Se dibuja siempre en el plano del suelo `(0, 0)` atenuada y escalada según elevación `z`.
- **Filtro de Colisión y Daño (`depthZOverlap`):** Unificado para melee y proyectiles. Un ataque/proyectil acierta solo si:
  1. La diferencia en profundidad `|yAttacker - yTarget| <= halfDepth` (~20px).
  2. Los rangos de elevación `[zA, zA + heightA]` y `[zB, zB + heightB]` se solapan.
- **Knockback en Elevación:** El empuje vertical aplica un impulso sobre `elevation.vz` en el eje Z (elevación), conservando la posición en profundidad `Transform.y`.
- **Límite de Juggle:** Se rastrea `juggleCount` mientras `grounded === false` para limitar combos aéreos infinitos.
- **Squash de Aterrizaje:** Al cruzar `z -> 0`, se activa `landTimer` en `BeltElevationComponent` que aplica un squash elástico decreciente `squash = 1 + k * easeOut(landTimer / duration)`.
- **Escala por Profundidad:** `BeltDepthScaleSystem` aplica `lerp(0.92, 1.0, depthT(y))` en `VisualOffset.scaleX/scaleY` para perspectiva puramente visual.

## Overlay de Debug (`HitRunDebugOverlay`)

Activable mediante el recurso de mundo:
```ts
world.setResource("HitRunDebugOverlayEnabled", true);
```
Dibuja:
- Líneas cian discontinuas de profundidad mínima (`depthMin: 280`) y máxima (`depthMax: 520`).
- Línea de pies `Transform.y` e indicador de elevación `z` por entidad.
- Cajas AABB de colliders (rojo para hitboxes, verde para hurtboxes, azul para colisionadores físicos).

## Estructura

- `belt/` — movimiento, elevación, escala por profundidad y cámara gated
- `combat/` — helper puro `depthZOverlap` para filtrado de combate en 3D-box
- `fantasy/` — paletas, enemigos, armas
- `melee/` — melee data-driven y combos
- `rendering/` — drawers de canvas + overlay de debug

## Boot

```ts
registerBeltSystems(this.world);
registerHitRunFeedback(this.world);
registerHitRunHurt(this.world);
registerHitRunMelee(this.world);
registerHitRunCombat(this.world);
```
