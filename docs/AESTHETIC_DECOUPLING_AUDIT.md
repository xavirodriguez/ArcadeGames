# Auditoría de Desacople Estético de Juegos (Aesthetic Decoupling Audit)

## 1. Introducción y Estado Objetivo (Target Architecture)

El objetivo fundamental del sistema de renderizado de la arquitectura ArcadeGames/`@tiny-aster/core` es **desacoplar completamente la lógica de simulación y las reglas de juego de su representación estética y visual**. Este desacople permite crear *reskins*, temas estéticos dinámicos (retro, synthwave, neón, pastel, etc.), ciclos día/noche y variaciones de nivel o paquetes conceptuales (*Concept Packs*) sin modificar una sola línea de código en las entidades, componentes o sistemas ECS.

### Patrón e Infraestructura Objetivo

La infraestructura estandarizada para lograr este desacople está compuesta por los siguientes módulos centrales:

1. **`packages/core/src/theme/Theme.ts`**:
   - Proporciona la interfaz `Theme`, la clave de recurso `THEME_RESOURCE_KEY` y las funciones de resolución `resolveThemeColor(world, key, fallbackRole)` y `resolveThemeColorWithFallback(world, key, fallbackColor)`.
   - Permite a cualquier `ShapeDrawer` o `EffectDrawer` consultar dinámicamente en cada fotograma el color adecuado registrado en el recurso `Theme` del `World`.

2. **`packages/core/src/theme/VisualTheme.ts`**:
   - Define el contrato `VisualTheme`, `VisualThemeContrastHierarchy`, `VisualThemeShapeTokens` y la función constructora `createVisualTheme`. Define paletas estandarizadas como `SOLAR_GARDEN_PALETTE`.

3. **`src/theme/gameAccents.ts`**:
   - Define `GAME_ACCENTS` y la función `createThemeFromGameAccents(game, customTheme)`, encargada de inicializar el `Theme` por defecto de cada juego registrado con sus roles de color (`primary`, `secondary`, `accent`, `neutral`, `background`), mapa de colores de gameplay (`colorMap`) y perfil visual de efectos (`vfxProfile`).

4. **Patrón de Registro y Uso en Drawers**:
   - El constructor del juego debe aceptar un parámetro opcional `theme?: Theme` y establecer por defecto `config.theme ?? createThemeFromGameAccents("<juego>")`, pasando este tema al constructor base (`super({ theme, ... })`) para registrarlo en el ECS `World`.
   - Todo drawer (`ShapeDrawer` o `EffectDrawer`) Canvas o Skia debe obtener sus colores llamando a `resolveThemeColor(world, "key", "role")` o utilizando tokens geométricos parametricos (`EntityGeometryProfile`), evitando literales hex/rgba hardcodeados o paletas locales estáticas importadas directamente.

---

## 2. Auditoría Detallada por Juego

---

### 2.1 Arkanoid (`src/games/arkanoid`)

- **Ruta del Constructor**: `src/games/arkanoid/ArkanoidGame.ts` (Líneas 76-78)
  - **Uso de Theme**: Acepta `options.theme?: Theme` y asigna `options.theme ?? createThemeFromGameAccents("arkanoid")` pasándolo a `super()`.

- **Archivos de Renderizado**:
  - `src/games/arkanoid/rendering/ArkanoidCanvasVisuals.ts`
  - `src/games/arkanoid/rendering/ArkanoidSkiaVisuals.ts`
  - `src/games/arkanoid/rendering/ArkanoidRenderUtils.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `ArkanoidCanvasVisuals.ts` | `drawPaddleCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "paddle", "primary")` |
| `ArkanoidCanvasVisuals.ts` | `drawBallCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "ball", "accent")` |
| `ArkanoidCanvasVisuals.ts` | `drawBrickCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "brick", "primary")` o color del brick |
| `ArkanoidCanvasVisuals.ts` | `drawLaserCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "laser", "accent")` |
| `ArkanoidCanvasVisuals.ts` | `drawPowerUpCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "powerup", "secondary")` |
| `ArkanoidCanvasVisuals.ts` | `drawEnemyCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "enemy", "primary")` |
| `ArkanoidCanvasVisuals.ts` | `drawBossDohCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "boss", "accent")` |
| `ArkanoidCanvasVisuals.ts` | `drawWallCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "wall", "neutral")` |
| `ArkanoidCanvasVisuals.ts` | `drawBackgroundCanvas` | (a) Desacoplado | Usa `resolveThemeColor(world, "background", "background")` |
| `ArkanoidSkiaVisuals.ts` | `drawSkiaPaddle`, `drawSkiaBall`, `drawSkiaBrick`, `drawSkiaLaser`, `drawSkiaPowerUp`, `drawSkiaEnemy`, `drawSkiaBossDoh`, `drawSkiaWall`, `drawSkiaBackground` | (a) Desacoplado | Versiones Skia que utilizan `resolveThemeColor` |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Totalmente desacoplado**.
- **Cambios Necesarios**: Ninguno urgente. Mantener la cobertura actual.

---

### 2.2 Asteroids (`src/games/asteroids`)

- **Ruta del Constructor**: `src/games/asteroids/AsteroidsGame.ts` (Líneas 116-118)
  - **Uso de Theme**: Si `!config.theme`, asigna `config.theme = createThemeFromGameAccents("asteroids")` y llama a `super(config)`.

- **Archivos de Renderizado**:
  - `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts`
  - `src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts`
  - `src/games/asteroids/rendering/AsteroidsMissionHUD.ts`
  - `src/games/asteroids/rendering/AsteroidsSkiaMissionHUD.ts`
  - `src/games/asteroids/rendering/AsteroidsRendererManager.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `AsteroidsCanvasVisuals.ts` | `drawAsteroidsPlayer` | (a) Desacoplado | Usa `resolveThemeColor(world, "player", "primary")` |
| `AsteroidsCanvasVisuals.ts` | `drawAsteroidsAsteroid` | (a) Desacoplado | Usa `resolveThemeColor(world, "asteroid", "secondary")` |
| `AsteroidsCanvasVisuals.ts` | `drawAsteroidsBullet` | (a) Desacoplado | Usa `resolveThemeColor(world, "bullet", "accent")` |
| `AsteroidsCanvasVisuals.ts` | `drawAsteroidsUfo` | (a) Desacoplado | Usa `resolveThemeColor(world, "ufo", "primary")` |
| `AsteroidsCanvasVisuals.ts` | `drawAsteroidsShield` | (a) Desacoplado | Usa `resolveThemeColor(world, "shield", "accent")` |
| `AsteroidsCanvasVisuals.ts` | `drawAsteroidsBackground` | (a) Desacoplado | Usa `resolveThemeColor(world, "background", "background")` |
| `AsteroidsSkiaVisuals.ts` | `drawSkiaAsteroidsPlayer`, `drawSkiaAsteroidsAsteroid`, `drawSkiaAsteroidsBullet`, `drawSkiaAsteroidsUfo`, `drawSkiaAsteroidsShield`, `drawSkiaAsteroidsBackground` | (a) Desacoplado | Versiones Skia que utilizan `resolveThemeColor` |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Totalmente desacoplado**.
- **Cambios Necesarios**: Ninguno. Sirve como referencia de buenas prácticas junto con `AsteroidsRendererManager.ts`.

---

### 2.3 Echo Runner (`src/games/echorunner`)

- **Ruta del Constructor**: `src/games/echorunner/EchoRunnerGame.ts` (Líneas 140-155)
  - **Uso de Theme**: **No desacoplado en el constructor**. `EchoRunnerGame.ts` no invoca `createThemeFromGameAccents("echorunner")` ni pasa la propiedad `theme` al constructor base en `super()`.

- **Archivos de Renderizado**:
  - `src/games/echorunner/rendering/EchoRunnerPalette.ts`
  - `src/games/echorunner/rendering/EchoRunnerVisualUtils.ts`
  - `src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts`
  - `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `EchoRunnerCanvasVisuals.ts` | `drawEchoBackground` | (c) Acoplado | Ignora el Theme; dibuja fondo procedural con literales hex hardcodeados. |
| `EchoRunnerCanvasVisuals.ts` | `drawEchoPlayerCanvas` | (b) Paleta propia | Utiliza `resolveEchoRunnerPalette(world)`, que recurre a la constante fija `ECHO_PALETTE` si no hay override directo. |
| `EchoRunnerCanvasVisuals.ts` | `drawEchoTilemap`, `drawEchoCollectibleFragment`, `drawEchoCollectibleCore`, `drawEchoSentinel`, `drawEchoHopper`, `drawEchoCharger`, `drawEchoWatcher`, `drawEchoPulseAttack` | (b) Paleta propia | Todos consumen `resolveEchoRunnerPalette` o `ECHO_PALETTE` directamente (`EchoRunnerPalette.ts`). |
| `EchoRunnerSkiaVisuals.ts` | `drawSkiaEchoPlayer`, `drawSkiaEchoTilemap`, etc. | (b) Paleta propia | Versiones Skia ligadas a `resolveEchoRunnerPalette`. |

- **Imports Cruzados Detectados**:
  - `src/games/echorunner/EchoRunnerGame.ts` (Línea 23) importa `PlatformerInputSystem` desde `../platformer/systems/PlatformerInputSystem`.

- **Nivel de Desacople General**: **No desacoplado** (Usa paleta propia `ECHO_PALETTE` hardcodeada consumida directamente por los drawers y constructor sin Theme por defecto).
- **Cambios Necesarios Prioritarios**:
  1. Actualizar el constructor de `EchoRunnerGame.ts` para invocar `createThemeFromGameAccents("echorunner")`.
  2. Reemplazar el consumo de `ECHO_PALETTE` en `resolveEchoRunnerPalette` por llamadas estándar a `resolveThemeColor(world, ...)`.
  3. Refactorizar `drawEchoBackground` para consultar el `Theme` del `World` en lugar de dibujar con constantes estáticas.
  4. Eliminar la dependencia cruzada con `PlatformerInputSystem` moviendo la lógica compartida a `@tiny-aster/gameplay-kit` o `src/games/shared`.

---

### 2.4 Flappy Bird (`src/games/flappybird`)

- **Ruta del Constructor**: `src/games/flappybird/FlappyBirdGame.ts` (Líneas 70-73)
  - **Uso de Theme**: Asigna `theme: config.theme ?? createThemeFromGameAccents("flappy-bird")`.

- **Archivos de Renderizado**:
  - `src/games/flappybird/rendering/FlappyBirdCanvasVisuals.ts`
  - `src/games/flappybird/rendering/FlappyBirdSkiaVisuals.ts`
  - `src/games/flappybird/rendering/FlappyBirdBackgroundData.ts`
  - `src/games/flappybird/rendering/FlappyBirdParticles.ts`
  - `src/games/flappybird/rendering/FlappyBirdMissionHUD.ts`
  - `src/games/flappybird/rendering/FlappyBirdSkiaMissionHUD.ts`
  - `src/games/flappybird/rendering/FlappyBirdRenderUtils.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `FlappyBirdCanvasVisuals.ts` | `drawFlappyBird` | (a) Desacoplado | Utiliza `resolveThemeColor` y perfiles geométricos del `ConceptPack` (`createFlappyThemeFromConceptPack`). |
| `FlappyBirdCanvasVisuals.ts` | `drawFlappyPipe` | (a) Desacoplado | Consulta el `Theme` activo para tuberías/obstáculos. |
| `FlappyBirdCanvasVisuals.ts` | `drawFlappyBackground` | (a) Desacoplado | Utiliza `MEGASTRUCTURE_GEOMETRY_REGISTRY` y `resolveThemeColor`. |
| `FlappyBirdSkiaVisuals.ts` | `drawSkiaFlappyBird`, `drawSkiaFlappyPipe`, `drawSkiaFlappyBackground` | (a) Desacoplado | Implementación Skia completamente desacoplada. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Totalmente desacoplado**.
- **Cambios Necesarios**: Ninguno. Constituye la referencia óptima para el soporte de *Concept Packs* y reskins dinámicos.

---

### 2.5 Frogger (`src/games/frogger`)

- **Ruta del Constructor**: `src/games/frogger/FroggerGame.ts` (Línea 62)
  - **Uso de Theme**: Llama a `theme: createThemeFromGameAccents("frogger")` en `super()`. (Nota: No permite pasar `config.theme` personalizado externamente).

- **Archivos de Renderizado**:
  - `src/games/frogger/rendering/FroggerCanvasVisuals.ts`
  - `src/games/frogger/rendering/FroggerSkiaVisuals.ts`
  - `src/games/frogger/rendering/FroggerPresentation.ts`
  - `src/games/frogger/rendering/FroggerRenderUtils.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `FroggerCanvasVisuals.ts` | `drawCarCanvas` | (a) Desacoplado | `L63-87`: Usa `resolveThemeColor(world, "car", "secondary")`. |
| `FroggerCanvasVisuals.ts` | `drawTruckCanvas` | (a) Desacoplado | `L90-113`: Usa `resolveThemeColor(world, "truck", "accent")`. |
| `FroggerCanvasVisuals.ts` | `drawFrogCanvas` | (a) Desacoplado | `L15-60`: Usa `resolveThemeColor(world, "frog", "primary")`. |
| `FroggerCanvasVisuals.ts` | `drawLogCanvas` | (c) Acoplado | `L116-141`: Colores hardcodeados `#8B5A2B` y `#5C3A17` directamente en la función. |
| `FroggerCanvasVisuals.ts` | `drawTurtleCanvas` | (c) Acoplado | `L144-171`: Colores hardcodeados `#00D2FF` y `#0088CC` en el bucle de segmentos. |
| `FroggerCanvasVisuals.ts` | `drawHomeSlotCanvas` | (c) Acoplado | `L174-200`: Hexagonos y rectángulos hardcodeados (`#00FF88`, `#006633`). |
| `FroggerCanvasVisuals.ts` | `drawWaterBackground` | (c) Acoplado | `L203-225`: Gradiente e iluminación de agua en hex fijo (`#001133`, `#002255`). |
| `FroggerSkiaVisuals.ts` | `drawSkiaLog`, `drawSkiaTurtle`, `drawSkiaHomeSlot`, `drawSkiaWaterBackground` | (c) Acoplado | Réplicas en Skia con los mismos valores hex hardcodeados. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Parcialmente desacoplado**.
- **Cambios Necesarios Prioritarios**:
  1. Permitir `theme?: Theme` opcional en las opciones del constructor de `FroggerGame`.
  2. Sustituir los colores hex hardcodeados en `drawLogCanvas` (`"log"`), `drawTurtleCanvas` (`"turtle"`), `drawHomeSlotCanvas` (`"home_slot"`) y `drawWaterBackground` (`"water"`) por llamadas a `resolveThemeColor`.

---

### 2.6 Geometry Wars (`src/games/geometrywars`)

- **Ruta del Constructor**: `src/games/geometrywars/GeometryWarsGame.ts` (Líneas 111-117)
  - **Uso de Theme**: Pasa `theme: options.theme ?? createThemeFromGameAccents("geometrywars")` a `super()`.

- **Archivos de Renderizado**:
  - `src/games/geometrywars/rendering/GeometryWarsCanvasVisuals.ts`
  - `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts`
  - `src/games/geometrywars/rendering/GeometryWarsVisualLogic.ts`
  - `src/games/geometrywars/rendering/GeometryWarsRenderUtils.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `GeometryWarsCanvasVisuals.ts` | `drawPlayerCanvas`, `drawGruntCanvas`, `drawWandererCanvas`, `drawWeaverCanvas`, `drawSpinnerCanvas`, `drawBulletCanvas`, `drawGridBackgroundCanvas` | (a) Desacoplado | Todos los drawers Canvas consultan `resolveThemeColor(world, ...)` correctamente. |
| `GeometryWarsSkiaVisuals.ts` | `drawSkiaEvader`, `drawSkiaGrunt`, `drawSkiaWanderer`, `drawSkiaWeaver`, `drawSkiaSpinner`, `drawSkiaPlayer`, `drawSkiaBullet` | (c) Acoplado | `L165-191`: Definidos mediante `defineSkiaShape` especificando `{ defaultColor: "#ffaa00" }`, `{ defaultColor: "#00ffff" }`, etc., ignorando la resolución por `Theme` en Skia. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Parcialmente desacoplado**.
- **Cambios Necesarios Prioritarios**:
  1. Modificar los drawers en `GeometryWarsSkiaVisuals.ts` para que lean dinámicamente el color del `Theme` activo del `world` en el callback de dibujado en lugar de depender únicamente del `defaultColor` estático en `defineSkiaShape`.

---

### 2.7 Hit and Run (`src/games/hitandrun`)

- **Ruta del Constructor**: `src/games/hitandrun/HitAndRunGame.ts` (Líneas 115-122)
  - **Uso de Theme**: **No usa Theme en absoluto**. No invoca `createThemeFromGameAccents("hitandrun")` ni pasa la propiedad `theme` en la llamada a `super()`.

- **Archivos de Renderizado**:
  - `src/games/hitandrun/rendering/HitAndRunPalette.ts`
  - `src/games/hitandrun/rendering/HitRunCanvasVisuals.ts`
  - `src/games/hitandrun/rendering/HitRunBackdropCanvas.ts`
  - `src/games/hitandrun/rendering/HitRunHudCanvas.ts`
  - `src/games/hitandrun/rendering/HitRunDebugOverlay.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `HitAndRunPalette.ts` | Constante `HIT_RUN_PALETTE` | (b) Paleta propia | Re-exporta y compone paleta local fija basada directamente en `ECHO_PALETTE`. |
| `HitRunCanvasVisuals.ts` | `drawHitRunPlayer`, `drawHitRunPopcorn`, `drawHitRunWallTrooper`, `drawHitRunHopper`, `drawHitRunCharger`, `drawHitRunElite` | (c) Acoplado | Utilizan colores hardcodeados o leen campos directos de `HIT_RUN_PALETTE` sin pasar por `resolveThemeColor`. |
| `HitRunCanvasVisuals.ts` | `drawHitRunBullet`, `drawHitRunRocket` | (c) Acoplado | Proyectiles con colores hex hardcodeados. |
| `HitRunBackdropCanvas.ts` | `drawHitRunProceduralBackdrop` | (c) Acoplado | Utiliza `HIT_RUN_BACKDROP_THEME` con valores hex estáticos. |
| `HitRunHudCanvas.ts` | `drawHitRunHud` | (c) Acoplado | HUD dibujado con literales hex directos. |

- **Imports Cruzados Detectados**:
  - `src/games/hitandrun/HitAndRunGame.ts`:
    - `from "../echorunner/EchoRunnerGame"` (Lineas 24-26)
    - `from "../echorunner/types/EchoRunnerConfigSchema"` (Línea 50)
    - `from "../platformer/systems/PlatformerInputSystem"` (Línea 36)
    - `from "../platformer/rendering/PlatformerCanvasVisuals"` (Línea 75 - `drawPlatformerTilemap`)
  - `src/games/hitandrun/rendering/HitAndRunPalette.ts`:
    - `from "../../echorunner/rendering/EchoRunnerPalette"` (Línea 6 - `ECHO_PALETTE`)
  - `src/games/hitandrun/types/HitAndRunConfigSchema.ts`:
    - `from "../../echorunner/types/EchoRunnerConfigSchema"` (Línea 10)

- **Nivel de Desacople General**: **No desacoplado** (El caso más grave del repositorio).
- **Cambios Necesarios Prioritarios**:
  1. Registrar las acentuaciones de "hitandrun" en `GAME_ACCENTS` (`src/theme/gameAccents.ts`).
  2. Actualizar el constructor de `HitAndRunGame.ts` para aceptar `config.theme` y usar `createThemeFromGameAccents("hitandrun")` como fallback.
  3. Reemplazar `HIT_RUN_PALETTE` en todos los drawers por la llamada estándar a `resolveThemeColor`.
  4. Eliminar los imports cruzados hacia `echorunner` y `platformer`, moviendo utilidades comunes a `@tiny-aster/gameplay-kit` o `src/games/shared`.

---

### 2.8 Outrun (`src/games/outrun`)

- **Ruta del Constructor**: `src/games/outrun/OutrunGame.ts` (Líneas 67-70)
  - **Uso de Theme**: Llama a `super({ theme: createThemeFromGameAccents("racing"), ... })`.

- **Archivos de Renderizado**:
  - `src/games/outrun/rendering/OutrunPalettes.ts`
  - `src/games/outrun/rendering/OutrunCanvasVisuals.ts`
  - `src/games/outrun/rendering/OutrunSkiaVisuals.ts`
  - `src/games/outrun/rendering/OutrunRenderShared.ts`
  - `src/games/outrun/rendering/OutrunVisualHelpers.ts`
  - `src/games/outrun/rendering/RoadProjection.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `OutrunPalettes.ts` | Tokens `COAST_PALETTE`, `DESERT_PALETTE`, `MOUNTAIN_PALETTE` | (b) Paleta propia | Paletas de escenario específicas de carretera/horizonte moduladas por `applyDayPhase`. |
| `OutrunCanvasVisuals.ts` | `drawOutrunRoad`, `drawOutrunRacer` | (b) Paleta propia | Dibujan elementos de la carretera basándose en los tokens de escenario de `OutrunPalettes.ts`. |
| `OutrunCanvasVisuals.ts` | `drawOutrunCar` | (c) Acoplado | Vehículo del jugador dibujado con hex hardcodeados para detalles del chasis. |
| `OutrunCanvasVisuals.ts` | `drawOutrunHud` | (c) Acoplado | Renderizado de tacómetro y cronómetro con colores fijos inline. |
| `OutrunSkiaVisuals.ts` | `drawSkiaOutrunRoad`, `drawSkiaOutrunCar`, `drawSkiaOutrunRacer`, `drawSkiaOutrunHud` | (b)/(c) | Implementación Skia análoga. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Parcialmente desacoplado**.
- **Cambios Necesarios Prioritarios**:
  1. Permitir pasar `options.theme` opcional al constructor de `OutrunGame`.
  2. Integrar los tokens de paleta de `OutrunPalettes.ts` dentro de la estructura extendida de `VisualTheme` / `Theme` resource.
  3. Migrar el dibujado del auto (`drawOutrunCar`) y HUD (`drawOutrunHud`) a `resolveThemeColor`.

---

### 2.9 Platformer (`src/games/platformer`)

- **Ruta del Constructor**: `src/games/platformer/PlatformerGame.ts` (Líneas 84-92)
  - **Uso de Theme**: Configura `theme: config.theme ?? createThemeFromGameAccents("platformer")`.

- **Archivos de Renderizado**:
  - `src/games/platformer/rendering/PlatformerCanvasVisuals.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `PlatformerCanvasVisuals.ts` | `drawPlatformerTilemap` | (c) Acoplado | Importa `colors` desde `../../../theme/colors` y usa literales hex estáticos. |
| `PlatformerCanvasVisuals.ts` | `drawPlatformerPlayer` | (c) Acoplado | Colores hardcodeados de `colors.ts` sin usar `resolveThemeColor`. |
| `PlatformerCanvasVisuals.ts` | `drawPlatformerGoal` | (c) Acoplado | Indicador de meta con colores fijos `#00FFCC`. |
| `src/games/shared/rendering/PlatformerSharedVisuals.ts` | `drawSentinel`, `drawHopper`, `drawCharger`, `drawWatcher`, `drawMemoryFragment`, `drawMemoryCore` | (b)/(c) | Utilizados por Platformer pero ubicados en `shared`, importando helpers de `echorunner/rendering/EchoRunnerVisualUtils`. |

- **Imports Cruzados Detectados**:
  - `src/games/shared/rendering/PlatformerSharedVisuals.ts` importa utilidades directamente desde `../../echorunner/rendering/EchoRunnerVisualUtils`.
  - `PlatformerGame.ts` (L93) anotación de código duplicado con `EchoRunnerGame.ts`.

- **Nivel de Desacople General**: **Parcialmente desacoplado**.
- **Cambios Necesarios Prioritarios**:
  1. Migrar `drawPlatformerTilemap`, `drawPlatformerPlayer` y `drawPlatformerGoal` a `resolveThemeColor`.
  2. Desacoplar `PlatformerSharedVisuals.ts` para que no importe de `echorunner`.

---

### 2.10 Pong (`src/games/pong`)

- **Ruta del Constructor**: `src/games/pong/PongGame.ts` (Línea 90)
  - **Uso de Theme**: Asigna `theme = isConfig && config.theme ? config.theme : createThemeFromGameAccents("pong")`.

- **Archivos de Renderizado**:
  - `src/games/pong/rendering/PongCanvasVisuals.ts`
  - `src/games/pong/rendering/PongSkiaVisuals.ts`
  - `src/games/pong/rendering/PongRenderUtils.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `PongCanvasVisuals.ts` | `drawPongBall` | (a) Desacoplado | Usa `resolveThemeColor(world, "ball", "accent")`. |
| `PongCanvasVisuals.ts` | `drawPongPaddle` | (a) Desacoplado | Usa `resolveThemeColor(world, "paddle", "primary")`. |
| `PongCanvasVisuals.ts` | `drawPongBackground` | (a) Desacoplado | Usa `resolveThemeColor(world, "background", "background")`. |
| `PongSkiaVisuals.ts` | `drawSkiaPongBall`, `drawSkiaPongPaddle`, `drawSkiaPongBackground` | (a) Desacoplado | Versiones Skia completamente desacopladas. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Totalmente desacoplado**.
- **Cambios Necesarios**: Ninguno. Ejemplo limpio de desacople total.

---

### 2.11 Racing (`src/games/racing`)

- **Ruta del Constructor**: `src/games/racing/RacingGame.ts` (Línea 74)
  - **Uso de Theme**: Llama a `theme: createThemeFromGameAccents("racing")` en `super()`. (No acepta `config.theme` externo en opciones).

- **Archivos de Renderizado**:
  - `src/games/racing/rendering/RacingSkin.ts`
  - `src/games/racing/rendering/RacingPalette.ts`
  - `src/games/racing/rendering/RacingCanvasVisuals.ts`
  - `src/games/racing/rendering/RacingSkiaVisuals.ts`
  - `src/games/racing/rendering/RacingRenderer.ts`
  - `src/games/racing/rendering/RacingVisualHelpers.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `RacingPalette.ts` | Función `getRacingPalette(world)` | (b) Paleta propia | **Verificación realizada**: `getRacingPalette` consulta la skin activa (`ActiveTrackSpec.skin`) en `SKIN_REGISTRY` (`breakfast`, `billiard`, `desk`, `garden`, `space`). Si no hay skin especificada, cae a `getGameAccentColors("racing")`. No consulta directamente las claves arbitrarias del `Theme` activo. |
| `RacingCanvasVisuals.ts` | `drawTrackSurface`, `drawTrackRibbon`, `drawSkidMarks`, `drawSmoke`, `drawRacingCar`, `drawTrackWall`, `drawCheckpoint`, `drawTrackZone`, `drawTrackObstacle` | (b) Paleta propia | Todos los drawers obtienen la paleta ejecutando `getRacingPalette(world)`. |
| `RacingSkiaVisuals.ts` | Implementaciones Skia correspondientes | (b) Paleta propia | Réplicas en Skia consumiendo `getRacingPalette(world)`. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Parcialmente desacoplado** (Posee un sistema de reskinning altamente desacoplado por skins/temas visuales, pero su abstracción de paleta no utiliza `resolveThemeColor` directamente).
- **Cambios Necesarios Prioritarios**:
  1. Permitir `config.theme` opcional en las opciones de `RacingGame`.
  2. Hacer que `getRacingPalette` verifique primero si el recurso `Theme` activo contiene overrides explícitos antes de caer al registro de skins estático.

---

### 2.12 Space Invaders (`src/games/space-invaders`)

- **Ruta del Constructor**: `src/games/space-invaders/SpaceInvadersGame.ts` (Línea 83)
  - **Uso de Theme**: Asigna `theme: config.theme ?? createThemeFromGameAccents("space-invaders")`.

- **Archivos de Renderizado**:
  - `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersSkiaVisuals.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersVisualUtils.ts`
  - `src/games/space-invaders/rendering/RenderHelper.ts`
  - `src/games/space-invaders/rendering/ExplosionParticlePool.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `SpaceInvadersCanvasVisuals.ts` | `drawExplosionBackgroundEffect` | (a) Desacoplado | Usa `resolveThemeColor(world, "background", "background")`. |
| `SpaceInvadersCanvasVisuals.ts` | `drawSpaceInvadersPlayer` | (a) Desacoplado | Usa `resolveThemeColor(world, "player", "primary")`. |
| `SpaceInvadersCanvasVisuals.ts` | `drawSpaceInvadersInvader` | (a) Desacoplado | Usa `resolveThemeColor(world, "invader", "secondary")`. |
| `SpaceInvadersCanvasVisuals.ts` | `drawSpaceInvadersBullet` | (a) Desacoplado | Usa `resolveThemeColor(world, "bullet", "accent")`. |
| `SpaceInvadersCanvasVisuals.ts` | `drawSpaceInvadersBoss` | (a) Desacoplado | Usa `resolveThemeColor(world, "boss", "accent")`. |
| `SpaceInvadersCanvasVisuals.ts` | `drawSpaceInvadersShield` | (a) Desacoplado | Usa `resolveThemeColor(world, "shield", "neutral")`. |
| `SpaceInvadersCanvasVisuals.ts` | `drawSpaceInvadersParticle` | (a) Desacoplado | Usa `resolveThemeColor(world, "particle", "primary")`. |
| `SpaceInvadersSkiaVisuals.ts` | Versiones Skia correspondientes | (a) Desacoplado | Implementación Skia utilizando `resolveThemeColor`. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Totalmente desacoplado**.
- **Cambios Necesarios**: Ninguno.

---

### 2.13 Tower Defense (`src/games/tower-defense`)

- **Ruta del Constructor**: `src/games/tower-defense/TowerDefenseGame.ts` (Líneas 142-148)
  - **Uso de Theme**: Asigna `theme: config.theme ?? createThemeFromGameAccents("tower-defense")`.

- **Archivos de Renderizado**:
  - `src/games/tower-defense/rendering/TowerDefenseCanvasVisuals.ts`
  - `src/games/tower-defense/rendering/TowerDefenseSkiaVisuals.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `TowerDefenseCanvasVisuals.ts` | `drawTowerBasic` | (c) Acoplado | `L39-43`: Llama a `drawTowerBase(ctx, size, "#4fc3f7", "#81d4fa")` pasándole literales hex hardcodeados. |
| `TowerDefenseCanvasVisuals.ts` | `drawTowerSniper` | (c) Acoplado | `L47-54`: Llama a `drawTowerBase(ctx, size, "#ab47bc", "#ce93d8")` con hex hardcodeados. |
| `TowerDefenseCanvasVisuals.ts` | `drawTowerRapid` | (c) Acoplado | `L57-65`: Llama a `drawTowerBase(ctx, size, "#66bb6a", "#a5d6a7")` con hex hardcodeados. |
| `TowerDefenseCanvasVisuals.ts` | `drawTowerFrost` | (c) Acoplado | `L68-83`: Llama a `drawTowerBase(ctx, size, "#4dd0e1", "#b2ebf2")` con hex hardcodeados. |
| `TowerDefenseCanvasVisuals.ts` | `drawCreepGrunt`, `drawCreepFast`, `drawCreepTank`, `drawCreepBoss`, `drawTowerProjectile`, `drawTdMapBackground` | (c) Acoplado | Dibujados con literales hex directos en la función (`#e53935`, `#fdd835`, `#43a047`, etc.). |
| `TowerDefenseSkiaVisuals.ts` | `drawSkiaTowerBasic`, `drawSkiaTowerSniper`, `drawSkiaTowerRapid`, `drawSkiaTowerFrost`, `drawSkiaCreepBoss`, `drawSkiaCreepGrunt`, `drawSkiaCreepFast`, `drawSkiaCreepTank`, `drawSkiaTowerProjectile`, `drawSkiaTdMapBackground` | (c) Acoplado | Réplicas en Skia utilizando exactamente los mismos literales hex pasados como argumentos directos. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Parcialmente desacoplado**. (Pese a configurar el Theme en el constructor, el 100% de los drawers Canvas y Skia tienen colores hardcodeados).
- **Cambios Necesarios Prioritarios**:
  1. Modificar cada drawer de torre (`tower_basic`, `tower_sniper`, `tower_rapid`, `tower_frost`) para resolver sus colores primario y secundario vía `resolveThemeColor(world, "tower_basic", "primary")`.
  2. Modificar drawers de creeps (`creep_grunt`, `creep_fast`, `creep_tank`, `creep_boss`) y proyectiles para usar `resolveThemeColor`.

---

### 2.14 Vertical Shmup (`src/games/vertical-shmup`)

- **Ruta del Constructor**: `src/games/vertical-shmup/VerticalShmupGame.ts` (Línea 21)
  - **Uso de Theme**: Asigna `theme: config.theme ?? createThemeFromGameAccents("vertical-shmup")`.

- **Archivos de Renderizado**:
  - `src/games/vertical-shmup/rendering/ShmupCanvasVisuals.ts`
  - `src/games/vertical-shmup/rendering/ShmupRenderer.ts`

- **Clasificación de Drawers**:

| Archivo | Drawer / Función | Categoría | Detalle / Código |
| :--- | :--- | :---: | :--- |
| `ShmupCanvasVisuals.ts` | `drawShmupPlayer` | (a) Desacoplado | Usa `resolveThemeColor(world, "player", "primary") || "#00f0ff"`. |
| `ShmupCanvasVisuals.ts` | `drawShmupEnemy` | (a) Desacoplado | Usa `resolveThemeColor(world, "enemy", "secondary") || "#ff0055"`. |
| `ShmupCanvasVisuals.ts` | `drawShmupPlayerBullet` | (a) Desacoplado | Usa `resolveThemeColor(world, "player_bullet", "accent") || "#ffff00"`. |
| `ShmupCanvasVisuals.ts` | `drawShmupEnemyBullet` | (a) Desacoplado | Usa `resolveThemeColor(world, "enemy_bullet", "accent") || "#ff5500"`. |

- **Imports Cruzados Detectados**: Ninguno (`None`).
- **Nivel de Desacople General**: **Totalmente desacoplado**.
- **Cambios Necesarios**: Ninguno.

---

## 3. Módulo Transversal: `src/games/shared`

`src/games/shared` actúa como la capa compartida entre minijuegos del monorepo.

- **Componentes y Funciones Relevantes**:
  - `src/games/shared/rendering/RenderUtils.ts`: Contiene utilidades genéricas (`resolveInvulnerabilityPulse`, etc.).
  - `src/games/shared/rendering/JuiceOrchestrator.ts`: Genérico e independiente de juegos específicos.
  - `src/games/shared/rendering/PlatformerSharedVisuals.ts`: Proporciona drawers compartidos (`drawSentinel`, `drawHopper`, `drawCharger`, `drawWatcher`, `drawMemoryFragment`, `drawMemoryCore`).

- **Hallazgo Crítico de Acoplamiento**:
  - `PlatformerSharedVisuals.ts` (Línea 15) realiza una importación cruzada directa desde `../../echorunner/rendering/EchoRunnerVisualUtils`. Esto provoca que cualquier juego que use `PlatformerSharedVisuals` (como `platformer` o `hitandrun`) arrastre una dependencia implícita con `echorunner`.

- **Recomendación**:
  - Mover la lógica compartida de resolución de paleta/estilo desde `EchoRunnerVisualUtils` hacia `RenderUtils.ts` o `@tiny-aster/gameplay-kit`, garantizando que `src/games/shared` sea 100% agnóstico e independiente de juegos individuales.

---

## 4. Tabla Resumen de Desacople por Juego

Juegos ordenados de **Menos Desacoplado** (Prioridad Alta de Refactorización) a **Más Desacoplado**:

| Juego | Constructor usa Theme | Drawers Usan `resolveThemeColor` | Imports Cruzados | Nivel de Desacople |
| :--- | :---: | :---: | :---: | :--- |
| **`hitandrun`** | ❌ No | ❌ No (Hex Hardcodeados) | ⚠️ Gravedad Alta (`echorunner`, `platformer`) | **No desacoplado** |
| **`echorunner`** | ❌ No | ⚠️ No (`ECHO_PALETTE` local) | ⚠️ Media (`platformer`) | **No desacoplado** |
| **`tower-defense`** | ✅ Sí | ❌ No (100% Hex Hardcodeados) | Ninguno | **Parcialmente desacoplado** |
| **`geometrywars`** | ✅ Sí | ⚠️ Solo Canvas (Skia hardcodeado) | Ninguno | **Parcialmente desacoplado** |
| **`frogger`** | ⚠️ Parcial | ⚠️ Solo Vehículos (Troncos/Tortugas hardcodeados) | Ninguno | **Parcialmente desacoplado** |
| **`platformer`** | ✅ Sí | ❌ No (`colors.ts` hardcodeado) | ⚠️ Media (vía `shared`) | **Parcialmente desacoplado** |
| **`racing`** | ⚠️ Parcial | ⚠️ No (`RacingSkin` / `RacingPalette`) | Ninguno | **Parcialmente desacoplado** |
| **`outrun`** | ⚠️ Parcial | ⚠️ No (`OutrunPalettes.ts` local) | Ninguno | **Parcialmente desacoplado** |
| **`arkanoid`** | ✅ Sí | ✅ Sí | Ninguno | **Totalmente desacoplado** |
| **`asteroids`** | ✅ Sí | ✅ Sí | Ninguno | **Totalmente desacoplado** |
| **`flappybird`** | ✅ Sí | ✅ Sí (Concept Packs) | Ninguno | **Totalmente desacoplado** |
| **`pong`** | ✅ Sí | ✅ Sí | Ninguno | **Totalmente desacoplado** |
| **`space-invaders`** | ✅ Sí | ✅ Sí | Ninguno | **Totalmente desacoplado** |
| **`vertical-shmup`** | ✅ Sí | ✅ Sí | Ninguno | **Totalmente desacoplado** |

---

## 5. Deuda Técnica Transversal y Patrones Anti-Patrón

Durante la auditoría global se han identificado 4 patrones recurrentes de deuda técnica transversal:

1. **Inconsistencia entre Renderizadores Canvas2D y Skia**:
   - Varios juegos (`geometrywars`, `tower-defense`) implementaron `resolveThemeColor` para Canvas2D pero dejaron la versión Skia con constantes `defaultColor` o literales hex hardcodeados. Toda refactorización futura debe aplicar el cambio simultáneamente en `rendering/*CanvasVisuals.ts` y `rendering/*SkiaVisuals.ts`.

2. **Paletas Fijas Locales en Lugar de Overrides en `Theme`**:
   - Juegos como `echorunner` (`ECHO_PALETTE`), `hitandrun` (`HIT_RUN_PALETTE`), `racing` (`getRacingPalette`) y `outrun` (`OutrunPalettes.ts`) crearon sistemas de paletas custom aislados. La solución estandarizada consiste en extender `VisualTheme` / `Theme` para que el recurso del `World` contenga estas variantes sin aislar a los drawers de `resolveThemeColor`.

3. **Acoplamiento Directo por Imports Cruzados entre Carpetas de Juegos**:
   - `hitandrun` -> `echorunner` & `platformer`.
   - `echorunner` -> `platformer`.
   - `shared` -> `echorunner`.
   **Regla de Límite**: Ningún archivo dentro de `src/games/<juego_A>` debe importar de `src/games/<juego_B>`. Toda entidad, blueprint, sistema o visual compartida entre 2 o más juegos DEBE residir en `packages/gameplay-kit` o `src/games/shared`.

4. **Constructores Inflexibles que No Aceptan `theme` en Opciones**:
   - Juegos como `frogger`, `outrun` y `racing` hardcodean la llamada a `createThemeFromGameAccents("<juego>")` dentro del constructor sin verificar si el usuario pasó un `theme` personalizado en el objeto de opciones. Se debe estandarizar el patrón `theme: config.theme ?? createThemeFromGameAccents("<juego>")` en el 100% de los constructores.
