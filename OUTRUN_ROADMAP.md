# OUTRUN_ROADMAP.md — Hoja de Ruta de Out Run Pseudo-3D

Estado global y seguimiento del proyecto Out Run en `src/games/outrun/`.

---

## 1. Misión y Visión
Construir `outrun`, un arcade racer pseudo-3D estilo Out Run, en `src/games/outrun/` sobre TinyAsterEngine.
Norte visual: «Una postal japonesa de verano que cobra vida a 200 km/h.» Out Run + ilustración japonesa + low-poly estilizado + cel shading + parallax profundo.

---

## 2. Arquitectura y Decisiones Técnicas

### OutrunGame Architecture
- `OutrunGame` es una subclase de `BaseGame` (similar a `ArkanoidGame` y `EchoRunnerGame`).
- Registrada en el sistema de app routing de Expo Router en `src/app/outrun/` y en `src/app/index.tsx`.
- Registro de minijuegos para campaña en `src/services/CampaignGameRegistryService.ts` bajo la clave `"outrun"`.
- Los datos de carretera viven como resource (`RoadData`) en el World ECS. `RaceStateComponent` es un componente singleton.
- `projectRoad()` es la función pura de proyección 3D a 2D y la única fuente de verdad geométrica compartida entre Canvas y Skia.
- **Efecto de Camera2D en renderers pseudo-3D:** `drawOutrunRoad` y la proyección pseudo-3D operan directamente en espacio de pantalla de viewport completo `(0, 0, screenW, screenH)`. El motor no aplica transformaciones de matriz de `Camera2D` sobre la entidad `RoadRoot` para evitar distorsionar o desalinear las coordenadas proyectadas del pseudo-3D.

---

## 3. Checklist persistente

- [x] F0 Andamiaje ECS — commit: `feat(outrun): F0 — andamiaje ecs y definicion del juego` — gate: test headless verde
- [x] F1 Carretera y proyección pura — commit: `feat(outrun): F1 — carretera como datos y proyeccion pura` — gate: 5 tests de proyeccion verdes
- [x] F2 ★ Carretera recta en Canvas — commit: `feat(outrun): F2 — carretera recta en Canvas` — Gate A: carretera legible, avance y steering funcionales, perspectiva estable
- [x] F3 ★ Curvas, colinas, rumble, fog — commit: `feat(outrun): F3 — curvas, colinas, rumble y fog` — Gate B: tests F1/F3 verdes, fuerza centrifuga en curvas, oclusion en colinas por maxy, fog suave
- [x] F4 Coche, tráfico, colisiones — commit: `feat(outrun): F4 — coche, trafico y colisiones` — gate: tests de trafico y colisiones verdes, oclusion por colinas en rivales
- [x] F5 Validación — commit: `feat(outrun): F5 — validacion del vertical slice` — Gate C: recta -> perspectiva -> avance -> curvas -> colinas -> coche -> trafico -> colisiones jugable, determinista y build verde
- [x] F6 ★ Costa y capas — commit: `feat(outrun): F6 — costa y capas` — Gate D1: paleta como datos en OutrunPalettes.ts, sky de 5 bandas, sol, montañas facetadas por hash determinista, parallax
- [x] F7 ★ Desierto, montaña, transición — commit: `feat(outrun): F7 — desierto, montaña y transicion` — Gate D2: costa -> desierto -> montaña con interpolacion suave de paletas en getScenarioPaletteAtZ
- [x] F8 VFX y animación — commit: `feat(outrun): F8 — vfx y animacion` — Gate E: lineas de velocidad a >70% maxSpeed, inclinado al girar, rebote off-road y soporte VisualOffset
- [x] F9 HUD y escenas — commit: `feat(outrun): F9 — hud y escenas` — gate: HUD con tarjetas de alto contraste >=4.5:1, flujo con fases (countdown, racing, finish), ruta /outrun en e2e
- [x] F10 Skia y paridad — commit: `feat(outrun): F10 — skia y paridad` — Gate F: drawers Skia en OutrunSkiaVisuals.ts con paridad visual total respecto a Canvas
- [x] F11 Cierre — commit: `feat(outrun): F11 — cierre de proyecto` — gate: aceptacion completa de pseudo-3D Out Run racer, cero allocations en hot path, pnpm build y tests verdes
- [x] F12 ★ Decorado arquitectónico OUT RUN 2049 — commit: `feat(outrun): F12 — decorado arquitectonico out run 2049` — gate: sprites por segmento con oclusion por crestas, paletas por escenario, nubes parallax, chevrones, billboards, horizontes contemporaneos, sombras, polvo y ciclo de luz

---

## 4. APIs Verificadas

- `world.setResource(name, value)` / `world.getResource<T>(name)` / `world.getSingleton` / `world.mutateSingleton` / `world.snapshot()` / `world.restore()` (`World`).
- `world.gameplayRandom` (gameplay determinista) y `world.renderRandom` (efectos solo visuales).
- `runWithUnlockedRandomAndMutators` (`src/games/shared/configHelper.ts`): desbloquea temporalmente `gameplayRandom` para inicialización de escena fuera de los ticks de simulación.
- `WorldCommandBuffer` (`world.getCommandBuffer()`): creación/eliminación diferida durante actualización de World.
- `SystemPhase.Input | .Simulation | .Transform | .Collision | .GameRules | .Presentation`.
- `VisualOffset` (`packages/core/src/ecs/CoreComponents.ts`).
- `UnifiedInputSystem` (`packages/core/src/input/UnifiedInputSystem.ts`).
- `loadAndMutateConfig` (`src/games/shared/configHelper.ts`).
- `RendererUtils.registerAssets` (`packages/core/src/rendering/RendererUtils.ts`).

---

## 5. Decisiones Tomadas

- `OutrunGame` hereda de `BaseGame` directamente y se registra en `CampaignGameRegistryService` y `src/app/index.tsx`.
- `outrun.json` ajustado con Zod schema estricto conteniendo sólo las claves necesarias por fase.
- `generateRoad` utiliza `runWithUnlockedRandomAndMutators` para evitar excepciones de `RandomService` bloqueado durante la inicialización.
- Auditoría de sesión realizada: Se verificó la presencia completa del código de `src/games/outrun/`, sus tests unitarios (18/18 verdes), typecheck, lint y el enrutamiento. Se creó `src/app/outrun/_layout.tsx` para completar el enrutamiento anidado en Expo Router.

---

## 6. Deuda Técnica

- Ninguna por ahora.

---

## 7. Pendiente de Revisión Humana

- Ajuste fino de constantes de dirección (`steerSpeed`, `centrifugalForce`) cuando la carretera se renderice en pantalla (F2/F3).
