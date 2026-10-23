# Fase 0 + Fase 1 — Aquí hay dragones

## Fase 0 (Opción A) — Theme flag

**Estrategia:** concept pack activable por id, sin fork del juego.

| Id | Alias | Theme object |
|----|-------|--------------|
| `aqui_hay_dragones` | `nautical-chart` | `aquiHayDragonesConceptPack` |

### Activación

```ts
import { aquiHayDragonesConceptPack, availableConceptPacks } from "../../theme/conceptPacks";

// Directo
new SpaceInvadersGame({ theme: aquiHayDragonesConceptPack });

// Por id (UI / story / config)
new SpaceInvadersGame({
  theme: availableConceptPacks["aqui_hay_dragones"],
});
// o availableConceptPacks["nautical-chart"]
```

El `BaseGame` ya acepta `config.theme` y lo registra en `THEME_RESOURCE_KEY`.
`SpaceInvadersGame` usa `config.theme ?? createThemeFromGameAccents("space-invaders")`.

### Decisiones documentadas (art bible §22 + §23)

| Tema | Decisión Fase 0 |
|------|----------------|
| Gallardete del galeón | **Gold** (`#C9A227`) + contorno ink 0.8 — el rojo se reserva a hostil |
| Tipografía | Intención serif; implementación completa en Fase 4 |
| Vidas en HUD | Propuesta §10.2; no implementada aún |
| Nave bonus | Ballena como default (geometría lista); dragón como rare = Fase 2+ |
| Fondo | `vfxProfile.backgroundLayers: ["parchment_chart"]`, starDensity 0 |

---

## Fase 1 — Fundación

### Entregado

- [x] `AQUI_HAY_DRAGONES_PALETTE` — tokens §4.1
- [x] `AQUI_HAY_DRAGONES_ALPHAS` — referencia §3.3
- [x] `colorMap` + `visualTheme.palette` / contrastHierarchy
- [x] Geometrías stub (EntityGeometryProfile):
  - Galeón (`nauticalGalleonGeometry`)
  - Kraken / commander
  - Serpiente / scout
  - Aleta / invader
  - Ballena / ufo
  - Bala de cañón / harpoon
- [x] Registro en `availableConceptPacks` + lista UI
- [x] Tests en `__tests__/AquiHayDragonesConceptPack.test.ts`
- [x] Sin blur / sin starfield / sin glow ambient (effects desactivados)

### Pendiente (Fases 2+)

- Drawer de fondo pergamino + marco doble + cuadrícula (Canvas + Skia)
- Lavados semitransparentes con desregistro (−1.2, −1.2)
- Islas erosivas y viento (gameplay)
- HUD Leguas / Viento / rosa
- Pantallas (cartela, sello, Hic sunt dracones)

### Archivos

- `src/theme/conceptPacks/aquiHayDragonesConceptPack.ts`
- `src/theme/conceptPacks/index.ts` (export + registry)
- `src/games/space-invaders/__tests__/AquiHayDragonesConceptPack.test.ts`
- Art bible: `src/games/space-invaders/ARTWORK_theme_alternativo.md`
