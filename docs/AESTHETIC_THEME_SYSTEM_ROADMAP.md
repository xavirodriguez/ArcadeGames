# Roadmap — Sistema de estéticas desacopladas para ArcadeGames

**Estado:** propuesta verificada contra el checkout actual (`2026-10-25`)
**Objetivo:** que cualquier juego del monorepo pueda adoptar una estética nueva (Sumi-e, Ukiyo-e, pixel art, papel de oficina, etc.) sin tocar su simulación, sus sistemas ECS ni su lógica de puntuación.
**Resultado esperado:** añadir un tema = crear una carpeta y registrarlo. Cambiar de tema = una sola línea o un parámetro de URL.

---

## 1. Principios rectores

1. **La simulación es intocable.** Los temas solo leen snapshots. Nunca modifican componentes, recursos, colisiones, puntuación ni el hash de estado.
2. **Dependencia unidireccional.** `systems/` no conoce `presentation/`; `presentation/` sí puede leer componentes para construir snapshots de solo lectura.
3. **Un contrato, dos backends.** El mismo tema debe funcionar en Canvas 2D (web) y Skia (nativo). La estética no debe duplicarse por backend.
4. **Tres capas separadas:** tokens (colores/tipografía), renderer (procedimientos visuales) y assets (sprites, fuentes, audio). Un tema puede usar solo tokens; no está obligado a implementar todo.
5. **Registro por juego.** Nada de un singleton global que mezcle temas de distintos juegos.
6. **Aleatoriedad cosmética inyectada.** `Math.random()` prohibido en presentación. Usar `world.renderRandom` o un `CosmeticRandom` derivado de la semilla.
7. **Audio existente.** No crear un `SoundSynth` nuevo: `@tiny-aster/arcade-sound-kit` ya cubre síntesis procedural.
8. **Los mods no son temas.** Un mod puede alterar gameplay (fractura de iceberg, viento náutico); un tema es solo presentación. Hay que separarlos, no fusionarlos.

---

## 2. Estado actual verificado

### 2.1 Lo que ya existe

| Mecanismo | Ubicación | Qué resuelve | Limitación |
| --- | --- | --- | --- |
| **Theme resource (tokens)** | `packages/core/src/theme/Theme.ts` | `colorMap`, `spriteMap`, `effects`, `lore`, `vfxProfile`, `visualTheme`, `conceptPack` en el `World` | Solo colores/mapeos; no renderiza fondos, HUD ni entidades procedurales |
| **Accents por juego** | `src/theme/gameAccents.ts` | Paleta por defecto de cada juego vía `createThemeFromGameAccents` | Es un punto de partida, no una estética completa |
| **Visual mods** | `src/games/asteroids/mods/`, `src/games/space-invaders/mods/`, `src/games/outrun/mods/` | Plugins por juego con `createTheme`, `registerDrawers`, fondos y HUD | Cada juego define su propio contrato; mezclan presentación y gameplay |
| **HitRunTheme (provider)** | `src/games/hitandrun/rendering/theme/` | Contrato completo: backdrop, entidades, proyectiles, feedback, HUD y banners. Registro con hot-swap y dos temas (`fantasy`, `sumi-e`) | Específico de Hit & Run, solo Canvas, singleton global, tokens con nombres del juego |
| **HUD React** | `src/context/GameThemeContext.ts`, `GameThemeProvider.tsx` | Tokens, accent colors, alto contraste y reduced motion para la UI React | No comparte contrato con el renderer de canvas |
| **VFX compartidos** | `src/games/shared/rendering/SharedVFX.ts`, `ParallaxSystem.ts`, `LevelThemeSystem.ts` | Starfields, nebulosas, planetas, parallax, presets de nivel | Acoplados a la temática espacial; no son un contrato de tema |
| **Concept packs** | `src/theme/conceptPacks/` | Reskin narrativo: títulos, diálogos, role labels | No incluye presentación visual |
| **Audio procedural** | `packages/arcade-sound-kit/` | Síntesis determinista de WAV/efectos | Ya resuelto; no duplicar |

### 2.2 Hallazgos que condicionan el roadmap

- **El patrón correcto ya está inventado en Hit & Run.** `HitRunTheme` + `HitRunThemeTypes` + `ThemeRegistry` + `TemplateTheme` es exactamente la dirección a generalizar. No hay que diseñar desde cero.
- **El contrato actual es Canvas-only.** `SumiETheme` usa `document.createElement("canvas")`, `HTMLCanvasElement` y `CanvasRenderingContext2D`. En Skia nativo no hay paridad real; `HitAndRunGame` registra drawers "canvas-compatible" y lo documenta como deuda.
- **El registro es global y singleton.** `ThemeRegistry` guarda un único `activeThemeInstance`; dos juegos o dos instancias no pueden convivir. El `setActiveTheme` además hace `dispose()` del tema anterior, lo que impide precargar o previsualizar.
- **Los mods mezclan capas.** `IcebergFracture`, `IslandErosionSystem` y `NauticalWindSystem` son gameplay; `IcebergCanvasVisuals` y `NauticalChartBackground` son presentación. Convertir un mod entero en tema rompería la simulación.
- **`IDrawAdapter` es insuficiente para Sumi-e.** Solo cubre círculos, rectángulos, líneas, arcos y texto básico. Faltan paths, elipses, gradientes, clip, transformaciones y tipografía con familia/alineación. Sin eso, el tema no se puede escribir una sola vez para Canvas y Skia.
- **`galaxian` no inyecta tema por defecto.** `GalaxianGame` pasa `theme: config.theme` sin fallback; los drawers caen a colores hardcodeados. Es un quick win.
- **Hay dos HUD distintos.** Hit & Run pinta HUD en canvas; la mayoría de juegos lo pinta en React (`src/app/<game>/index.tsx`). Un tema completo debe alimentar ambos o declarar explícitamente que solo cubre el canvas.

---

## 3. Arquitectura objetivo

```
┌─────────────────────────────────────────────────────────────┐
│  Simulación determinista (systems/, ECS World)              │
│  No importa nada de presentation/                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ snapshots de solo lectura
┌──────────────────────────▼──────────────────────────────────┐
│  src/games/<game>/presentation/                             │
│  - snapshotBuilder.ts  (ECS → EntityVisualSnapshot, HUD…)   │
│  - registerPresentation.ts (shape drawers por backend)      │
│  - themeRegistry.ts (temas disponibles para ese juego)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ ThemeRenderer<GameSnapshot>
┌──────────────────────────▼──────────────────────────────────┐
│  @tiny-aster/presentation-kit                               │
│  - ThemeRenderer contract + tokens + assets + registry      │
│  - primitivas reutilizables (tinta, papel, sellos, kanji)   │
│  - temas compartidos (sumi-e, template)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ ThemePainter (primitivas abstractas)
┌──────────────────────────▼──────────────────────────────────┐
│  CanvasThemePainter (renderer-canvas)                       │
│  SkiaThemePainter   (renderer-skia)                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Contrato propuesto (TypeScript estricto)

```ts
// packages/presentation-kit/src/theme/ThemeTokens.ts
export interface ThemeTokens {
  readonly background: string;
  readonly surface: string;
  readonly paper: string;
  readonly ink: string;
  readonly inkMuted: string;
  readonly text: string;
  readonly accent: string;
  readonly danger: string;
  readonly success: string;
  readonly warning: string;
  readonly outline: string;
  readonly extra?: Readonly<Record<string, string>>;
}

export interface ThemeTypography {
  readonly display: string;
  readonly body: string;
  readonly mono: string;
}
```

```ts
// packages/presentation-kit/src/theme/snapshots.ts
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface CameraSnapshot {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface ThemeFrame {
  readonly viewport: Viewport;
  readonly camera: CameraSnapshot;
  readonly elapsed: number;
  readonly tick: number;
  readonly reduceMotion: boolean;
}

export interface EntityVisualSnapshot {
  readonly visualId: string;
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly facing: -1 | 1;
  readonly scale: number;
  readonly size: number;
  readonly animState: string;
  readonly hitFlash: number;
  readonly tint?: string;
}

export interface HudVisualSnapshot {
  readonly score: number;
  readonly lives?: number;
  readonly hp?: { readonly current: number; readonly max: number };
  readonly combo?: number;
  readonly sectionLabel?: string;
  readonly isGameOver: boolean;
  readonly extra?: Readonly<Record<string, string | number | boolean>>;
}

export interface FeedbackVisualEvent {
  readonly type: "hit" | "death" | "explosion" | "pickup";
  readonly x?: number;
  readonly y?: number;
  readonly amount?: number;
  readonly category?: string;
}

export interface BannerVisualSnapshot {
  readonly text: string;
  readonly subtext?: string;
  readonly remaining: number;
  readonly totalDuration: number;
}

export interface ThemeImage {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export type ThemeCapability =
  | "procedural-backdrop"
  | "sprite-entities"
  | "procedural-entities"
  | "canvas-hud"
  | "react-hud"
  | "audio-pack"
  | "reduced-motion";

export interface ThemeDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: readonly ThemeCapability[];
}

export interface ThemeAssetManifest {
  readonly images?: Readonly<Record<string, ThemeImage>>;
  readonly fonts?: Readonly<Record<string, { readonly family: string; readonly uri: string; readonly license: string }>>;
  readonly audio?: Readonly<Record<string, string>>;
}
```

> Los snippets son ilustrativos: los tipos auxiliares (`ThemeGradient`, `ThemeImage`, `ThemeAssetManifest`, `ThemeCapability`, etc.) se completan en la fase 1.

```ts
// packages/presentation-kit/src/painter/ThemePainter.ts
export interface FillStyle {
  readonly color?: string;
  readonly gradient?: ThemeGradient;
  readonly alpha?: number;
}

export interface StrokeStyle {
  readonly color: string;
  readonly width?: number;
  readonly alpha?: number;
  readonly lineCap?: "butt" | "round" | "square";
  readonly lineJoin?: "miter" | "round" | "bevel";
}

export interface TextStyle {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight?: "normal" | "bold";
  readonly align?: "left" | "center" | "right";
  readonly baseline?: "top" | "middle" | "alphabetic" | "bottom";
  readonly color: string;
  readonly alpha?: number;
}

export interface ThemeGradient {
  addColorStop(offset: number, color: string): void;
}

export interface ThemePainter {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  rotate(radians: number): void;
  setAlpha(alpha: number): void;

  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  fill(style: FillStyle): void;
  stroke(style: StrokeStyle): void;

  fillRect(x: number, y: number, width: number, height: number, style: FillStyle): void;
  strokeRect(x: number, y: number, width: number, height: number, style: StrokeStyle): void;
  fillCircle(x: number, y: number, radius: number, style: FillStyle): void;
  fillEllipse(x: number, y: number, rx: number, ry: number, rotation: number, style: FillStyle): void;

  fillText(text: string, x: number, y: number, style: TextStyle): void;
  measureText(text: string, style: TextStyle): { readonly width: number; readonly height: number };

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): ThemeGradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): ThemeGradient;

  drawImage(image: ThemeImage, x: number, y: number, width: number, height: number, alpha?: number): void;
  clipRect(x: number, y: number, width: number, height: number): void;
}
```

```ts
// packages/presentation-kit/src/theme/ThemeRenderer.ts
export interface ThemeRenderer<TSnapshot> {
  readonly id: string;
  readonly name: string;
  readonly tokens: ThemeTokens;
  readonly typography: ThemeTypography;

  renderBackdrop(painter: ThemePainter, frame: ThemeFrame): void;
  renderEntity(painter: ThemePainter, entity: EntityVisualSnapshot, frame: ThemeFrame): void;
  renderProjectile(painter: ThemePainter, entity: EntityVisualSnapshot, frame: ThemeFrame): void;
  renderFeedback(painter: ThemePainter, event: FeedbackVisualEvent, frame: ThemeFrame): void;
  renderHud(painter: ThemePainter, hud: HudVisualSnapshot, frame: ThemeFrame): void;
  renderBanner?(painter: ThemePainter, banner: BannerVisualSnapshot, frame: ThemeFrame): void;

  onResize?(viewport: Viewport): void;
  dispose?(): void;

  /** Snapshot completo opcional para temas que necesitan componer toda la escena. */
  renderFrame?(painter: ThemePainter, snapshot: TSnapshot, frame: ThemeFrame): void;
}
```

```ts
// packages/presentation-kit/src/theme/ThemeRegistry.ts
export interface ThemeModule<TGameId extends string, TSnapshot> {
  readonly id: string;
  readonly gameId: TGameId;
  readonly displayName: string;
  readonly capabilities: readonly ThemeCapability[];
  create(): ThemeRenderer<TSnapshot>;
}

export class ThemeRegistry<TGameId extends string, TSnapshot> {
  register(module: ThemeModule<TGameId, TSnapshot>): void;
  list(gameId: TGameId): ReadonlyArray<ThemeDescriptor>;
  create(gameId: TGameId, themeId: string): ThemeRenderer<TSnapshot>;
  resolve(gameId: TGameId, requestedId?: string): ThemeRenderer<TSnapshot>;
}
```

### 3.2 Estructura de archivos propuesta

```
packages/presentation-kit/
  src/
    index.ts
    theme/
      ThemeRenderer.ts
      ThemeTokens.ts
      ThemeRegistry.ts
      ThemeAssets.ts
      snapshots.ts
      ThemeFrame.ts
    painter/
      ThemePainter.ts
      ThemeGradient.ts
      ThemeImage.ts
    primitives/
      ink.ts              # salpicaduras, trazos, decals
      paper.ts            # grano, viñeta, fibras
      mountains.ts        # cordilleras con curvas cuadráticas
      seal.ts             # sellos Hanko
      kanji.ts            # texto flotante / onomatopeyas
      parallax.ts         # capas de profundidad deterministas
    themes/
      template/TemplateTheme.ts
      sumi-e/
        SumiETheme.ts
        SumiEPalette.ts
        SumiEBackdrop.ts
        SumiEEntities.ts
        SumiEHud.ts
        SumiEAssets.ts
    testing/
      createMockPainter.ts
      assertThemeContract.ts
  package.json
  tsconfig.json

packages/renderer-canvas/src/CanvasThemePainter.ts
packages/renderer-skia/src/SkiaThemePainter.ts

src/games/<game>/presentation/
  snapshotBuilder.ts
  registerPresentation.ts
  themeRegistry.ts
  themes/<theme-id>/...
```

> Decisión recomendada: empezar en `src/games/shared/presentation/` durante las fases 1-3 y extraer a `packages/presentation-kit` cuando el contrato esté validado con dos juegos. Así se evita crear un paquete prematuro y se respeta la regla de no duplicar.

---

## 4. Roadmap por fases

### Resumen

| Fase | Entrega | Depende de | Esfuerzo | Prioridad |
| --- | --- | --- | --- | --- |
| 0 | Baseline visual e inventario | — | 1-2 días | P0 |
| 1 | Contrato, snapshots y registro | 0 | 2-3 días | P0 |
| 2 | `ThemePainter` Canvas + Skia | 1 | 4-6 días | P0 |
| 3 | Piloto Hit & Run + Sumi-e | 2 | 3-5 días | P0 |
| 4 | Piloto Asteroids + separar Iceberg | 3 | 4-6 días | P0 |
| 5 | Unificar mods y temas | 4 | 4-6 días | P1 |
| 6 | Sumi-e de producción | 3 | 5-8 días | P1 |
| 7 | Selección de tema y HUD React | 3, 6 | 2-3 días | P1 |
| 8 | DX: generador, docs, lint, tests | 3-5 | 2-3 días | P1 |
| 9 | Rollout al resto de juegos | 4-8 | 1 juego/semana | P2 |

**MVP recomendado (2-3 semanas):** fases 0-4. Permite demostrar el patrón en dos juegos con Canvas y Skia, con Sumi-e funcionando en Hit & Run y un tema nuevo en Asteroids.

---

### Fase 0 — Baseline visual e inventario

**Objetivo:** congelar una referencia reproducible antes de refactorizar.

Tareas:
1. Capturar frames deterministas de cada juego en Canvas y Skia con una semilla fija y un `tick` fijo.
2. Guardar las capturas en `docs/audit/theme-baseline/` (o artefacto CI) con nombre `<game>-<backend>-<tick>.png`.
3. Completar la matriz de la sección 5 con el estado real de cada juego.
4. Identificar todos los `fillStyle`/`strokeStyle` hardcodeados que no pasan por `resolveThemeColorWithFallback`.
5. Verificar qué juegos no inyectan tema por defecto (`galaxian` es el caso conocido).

Archivos de referencia:
- `src/games/shared/__tests__/ThemeDecouplingParity.test.ts`
- `src/games/shared/__tests__/GameModuleBoundaries.test.ts`
- `src/games/shared/__tests__/ThemeSystem.test.ts`
- `src/games/hitandrun/rendering/__tests__/HitRunThemeRegistry.test.ts`

**Criterio de aceptación:** existe un baseline visual reproducible y una tabla de deuda por juego; no se ha modificado código de producción.

---

### Fase 1 — Contrato, snapshots y registro

**Objetivo:** extraer el contrato de `HitRunTheme` a un módulo compartido, sin cambiar el comportamiento.

Tareas:
1. Crear `src/games/shared/presentation/` con `ThemeRenderer`, `ThemeTokens`, `snapshots.ts` y `ThemeRegistry`.
2. Mover los tipos de `HitRunThemeTypes.ts` a snapshots genéricos; conservar alias para no romper imports.
3. Cambiar los nombres de tokens de Hit & Run (`paperOrFloor`, `darkOniOrElite`) a tokens semánticos (`paper`, `ink`, `danger`…). Los tokens específicos van a `tokens.extra`.
4. Definir `ThemeModule` con `gameId` y `capabilities` (`procedural-backdrop`, `sprite-entities`, `canvas-hud`, `react-hud`, `audio-pack`…).
5. Implementar un registro por instancia, no singleton. El juego crea su propio `ThemeRegistry`.
6. Añadir `ThemeContext` con `viewport`, `camera`, `elapsed`, `tick`, `reduceMotion` y `random: () => number`.

**Criterio de aceptación:**
- `pnpm typecheck:app` pasa.
- `HitRunTheme` sigue funcionando mediante un adaptador.
- Tests de contrato: todo tema registrado implementa los métodos obligatorios.
- Ningún archivo de `systems/` importa `presentation/`.

---

### Fase 2 — `ThemePainter` Canvas + Skia

**Objetivo:** que un tema se escriba una sola vez y se renderice en ambos backends.

Tareas:
1. Extender el contrato de `IDrawAdapter` existente (`src/games/shared/rendering/DrawAdapter.ts`) o crear `ThemePainter` con paths, elipses, gradientes, clip, transformaciones y texto con estilo.
2. Implementar `CanvasThemePainter` en `packages/renderer-canvas/` y `SkiaThemePainter` en `packages/renderer-skia/`.
3. Añadir un `ThemeSurface` para superficies offscreen (textura de papel, cachés de fondo):
   - Canvas: `OffscreenCanvas` o `document.createElement("canvas")`.
   - Skia: `Skia.Surface.MakeOffscreen` si está disponible; si no, dibujar el fondo procedural por frame con caché de paths.
4. Suite de conformidad: ejecutar la misma secuencia de primitivas contra ambos painters y comparar el orden de llamadas y los parámetros.
5. Benchmarks: medir coste por frame de un backdrop Sumi-e con y sin caché.

**Criterio de aceptación:**
- Un mismo `SumiEBackdrop` se renderiza en Canvas y Skia sin `if (isSkia)`.
- La suite de conformidad pasa en CI.
- El coste del tema no supera 1 ms/frame en un dispositivo de gama media (excluyendo assets).

**Riesgo principal:** Skia no expone exactamente las mismas primitivas (por ejemplo, gradientes o texto). Mitigación: el painter puede degradar (`fallback`) y la suite debe declarar qué capacidades son opcionales.

---

### Fase 3 — Piloto Hit & Run + Sumi-e

**Objetivo:** validar el contrato en el juego que ya tiene la implementación más avanzada.

Tareas:
1. Adaptar `SumiETheme` y `FantasyTheme` al nuevo `ThemeRenderer`.
2. Mantener `?theme=` y `gameOptions.theme` como mecanismos de selección.
3. Eliminar el singleton global: un registro por partida, con `dispose()` al salir.
4. Mover el PRNG cosmético a `ThemeContext.random` (derivado de `world.renderRandom` o de la semilla).
5. Separar `renderBackdrop` en capas: papel, parallax, decals, marco. Cada capa con su caché.
6. Convertir `createInkSplatter`, `drawMountainRange` y `FloatingKanji` en primitivas compartidas (ver anexo).
7. Añadir test de no-regresión: el hash de simulación no cambia entre `fantasy` y `sumi-e`.

**Criterio de aceptación:**
- Cambiar de tema no reinicia la partida ni altera el estado.
- `fantasy` mantiene el aspecto actual (paridad visual aprobada).
- `sumi-e` funciona en Canvas y Skia.
- `dispose()` libera canvas offscreen, buffers de decals y listeners.

---

### Fase 4 — Piloto Asteroids + separar Iceberg

**Objetivo:** demostrar que el contrato sirve para un juego con mods existentes y doble backend.

Tareas:
1. Convertir `AsteroidsVisualMod` en una fachada de `ThemeModule`.
2. Migrar `ClassicMod` a `ClassicTheme` (tokens + drawers actuales).
3. Separar `IcebergMod` en:
   - `IcebergTheme`: paleta, fondo, visuales de fragmentos, partículas.
   - `IcebergGameplayMod`: `IcebergFracture`, geometría, reglas de fractura.
4. Mantener los IDs `classic` e `iceberg` para no romper configuraciones existentes.
5. Registrar los temas en `src/games/asteroids/presentation/themeRegistry.ts`.
6. Añadir un test que verifique que `systems/` no importa el tema y que el tema no escribe en el `World`.

**Criterio de aceptación:**
- `?theme=iceberg` y `gameOptions.mod = "iceberg"` siguen funcionando.
- El juego es determinista con cualquier tema.
- El tema se puede cambiar sin reiniciar.

---

### Fase 5 — Unificar mods y temas

**Objetivo:** una sola forma de registrar estéticas en todo el monorepo.

Tareas:
1. Definir la relación:
   - `ThemeModule`: presentación.
   - `GameplayMod`: reglas.
   - `AestheticBundle`: combinación opcional de ambos + `ConceptPack`.
2. Migrar `space-invaders`:
   - `NauticalWindSystem` e `IslandErosionSystem` → gameplay mod.
   - `NauticalChartBackground`, `NauticalHudOverlay` → theme.
3. Migrar `outrun`: `ClassicMod` → `ClassicTheme`; las paletas de `OutrunPalettes.ts` pasan a tokens.
4. Migrar `flappybird`: `officePaper` deja de ser solo un concept pack y se convierte en theme completo si mantiene sus visuales Canvas/Skia.
5. Crear un adaptador de compatibilidad para que `registerVisualMod` siga funcionando durante la transición.

**Criterio de aceptación:**
- No hay dos registros distintos para el mismo juego.
- Los IDs antiguos siguen resolviendo.
- Tests de `NauticalPhase3` y de mods existentes pasan.

---

### Fase 6 — Sumi-e de producción

**Objetivo:** llevar la estética Sumi-e del prototipo a calidad de producción y reutilizable por varios juegos.

Tareas:
1. **Papel washi:** textura procedural cacheada por resolución y DPR; grano, fibras y viñeta. Sin imágenes pesadas.
2. **Parallax Suibokuga:** 3-5 capas con opacidades decrecientes, curvas cuadráticas y wrapping. Reutilizar `ParallaxSystem` para los factores.
3. **Salpicaduras y decals:** buffer circular acotado (32-64), anclaje en coordenadas de mundo, decaimiento opcional.
4. **Sellos Hanko:** componente reutilizable con rotación, borde, sombra interna y texto vertical.
5. **Kanji flotante:** sistema de texto flotante con ascenso, fade y escala; pool para evitar allocations.
6. **Tipografía:** cargar `Yuji Boku`/`Noto Serif JP` con `expo-font` o assets locales; fallback a serif del sistema. Declarar licencias en `SumiEAssets.ts`.
7. **Audio:** mapear disparos, impactos y tambores a recetas de `@tiny-aster/arcade-sound-kit`; no añadir Web Audio ad hoc.
8. **Accesibilidad:** alto contraste, `reduceMotion` (desactivar parallax y kanji flotante), contraste mínimo de texto.
9. **Rendimiento:** presupuesto de 1 ms/frame para backdrop; limitar DPR de la textura de papel; cachear gradientes.

**Criterio de aceptación:**
- 60 fps estables en web y en un dispositivo Android/iOS de gama media.
- `reduceMotion` desactiva las animaciones no esenciales.
- El tema no cambia el hash de simulación.
- Un segundo juego puede usar `SumiETheme` cambiando solo el `snapshotBuilder` y los `visualId`.

---

### Fase 7 — Selección de tema y HUD React

**Objetivo:** que el usuario pueda cambiar estética sin tocar código.

Tareas:
1. Selector en pausa/ajustes con nombre, descripción y preview.
2. Resolver el tema por prioridad: `gameOptions.theme` > `?theme=` > preferencia guardada > default.
3. Persistir la preferencia por juego (`AsyncStorage`/`localStorage`).
4. Puente con `GameThemeProvider` para que el HUD React use los mismos tokens (`paper`, `ink`, `accent`).
5. Preview generada a partir de un frame canónico, no de un screenshot manual.
6. Manejo de errores: tema desconocido → fallback al default sin crash.

**Criterio de aceptación:**
- Cambio en caliente sin reiniciar.
- La preferencia sobrevive a recargas.
- Un tema roto no bloquea la partida.

---

### Fase 8 — DX: generador, docs, lint y tests

**Objetivo:** que crear un tema nuevo sea trivial y seguro.

Tareas:
1. Script `pnpm create:theme <gameId> <themeId>` que genere:
   - `themes/<themeId>/<ThemeId>Theme.ts`
   - `palette.ts`, `assets.ts`, `index.ts`
   - registro automático en `themeRegistry.ts`
   - test de contrato
2. Documento `docs/THEME_AUTHORING_GUIDE.md` con un ejemplo mínimo y un checklist.
3. Reglas ESLint:
   - `systems/**` no puede importar `presentation/**`.
   - `presentation/**` no puede importar `systems/**` (solo componentes/recursos).
   - prohibido `Math.random()` en `presentation/**`.
   - prohibido `#rrggbb` fuera de archivos de paleta/tema.
4. Tests obligatorios:
   - contrato de tema,
   - conformidad de painter,
   - no-regresión de hash,
   - boundaries,
   - snapshot visual (Playwright para web).
5. `TemplateTheme` genérico con métodos vacíos y un ejemplo comentado.

**Criterio de aceptación:**
- Un desarrollador puede añadir un tema nuevo en menos de 2 horas siguiendo la guía.
- CI falla si se rompe el contrato o se importa en la dirección prohibida.

---

### Fase 9 — Rollout al resto de juegos

Orden recomendado por impacto/esfuerzo:

1. `galaxian` (quick win: default theme faltante).
2. `frogger` (tiene `presentation/` y ya usa tokens; buen candidato a fondo procedural).
3. `geometrywars` (neón procedural; reutiliza primitivas).
4. `tower-defense` (muchos role keys; validar tokens semánticos).
5. `racing` (unificar skins con themes).
6. `echorunner` y `platformer` (comparten visuales; un tema para ambos).
7. `arkanoid`, `pong`, `vertical-shmup`, `centipede` (token-only hasta que haya demanda).

Cada juego puede quedarse en "token-only" indefinidamente. El contrato completo solo es obligatorio cuando se necesita una estética que cambie formas, fondos o HUD.

---

## 5. Matriz de migración por juego

| Juego | Estado actual | Trabajo necesario | Prioridad | Esfuerzo |
| --- | --- | --- | --- | --- |
| **hitandrun** | Provider completo, 2 temas, canvas-only | Generalizar contrato, painter Skia, registro por partida | P0 | M |
| **asteroids** | Visual mods classic/iceberg, Canvas+Skia | Fachada de tema, separar gameplay de Iceberg | P0 | M |
| **space-invaders** | Mods classic/nautical, Canvas+Skia | Separar viento/erosión de fondo/HUD | P1 | M |
| **outrun** | Mods classic, renderer detallado | Paletas → tokens, tema completo | P1 | M |
| **flappybird** | OfficePaper + visuales Canvas/Skia | Convertir concept pack en theme | P1 | S |
| **galaxian** | Sin tema por defecto | Inyectar `createThemeFromGameAccents("galaxian")` | P1 | S |
| **frogger** | Tokens + presentation + Canvas/Skia | Primer fondo procedural no espacial | P2 | M |
| **geometrywars** | Tokens + Canvas/Skia | Tema neón procedural | P2 | S-M |
| **tower-defense** | Tokens + muchos role keys | Validar tokens semánticos y HUD | P2 | M |
| **racing** | Tokens + skins | Unificar skins con themes | P2 | M |
| **echorunner** | Visuales compartidos con platformer | Tema compartido | P2 | M |
| **arkanoid** | Tokens + visuales | Token-only suficiente | P3 | S |
| **pong** | Tokens + visuales | Token-only suficiente | P3 | S |
| **vertical-shmup** | Tokens | Token-only suficiente | P3 | S |
| **centipede** | Tokens | Token-only suficiente | P3 | S |
| **platformer** | Visuales compartidos | Token-only suficiente | P3 | S |

---

## 6. Guardrails y Definition of Done

### 6.1 Tests que deben existir

- `ThemeContract.test.ts`: todo tema registrado implementa el contrato.
- `ThemePainterParity.test.ts`: Canvas y Skia producen la misma secuencia de primitivas.
- `ThemeDeterminism.test.ts`: mismo seed + tick → mismas llamadas de dibujo; sin `Math.random()`.
- `ThemeBoundaries.test.ts`: `systems/` no importa `presentation/`; `presentation/` no muta el `World`.
- `ThemeHotSwap.test.ts`: cambiar tema no reinicia la partida y libera recursos.
- `ThemeAccessibility.test.ts`: `reduceMotion` y alto contraste se respetan.
- `ThemeVisualRegression` (Playwright): frames canónicos por juego/tema/backend.

### 6.2 Reglas de código

- `strict: true`; sin `any` nuevo. Usar `unknown` + type guards.
- Snapshots `readonly`; el tema recibe copias, nunca referencias mutables del ECS.
- Cero dependencias de React/Expo/Skia en `presentation-kit`.
- Cero imports de `src/games/<A>` desde `src/games/<B>` (ya cubierto por `GameModuleBoundaries.test.ts`).
- Assets con licencia declarada y fallback si no cargan.

### 6.3 Presupuesto de rendimiento

| Métrica | Objetivo |
| --- | --- |
| Coste de backdrop | < 1 ms/frame en gama media |
| Memoria de cachés | < 16 MB por tema |
| Cambio de tema | < 100 ms, sin recargar |
| Allocations por frame | 0 en el hot path (pools/buffers) |
| Bundle por tema | < 50 KB sin assets; assets lazy-loaded |

### 6.4 Rollback

Cada juego mantiene su tema actual como default. El nuevo sistema se activa por flag (`gameOptions.theme` o `?theme=`). Si un tema falla, se cae al default sin afectar la simulación.

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Divergencia Canvas/Skia | Alto | Suite de conformidad de painter + capacidades opcionales declaradas |
| Sobre-abstracción y coste por frame | Medio | Benchmark desde la fase 2; fast path para temas token-only |
| Fugas de caché al cambiar tema | Medio | `dispose()` obligatorio + test de hot-swap |
| Acoplar el tema a un snapshot de juego | Alto | Snapshots genéricos + `visualId`; el tema no conoce componentes ECS |
| Mods que mezclan gameplay y visual | Alto | Separar `ThemeModule` y `GameplayMod`; no convertir mods enteros |
| Fuentes/asset licensing | Medio | Manifiesto con licencia, lazy load, fallback |
| Determinismo roto por RNG cosmético | Alto | `renderRandom` inyectado; test de hash |
| HUD duplicado canvas/React | Medio | Tokens compartidos + puente `GameThemeProvider` |
| Paquete nuevo prematuro | Bajo | Empezar en `src/games/shared/presentation/`, extraer tras dos pilotos |

---

## 8. Métricas de éxito

1. **Tiempo para crear un tema nuevo:** < 2 horas (objetivo), < 1 día (aceptable).
2. **Archivos modificados fuera de `presentation/` al añadir un tema:** 0.
3. **Juegos con paridad Canvas/Skia:** 100% de los que usan el contrato completo.
4. **Temas disponibles:** al menos 2 por juego piloto (`classic` + uno nuevo).
5. **Regresiones de simulación:** 0 cambios en hashes de estado.
6. **Rendimiento:** 60 fps estables con el tema Sumi-e en gama media.
7. **Cobertura de contrato:** 100% de temas registrados pasan los tests.

---

## 9. Primer sprint recomendado (2 semanas)

### Semana 1

- **Día 1-2:** Fase 0. Baseline de Hit & Run y Asteroids en Canvas/Skia. Inventario de colores hardcodeados. Quick win de `galaxian`.
- **Día 3-4:** Fase 1. Crear `ThemeRenderer`, `ThemeTokens`, snapshots y registro por instancia. Adaptador de compatibilidad para `HitRunTheme`.
- **Día 5:** Spike de `ThemePainter` con las primitivas que necesita Sumi-e (paths, elipses, gradientes, texto).

### Semana 2

- **Día 6-8:** Fase 2. `CanvasThemePainter` + `SkiaThemePainter` + suite de conformidad.
- **Día 9-10:** Fase 3. Migrar `SumiETheme` y `FantasyTheme` al contrato. Activar por flag. Test de no-regresión de hash y de hot-swap.
- **Día 10:** Demo: `?theme=sumi-e` en web y nativo, sin cambios en `systems/`.

**Entregable del sprint:** un contrato compartido, dos backends, dos temas de Hit & Run funcionando y un informe de rendimiento.

---

## 10. Decisiones abiertas

| Decisión | Opciones | Recomendación |
| --- | --- | --- |
| ¿Paquete nuevo o shared? | `packages/presentation-kit` vs `src/games/shared/presentation` | Empezar en `shared`, extraer tras dos pilotos |
| ¿Un painter o temas por backend? | `ThemePainter` abstracto vs `CanvasTheme`/`SkiaTheme` duplicados | Painter abstracto; evita duplicar Sumi-e |
| ¿Canvas primero o ambos? | Canvas-only vs dual desde el inicio | Dual desde la fase 2; el piloto Hit & Run ya tiene deuda Skia |
| ¿Mover Hit & Run ahora? | Migración inmediata vs adaptador | Adaptador primero; mover cuando el contrato esté validado |
| ¿Granularidad del tema? | Token-only vs pack completo | Soportar ambos con `capabilities` |
| ¿Assets incluidos? | Bundle vs lazy load | Lazy load con manifiesto y fallback |
| ¿Temas por juego o compartidos? | `themes/<game>` vs `themes/shared` | Compartidos si son genéricos; específicos si dependen del `visualId` |

---

## 11. Anexo — Mapeo de las funciones del prototipo

| Función del prototipo | Destino propuesto | Adaptación |
| --- | --- | --- |
| `createInkSplatter` | `presentation-kit/src/primitives/ink.ts` | Usar `ThemePainter`; RNG inyectado; buffer de decals acotado |
| `drawMountainRange` | `presentation-kit/src/primitives/mountains.ts` | Usar `quadraticCurveTo` del painter; wrapping con `ParallaxSystem` |
| `FloatingKanji` | `presentation-kit/src/primitives/kanji.ts` + `FloatingTextSystem` | Pool de objetos; `reduceMotion`; fuente del tema |
| `PseudoRandom` | No añadir | Usar `world.renderRandom` o `ThemeContext.random` |
| `SoundSynth` | No añadir | Usar `@tiny-aster/arcade-sound-kit` |
| CSS `.washi-bg` | `src/theme` / HUD React | Gradientes y textura en el tema; no CSS en canvas |
| CSS `.hanko-stamp` | `src/components/` o HUD del tema | Componente React reutilizable + versión canvas |
| Salpicaduras persistentes | `primitives/ink.ts` + estado del tema | El tema mantiene su propio buffer; nunca escribe en el `World` |

---

## 12. Conclusión

El repositorio no parte de cero: **Hit & Run ya valida el patrón de provider de tema** y **Asteroids/Space Invaders ya validan el patrón de plugin visual**. El trabajo real no es inventar la arquitectura, sino:

1. Extraer un contrato común.
2. Resolver la paridad Canvas/Skia con un painter abstracto.
3. Separar presentación de gameplay en los mods existentes.
4. Convertir Sumi-e en un tema compartido, determinista y con presupuesto de rendimiento.
5. Automatizar la creación de temas para que el coste marginal sea mínimo.

Con las fases 0-4 se obtiene un MVP demostrable en 2-3 semanas; el resto puede evolucionar juego a juego sin bloquear el desarrollo.
