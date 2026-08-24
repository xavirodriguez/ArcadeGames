# Guía de Arquitectura Visual de Tiny Aster

Para mantener el sistema de diseño visual limpio, accesible y consistente, todos los desarrolladores (humanos y agentes de IA) deben seguir estas cuatro reglas arquitectónicas fundamentales:

## Reglas del Sistema de Diseño

1. **No introducir colores hexadecimales directamente en los componentes:**
   - Evita el uso de cadenas de color fijas como `"#00f0ff"`, `"#ff0055"` o `"#ffffff"` en las pantallas, componentes o estilos locales.
   - En su lugar, utiliza tokens centralizados desde el tema, por ejemplo, `colors.cyan`, `colors.pink`, `colors.white`, etc.

2. **Los valores visuales compartidos viven en `src/theme/`:**
   - Todos los colores, espaciados, tipografías, radios de bordes y efectos de resplandor (glow) deben residir y gestionarse exclusivamente dentro de la carpeta `src/theme/` (por ejemplo, en `src/theme/colors.ts`).
   - Nota crítica para tests en servidor/headless: Cuando importes colores en simulaciones o archivos de juegos para que los use el motor, importa **directamente** desde `src/theme/colors` (por ejemplo, `import { colors } from "../../../theme/colors"`) en lugar del índice genérico `src/theme/index.ts` o `@/theme`. Esto evita la carga transitiva de dependencias de `react-native` (como `Platform` desde `effects.ts`), previniendo errores de `ReactNativePublicAPI is not defined` en entornos Node/headless de servidor.

3. **Los componentes de UI repetidos entre juegos viven en `src/components/ui/`:**
   - Componentes tales como pantallas de juego contenedoras (`GameScreen`), botones retro de neón (`NeonButton`), títulos parpadeantes (`GameTitle`), entradas de nombres (`PlayerNameInput`), instrucciones de control (`GameInstructions`), records de puntaje (`HighScoreText`) y botones de regreso (`BackButton`) deben ser reutilizados de manera centralizada.
   - Si creas o diseñas un nuevo juego, hereda y usa estos componentes reutilizables de UI.

4. **StyleSheet local solo para estilos específicos del juego:**
   - Las hojas de estilo locales de cada juego (por ejemplo, posicionamiento de controles, scoreboard específico de Pong, disposición del gameplay) solo deben usarse para las necesidades estructurales o de layout particulares de esa pantalla.
   - El estilo visual de la aplicación y la marca se gobiernan centralmente desde el tema.

---

## Boundaries del Core y Arquitectura Narrativa (`packages/core/src/story/`)

### 1. Contenido de `story/` y Consumo por Minijuegos
El módulo `packages/core/src/story/` alberga el subsistema de narrativa de Tiny Aster:
- **Estructuras de datos y Grafos:** Definición del DSL de encuentros (`EncounterDSLSchema.ts`), grafos de historia (`StoryTypes.ts`), paquetes de historia (`StoryPackage`) y serialización/migración de saves (`StorySaveMigrations.ts`).
- **Motores y Validadores:** Runtime de linea de tiempo narrativa (`NarrativeTimelineEngine.ts`, `StoryRuntime.ts`), servicios de metaprogresión (`MetaProgressionService.ts`) y validadores estáticos (`SemanticValidator.ts`, `StoryGraphValidator.ts`, `StoryPackageValidator.ts`).

Aunque los juegos base (Asteroids, Pong, Space Invaders, Flappy Bird) son mecánicamente independientes, todos consumen este subsistema en el modo historia/campaña mediante sus adaptadores de encuentros:
- `src/games/asteroids/story/EscapeRouteEncounter.ts`
- `src/games/echorunner/story/EchoRunnerEncounter.ts`
- `src/games/flappybird/story/FlappyBirdEncounter.ts`
- `src/games/geometrywars/story/GeometryWarsEncounter.ts`
- `src/games/platformer/story/PlatformerEncounter.ts`
- `src/games/pong/story/PongEncounter.ts`
- `src/games/space-invaders/story/InvasionEncounter.ts`

### 2. Justificación del Estado Actual en `@tiny-aster/core`
Actualmente, `story/` reside dentro de `@tiny-aster/core` debido a la arquitectura inicial del monorepo, donde `@tiny-aster/core` proveía una solución integral "all-in-one" que agrupaba el motor ECS puro junto con los subsistemas declarativos de la experiencia de juego arcade (tales como la orquestación narrativa de encuentros y reglas de decisión).

### 3. Garantía de Límites y No-Dependencia Hacia Atrás
Aunque `story/` vive en `@tiny-aster/core`, se mantiene estrictamente agnóstico de plataformas y juegos concretos:
- **Mecanismo CI `check:core-boundaries`:** El script `scripts/check-core-boundaries.sh` (así como el linter AST `scripts/ast-determinism-linter.ts` y las reglas en `eslint.config.mjs`) verifican activamente que nada dentro de `packages/core/src/` (incluido `story/`) importe librerías de plataforma (`react-native`, `@shopify/react-native-skia`, `expo`) ni código específico de minijuegos o app (`src/games/`, `src/app/`).

### 4. Visión Arquitectónica Futura
Se reconoce explícitamente la tensión arquitectónica de alojar el subsistema narrativo dentro del paquete de motor ECS agnóstico. La extracción de `packages/core/src/story/` hacia un paquete independiente (e.g. `@tiny-aster/story`) es una mejora arquitectónica identificada y pendiente, no una decisión cerrada.

---

## Validadores del Subsistema Narrativo

Para evitar reinvestigar el rol de los validadores en `packages/core/src/story/`, se documenta la responsabilidad de cada uno:

1. **`StoryGraphValidator.ts`**: Valida la **topología del grafo de historia pure** (`StoryGraph`). Verifica la existencia del nodo de entrada (`entryNodeId`), transiciones o elecciones rotas (nodos destino inexistentes), nodos huérfanos inalcanzables, finales muertos (dead ends) no marcados como nodo final, y uso de variables o flags no declarados en las condiciones/efectos de los nodos.
2. **`SemanticValidator.ts`**: Valida **reglas semánticas de DSL de Encuentros** (`MiniGameEncounterDSL`). Verifica la validez del `gameId` registrado, IDs duplicados de encuentros o reglas de resultado, y la existencia de métricas, secretos, ítems de evidencia o nodos de destino referenciados en condiciones y efectos.
3. **`StoryPackageValidator.ts`**: Valida la **integridad a nivel de Paquete/Bundle de Historia** (`StoryPackage`). Comprueba metadatos del manifest, delega la validación topológica de cada grafo contenido a `StoryGraphValidator`, y realiza verificaciones semánticas cruzadas (referencias a personajes en líneas de diálogo y evidencia requerida/producida en reglas de deducción).

---

## Validación

Antes de realizar entregas o commits, asegúrate de correr los quality gates correspondientes:

```bash
pnpm run test
pnpm run lint
pnpm run typecheck:core
pnpm run typecheck:app
pnpm run check:core-boundaries
pnpm run check:ratchet
pnpm run ci
```
