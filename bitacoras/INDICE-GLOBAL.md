# Índice Global de Análisis — Tiny Aster

## Inventario Real de Juegos
El monorepo cuenta con **13 juegos activos** en `src/games/`:
1. `arkanoid`
2. `asteroids`
3. `echorunner`
4. `flappybird`
5. `frogger`
6. `geometrywars`
7. `hitandrun`
8. `platformer`
9. `pong`
10. `racing`
11. `space-invaders`
12. `tower-defense`
13. `vertical-shmup`

---

## Progreso de Análisis
- [x] **arkanoid** — 2 propuestas validadas (`bitacoras/BITACORA-arkanoid.md`)
- [x] **asteroids** — 2 propuestas validadas (`bitacoras/BITACORA-asteroids.md`)
- [x] **echorunner** — 2 propuestas validadas (`bitacoras/BITACORA-echorunner.md`)
- [x] **flappybird** — 3 propuestas validadas (`bitacoras/BITACORA-flappybird.md`)
- [x] **frogger** — 3 propuestas validadas (`bitacoras/BITACORA-frogger.md`)
- [x] **geometrywars** — 3 propuestas validadas (`bitacoras/BITACORA-geometrywars.md`)
- [x] **hitandrun** — 3 propuestas validadas (`bitacoras/BITACORA-hitandrun.md`)
- [x] **platformer** — 3 propuestas validadas (`bitacoras/BITACORA-platformer.md`)
- [x] **pong** — 3 propuestas validadas (`bitacoras/BITACORA-pong.md`)
- [x] **racing** — 3 propuestas validadas (`bitacoras/BITACORA-racing.md`)
- [x] **space-invaders** — 3 propuestas validadas (`bitacoras/BITACORA-space-invaders.md`)
- [x] **tower-defense** — 3 propuestas validadas (`bitacoras/BITACORA-tower-defense.md`)
- [x] **vertical-shmup** — 3 propuestas validadas (`bitacoras/BITACORA-vertical-shmup.md`)

---

## Ranking Consolidado de Deuda Técnica
| Juego | Duplicación | Cobertura Tests | Hipótesis Validadas | Estado |
|-------|-------------|-----------------|---------------------|--------|
| arkanoid | Media | Alta (4 archivos) | 2/3 | Completado |
| asteroids | Media | Alta (19 archivos) | 2/3 | Completado |
| echorunner | Baja | Media (2 archivos) | 2/3 | Completado |
| flappybird | Media | Alta (6 archivos) | 3/3 | Completado |
| frogger | Baja | Básica (1 archivo) | 3/3 | Completado |
| geometrywars | Alta | Alta (9 archivos) | 3/3 | Completado |
| hitandrun | Alta | Básica (1 archivo) | 3/3 | Completado |
| platformer | Media | Media (2 archivos) | 3/3 | Completado |
| pong | Alta | Media (2 archivos) | 3/3 | Completado |
| racing | Media | Alta (5 archivos) | 3/3 | Completado |
| space-invaders | Alta | Alta (15 archivos) | 3/3 | Completado |
| tower-defense | Alta | Básica (3 tests) | 3/3 | Completado |
| vertical-shmup | Media | Básica (1 archivo) | 3/3 | Completado |

---

## Hallazgos Transversales (Afectan a 2+ juegos)

| Patrón Detectado | Juegos Afectados | Refactor Sugerido | Destino Recomendado |
|------------------|------------------|-------------------|---------------------|
| Configuración Jest por juego ausente en la raíz | `hitandrun`, `tower-defense` | Añadir sus `jest.config.cjs` al archivo raíz `jest.config.cjs` | `jest.config.cjs` |
| Catálogos de armas duplicados entre variantes de temas | `hitandrun` | Heredar especificaciones base desde `HIT_RUN_WEAPON_CATALOG` | `src/games/hitandrun/fantasy/` |
| Propiedades duplicadas en archivos de i18n | `geometrywars`, `asteroids` | Limpiar duplicados de objetos de localización en `en.ts` y `es.ts` | `src/locales/` |
| Bloqueo de `RandomService` en fase de setup | `vertical-shmup`, `arkanoid`, `hitandrun` | Envolver llamadas de setup con `runWithUnlockedRandomAndMutators` | `src/games/shared/configHelper.ts` |
| Definiciones de colisionadores de paletas duplicadas | `pong`, `arkanoid` | Reutilizar `createPaddleColliderConfig` | `src/games/shared/componentBuilders` |
| Reutilización de renderizadores visuales Canvas/Skia | `space-invaders`, `geometrywars`, `arkanoid`, `asteroids` | Utilizar `RendererUtils.registerAssets` y efectos de `SharedVFX` | `@tiny-aster/core` |

---

## Propuestas de Evolución del Framework
1. **Módulo Unificado de Proyectos Jest**: Garantizar que todo nuevo juego creado en `src/games/` registre automáticamente su `jest.config.cjs` en la raíz de Jest para evitar desincronizaciones en CI.
2. **Standard de Inicialización de Entidades Asíncronas**: Recomendar el uso de `onInitializeEntities` con `runWithUnlockedRandomAndMutators` para evitar excepciones de bloqueo de aleatoriedad fuera del ciclo de simulación.
3. **Consolidación de Pools de Entidades (`SharedEntityPool`)**: Promover un pool genérico en `@tiny-aster/core` para proyectiles y partículas que reemplace las implementaciones locales manuales en `tower-defense` y `geometrywars`.
