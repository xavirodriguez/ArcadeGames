# Hit&Run → Fantasy Belt-Scroll Beat'em-up

Conversión en curso de **platformer run-and-gun** a **belt-scroll beat'em-up** fantasy
(melee + armas a distancia, single-player primero).

**Branch:** `feature/belt-brawler-fantasy` · **gameId:** `hitandrun`

## Dirección de diseño

| Pilar | Decisión |
|-------|----------|
| Movimiento | Libre en X + profundidad (Y). Hop corto opcional |
| Cámara | Gates por sección hasta limpiar enemigos |
| Combate | Combos melee + throw + special; armas fantasy |
| Estética | Fantasy oscuro: goblins, esqueletos, orcos, wraiths |
| Multijugador | Después de single-player sólido |

## Estructura

- `belt/` — movimiento + cámara gated
- `fantasy/` — palette, enemigos, armas
- `melee/ComboMeleeTypes.ts` — cadena jab + throw + special

## Boot

```ts
registerBeltSystems(this.world);
registerHitRunFeedback(this.world);
registerHitRunHurt(this.world);
registerHitRunMelee(this.world);
```

## Próximos pasos

1. Blueprint jugador con BeltInput / BeltMovement (sin gravity)
2. Input mapper: up/down = profundidad, fire, attack, special
3. ComboMeleeSystem (cadena + throw + special)
4. Waves por sección + tag BeltSectionEnemy
5. Canvas drawers fantasy
