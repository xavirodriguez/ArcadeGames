# Análisis de mejoras — Arkanoid

**Fecha**: 2026-09-11
**Versión del análisis**: 1
**Juego**: `arkanoid`

---

## 1. Diagnóstico actual del estado del juego

Un examen detallado de los archivos fuente en `src/games/arkanoid/` confirma que el módulo posee una arquitectura ECS bien estructurada sobre `BaseGame`, pero su configuración y lógica de gameplay actuales corresponden a un **prototipo simplificado** y no a una fidelidad completa del juego de arcade original de Taito (1986).

### 1.1 Archivos examinados y su rol en la arquitectura

| Archivo | Ubicación | Estado actual y diagnóstico técnico |
| --- | --- | --- |
| `ArkanoidGame.ts` | `src/games/arkanoid/` | Extiende `BaseGame`. Registra blueprints básicos (`ball`, `paddle`, `brick`, `state`), entradas y sistemas. Carga `arkanoid.json` y llama a `spawnLevelBricks(world, 1)`. |
| `ArkanoidConfigSchema.ts` | `src/games/arkanoid/types/` | Define el esquema Zod `ArkanoidConfigSchema` (pantalla 800x600, velocidad de bola, vidas iniciales). No contiene esquemas para los 33 niveles ni para enemigos ni para Doh. |
| `ArkanoidTypes.ts` | `src/games/arkanoid/types/` | Declara componentes `Paddle`, `Ball`, `Brick`, `ArkanoidState` y tipos de ladrillo abstractos (`standard`, `explosive`, `regenerable`, `gravitational`). Faltan tipos para bloques Plata/Oro, Power-Ups originales (E, L, C, S, M, B, P), Enemigos y Doh. |
| `EntityFactory.ts` | `src/games/arkanoid/` | `ArkanoidEntityFactory` contiene fábricas estáticas delegadas en `spawnBlueprintEntity` (`createPaddle`, `createBall`, `createBrick`, `createGameState`). Sin soporte para cápsulas, proyectiles ni enemigos. |
| `ArkanoidGameStateSystem.ts` | `src/games/arkanoid/systems/` | Maneja la victoria de nivel cuando `bricksRemaining <= 0` e incrementa `level`. La función `spawnLevelBricks` lee una matriz simple de 5x10 desde `arkanoid.json` o genera un patrón algorítmico genérico de 8 filas. |
| `ArkanoidCollisionSystem.ts` | `src/games/arkanoid/systems/` | Procesa rebotes AABB de la bola contra bordes, pala y bloques. Suma puntuación básica, dispara combos y eventos `combat:hit` / `combat:death`. |
| `BrickRulesSystem.ts` | `src/games/arkanoid/systems/` | Maneja la regeneración del tipo `regenerable` y la atracción del tipo `gravitational`. |
| `ArkanoidInputSystem.ts` | `src/games/arkanoid/systems/` | Mueve la pala Vaus con aceleración/desaceleración suave y lanza la bola adherida con `p1Launch`. |
| `ArkanoidSpinSystem.ts` | `src/games/arkanoid/systems/` | Aplica una leve alteración de spin a la velocidad horizontal de la bola según la velocidad de la pala. |
| `ArkanoidCanvasVisuals.ts` & `ArkanoidSkiaVisuals.ts` | `src/games/arkanoid/rendering/` | Dibujan formas geométricas simples para la bola, la pala Vaus, los bloques neón y el grid de fondo `arkanoid_bg`. Faltan los drawers para las cápsulas de poder, enemigos de las trampillas, proyectiles láser y la escultura alienígena de Doh. |
| `ArkanoidEncounter.ts` | `src/games/arkanoid/story/` | Define un encuentro de minijuego para el modo campaña/historia con objetivos de destrucción de bloques. |

### 1.2 Qué funciona bien
- **Integración sólida con el motor ECS**: Bucle principal determinista, gestión de ciclos de vida de entidades y sincronización con `World` y `EventBus`.
- **Sistemas compartidos conectados**: `ComboSystem`, `AchievementSystem`, `PowerUpSystem` (genérico), `JuiceSystem`, `ScreenShakeSystem` y `ParticleSystem` ya se encuentran registrados y operativos.
- **Paridad dual Canvas2D / Skia**: Registro coordinado mediante `RendererUtils.registerAssets` para soporte web y móvil nativo.
- **Manejo de entradas unificadas**: `ArkanoidInputSystem` gestiona `p1Left`, `p1Right` y `p1Launch` con suavizado físico.

### 1.3 Principales carencias frente al Arcade de 1986
1. **Falta del catálogo declarativo de 33 niveles**: Actualmente existe una sola matriz de 5x10 en `arkanoid.json` que se repite en cada nivel.
2. **Modelo de bloques incompleto**: No existen los colores auténticos por puntuación (blanco, naranja, cyan, verde, rojo, azul, rosa, amarillo) ni la distinción del bloque Plata (resistencia variable de HP según el nivel) y el bloque Oro (indestructible).
3. **Ausencia de las cápsulas de Power-Up originales (E, L, C, S, M, B, P)**: El `PowerUpSystem` actual es el genérico de gameplay-kit, sin la caída vertical de cápsulas rotativas con letras neón ni sus 7 efectos exclusivos sobre Vaus.
4. **Falta de enemigos voladores y trampillas (Hatches)**: No hay spawns de enemigos orgánicos superiores descendiendo en trayectorias curvas/senoidales ni colisiones destructivas con la pala y la bola (100 pts).
5. **Falta del jefe final Doh (Fase 33)**: No está implementada la confrontación contra el Moái gigante, sus proyectiles dirigidos ni el contador de 16 impactos requeridos para la victoria total.
6. **Diseño de Arte y Audio del Arcade**: Los renderers actuales dibujan rectángulos genéricos neón en lugar de los marcos metálicos laterales, las trampillas superiores y el diseño característico de la nave Vaus y las cápsulas.

---

## 2. Matriz de implementación y Hoja de Ruta Priorizada

| Área | Prioridad | Estado Actual | Ubicación Objetivo de Implementación |
| --- | --- | --- | --- |
| **Sistema de Niveles (1–33)** | **P0** | Grid único 5x10 en `arkanoid.json` | `src/games/arkanoid/config/levels/level-XX.json`, `domain/LevelCatalog.ts`, `systems/ArkanoidLevelSystem.ts` |
| **Bloques y Resistencias (Plata/Oro/Estándar)** | **P0** | Componente `Brick` con `hp` binario (1 o 2) y 100 pts fijos | `types/ArkanoidTypes.ts`, `EntityFactory.ts`, `systems/BrickRulesSystem.ts` |
| **Física de Bola y Pala Vaus** | **P0** | Rebotes básicos AABB con factor de spin simple | `systems/ArkanoidCollisionSystem.ts`, `systems/ArkanoidSpinSystem.ts` |
| **Cápsulas de Power-Up (E, L, C, S, M, B, P)** | **P0** | `PowerUpSystem` genérico sin cápsulas del arcade | `types/ArkanoidPowerUpTypes.ts`, `systems/ArkanoidPowerUpSpawnSystem.ts`, `systems/ArkanoidActivePowerUpSystem.ts`, `systems/ArkanoidLaserSystem.ts` |
| **Enemigos y Trampillas (Hatches)** | **P1** | Inexistentes | `enemies/ArkanoidEnemyFactory.ts`, `systems/EnemySpawnSystem.ts`, `systems/EnemyMovementSystem.ts`, `systems/EnemyRulesSystem.ts` |
| **Jefe Final Doh (Fase 33)** | **P1** | Inexistente | `boss/DohFactory.ts`, `boss/DohComponent.ts`, `systems/DohAttackSystem.ts`, `systems/DohRulesSystem.ts` |
| **Arte y Renderers (Canvas & Skia)** | **P1** | Formas rectangulares neón simplificadas | `rendering/ArkanoidCanvasVisuals.ts`, `rendering/ArkanoidSkiaVisuals.ts` |
| **Audio & Juice Feedback** | **P1** | Efectos de sonido genéricos de hit/explosion | `ArkanoidGame.ts` (`onPreloadAssets`), `systems/ArkanoidCollisionSystem.ts` |
| **Tests de Gameplay Deterministas** | **P0** | Cobertura básica de inicio/reinicio | `src/games/arkanoid/__tests__/ArkanoidGameplay.test.ts` |

---

## 3. Análisis detallado por subsistema con ubicaciones exactas en el código

### 3.1 Catálogo y Sistema de Niveles 1–33

#### Estructura propuesta de archivos
```
src/games/arkanoid/
├── config/
│   ├── arkanoid.json
│   └── levels/
│       ├── level-01.json
│       ├── level-02.json
│       └── ...
│       └── level-33.json
├── domain/
│   ├── ArkanoidLevel.ts
│   ├── BrickDefinition.ts
│   └── LevelCatalog.ts
```

#### Modelo de Datos Declarativo
En `src/games/arkanoid/domain/BrickDefinition.ts`:
```typescript
export type BrickType = "standard" | "silver" | "gold";

export type BrickColor =
  | "white"
  | "orange"
  | "cyan"
  | "green"
  | "red"
  | "blue"
  | "pink"
  | "yellow";

export type BrickCell =
  | { readonly kind: "empty" }
  | { readonly kind: "standard"; readonly color: BrickColor }
  | { readonly kind: "silver"; readonly hits: number }
  | { readonly kind: "gold" };

export interface ArkanoidLevelDefinition {
  readonly level: number;
  readonly rows: number;
  readonly columns: number;
  readonly cells: readonly BrickCell[][];
}
```

#### Cambios en `ArkanoidGameStateSystem.ts`
Reemplazar la función algorítmica `spawnLevelBricks` por `LevelCatalog.loadLevel(level)`, la cual instancia las entidades de bloques desde los JSON declarativos. Al avanzar de nivel, el sistema verifica si `level === 33` para invocar la aparición del jefe Doh.

---

### 3.2 Sistema de Bloques, HP, Colores y Puntuación

#### Puntuación Oficial del Arcade
- **Blanco**: 50 pts (1 HP)
- **Naranja**: 60 pts (1 HP)
- **Cyan**: 70 pts (1 HP)
- **Verde**: 80 pts (1 HP)
- **Rojo**: 90 pts (1 HP)
- **Azul**: 100 pts (1 HP)
- **Rosa**: 110 pts (1 HP)
- **Amarillo**: 120 pts (1 HP)
- **Plata**: 50 pts × número de nivel (Resistencia de HP = `2 + Math.floor(level / 8)`)
- **Oro**: Indestructible (0 pts, bloquea la bola y proyectiles láser)

#### Cambios en `ArkanoidTypes.ts` y `EntityFactory.ts`
```typescript
export interface BrickComponent {
  type: "Brick";
  brickType: "standard" | "silver" | "gold";
  color?: BrickColor;
  points: number;
  hp: number;
  maxHp: number;
}
```

#### Lógica de Colisiones en `ArkanoidCollisionSystem.ts`
- **Bloque Estándar**: Al recibir 1 impacto, se destruye inmediatamente, emite sonido, otorga sus puntos según color y reduce `bricksRemaining`.
- **Bloque Plata**: Reduce en 1 su `hp`. Si `hp > 0`, cambia el brillo/tono del tile y emite SFX metálico; si `hp === 0`, se destruye, otorga los puntos calculados y reduce `bricksRemaining`.
- **Bloque Oro**: No reduce `hp`, rebota la bola, no emite puntos ni se considera en el conteo de `bricksRemaining`. Impermeable al láser.

---

### 3.3 Física de la Bola y Pala Vaus

#### Ámbitos de Mejora en `ArkanoidCollisionSystem.ts` y `ArkanoidSpinSystem.ts`
- **Segmentación de rebotes en Vaus**: Dividir la superficie de la pala Vaus en 5 zonas de rebote (extremo izquierdo, medio izquierdo, centro, medio derecho, extremo derecho) con ángulos de salida predefinidos (de 135° a 45°).
- **Inercia y Spin**: Sumar la fracción de `velocity.vx` de la pala al vector horizontal de la bola al momento del contacto.
- **Límite de velocidad y prevención de tunelización**: Utilizar sub-stepping o clamping de velocidad máxima en `BALL_SPEED_MAX` para evitar que la bola atraviese rectángulos en ticks de bajo framerate.

---

### 3.4 Sistema de Cápsulas de Power-Up (E, L, C, S, M, B, P)

#### Las 7 Cápsulas de Arcade
1. **E (Expand)**: Incrementa el ancho de Vaus de 100px a 150px.
2. **L (Laser)**: Monta dos cañones laterales en Vaus. Al presionar `p1Launch`, spawnea proyectiles neón verticales.
3. **C (Catch)**: La bola se adhiere a la pala al tocarla, permitiendo al jugador apuntar y re-lanzarla con `p1Launch`.
4. **S (Slow)**: Reduce la velocidad de todas las bolas activas a la velocidad inicial `BALL_SPEED_START`.
5. **M (Multiball)**: Duplica las bolas en juego generando 2 bolas adicionales con ángulos divergentes.
6. **B (Break)**: Abre una puerta de escape en el lateral derecho de la pantalla, permitiendo avanzar de nivel inmediatamente.
7. **P (Extra Life)**: Otorga +1 vida adicional.

#### Arquitectura de Sistemas para Power-Ups
```
src/games/arkanoid/
├── powerups/
│   ├── PowerUpComponent.ts
│   ├── PowerUpFactory.ts
│   └── ActivePowerUpState.ts
└── systems/
    ├── ArkanoidPowerUpSpawnSystem.ts
    ├── ArkanoidActivePowerUpSystem.ts
    └── ArkanoidLaserSystem.ts
```

#### Regla de Exclusividad Mutua
Capturar una nueva cápsula sustituye el efecto activo anterior (p. ej., capturar **L** cuando **E** está activo restaura el tamaño normal de Vaus y equipa los cañones láser).

---

### 3.5 Enemigos Orgánicos y Trampillas Superiores (Hatches)

#### Arquitectura
```
src/games/arkanoid/
├── enemies/
│   ├── ArkanoidEnemyFactory.ts
│   ├── ArkanoidEnemyTypes.ts
│   └── ArkanoidEnemyAI.ts
└── systems/
    ├── EnemySpawnSystem.ts
    ├── EnemyMovementSystem.ts
    └── EnemyRulesSystem.ts
```

#### Comportamiento de Enemigos
- **Trampillas (Hatches)**: Dos puntos de origen situados en las esquinas superiores del marco. Se abren de forma cíclica mediante una máquina de estados (`Dormant` -> `Opening` -> `Spawning` -> `Closed`).
- **Límite dinámico**: Máximo 3 enemigos simultáneos en pantalla para no saturar la simulación.
- **Patrones de Movimiento**:
  - `CurveMovementStrategy`: Trayectoria parabólica descendente.
  - `SineMovementStrategy`: Oscilación horizontal con descenso progresivo.
  - `SpiralMovementStrategy`: Rizo helicoidal.
- **Interacciones**:
  - Impacto de la bola: Destruye el enemigo, desvía la bola y otorga 100 pts.
  - Disparo Láser: Destruye el enemigo y otorga 100 pts.
  - Colisión con Vaus: Destruye el enemigo sin restar vidas a Vaus.

---

### 3.6 Enfrentamiento Final contra Doh (Fase 33)

#### Componentes y Fábrica
En `src/games/arkanoid/boss/DohComponent.ts`:
```typescript
export interface DohComponent {
  type: "Doh";
  maxHits: 16;
  hits: number;
  attackCooldown: number;
  attackTimer: number;
  phase: "intro" | "idle" | "attacking" | "hit" | "defeated";
}

export interface DohProjectileComponent {
  type: "DohProjectile";
  speed: number;
}
```

#### Lógica de Combate en `DohRulesSystem.ts` y `DohAttackSystem.ts`
- Al iniciar la Fase 33, se remueven todos los bloques y aparece la figura de Doh en la parte superior central.
- Doh ejecuta ataques periódicos disparando proyectiles dirigidos hacia la posición actual de Vaus.
- Si un proyectil de Doh impacta a Vaus, destruye la pala y resta 1 vida.
- Cada rebote válido de la bola contra la boca/rostro de Doh incrementa `hits`. Al alcanzar **16 impactos**, Doh ejecuta su secuencia de destrucción, se emiten partículas masivas y se dispara el evento de **Victoria Total**.

---

### 3.7 Arte y Renderers Duales (Canvas2D & Skia)

#### Archivos de Renderizado
- `src/games/arkanoid/rendering/ArkanoidCanvasVisuals.ts`
- `src/games/arkanoid/rendering/ArkanoidSkiaVisuals.ts`

#### Drawers requeridos para paridad total
1. `drawArkanoidPaddle`: Renderizado detallado de Vaus (base metálica, extremos rojos/rojos extendidos, cañones láser opcionales, indicador visual Catch).
2. `drawArkanoidBall`: Esfera brillante con halo de neón.
3. `drawArkanoidBrick`: Visualización de biseles metálicos, patrones de color por puntuación, textura plateada reflectante para bloques Plata y brillo dorado permanente para bloques Oro.
4. `drawArkanoidPowerUp`: Cápsula cilíndrica en rotación vertical con letra neón identificativa (E, L, C, S, M, B, P).
5. `drawArkanoidEnemy`: Formas geométricas 3D retro (esferas segmentadas, pirámides y conos rotativos).
6. `drawArkanoidHatch`: Trampillas metálicas superiores con luces de advertencia parpadeantes.
7. `drawArkanoidBoss`: Escultura Moái alienígena neón con animación de parpadeo al sufrir impactos y apertura de boca al disparar proyectiles.
8. `drawArkanoidBackground`: Marco arcade con paredes laterales texturizadas, encabezado de nivel/puntuación y fondo de rejilla tecnológica.

---

### 3.8 Audio, Feedback & Juice

#### Efectos de Sonido SFX requeridos en `onPreloadAssets`
- `hit_brick_std`: Impacto en bloque estándar.
- `hit_brick_silver`: Impacto en bloque plata.
- `hit_brick_gold`: Impacto metálico sordo en bloque oro.
- `hit_paddle`: Rebote en Vaus.
- `powerup_spawn`: Caída de cápsula.
- `powerup_catch`: Captura de poder.
- `laser_fire`: Disparo de cañones láser.
- `enemy_spawn`: Apertura de trampilla.
- `enemy_destroy`: Destrucción de enemigo.
- `doh_hit`: Impacto en Doh.
- `doh_destroy`: Explosión final de Doh.

#### Micro-Feedback Visual (Juice)
- **Hit-stop (GameplayFreeze)**: Pausa de 20-30ms en la simulación tras destruir bloques o impactar a Doh.
- **Squash & Stretch**: Deformación de Vaus al rebotar la bola y compresión de la bola al golpear bloques.
- **Screen Shake**: Temblor sutil de pantalla con intensidad escalar según combos y detonaciones.

---

## 4. Plan de Acción por Fases y Orden Técnico de Implementación

### Fase 1 — Core Jugable Arcade (P0)
- Definir el esquema Zod y catálogo declarativo de los 33 niveles en `config/levels/`.
- Actualizar `BrickComponent` con soporte para colores de puntuación, bloques Plata (HP por nivel) y bloques Oro (indestructibles).
- Refactorizar `ArkanoidCollisionSystem.ts` para gestionar rebotes por zonas en Vaus y comportamiento exacto de bloques.
- **Definition of Done**: Es posible jugar los 32 niveles secuenciales con rebotes precisos, puntuación oficial por color y destrucción correcta de bloques.

### Fase 2 — Sistema de Power-Ups (P0)
- Crear el componente y la fábrica de cápsulas rotativas.
- Implementar la caída vertical y la captura por Vaus con regla de exclusividad mutua.
- Desarrollar las mecánicas de los 7 poderes: Expand, Laser (con proyectiles y disparo), Catch (adherencia y re-lanzamiento), Slow, Multiball, Break y Extra Life.
- **Definition of Done**: Las 7 cápsulas caen deterministamente tras destruir bloques elegibles, son capturables y sus efectos alteran el estado de la partida de forma comprobable en tests headless.

### Fase 3 — Enemigos Orgánicos y Trampillas (P1)
- Implementar las trampillas en las esquinas superiores del marco.
- Crear el sistema de spawn determinista con límite de 3 entidades y máquina de estados para las trampillas.
- Desarrollar las 3 estrategias de movimiento (curva, seno, espiral) y resolver colisiones con bola, láser y Vaus (100 pts).
- **Definition of Done**: Los enemigos aparecen desde las trampillas, siguen trayectorias fluidas y reaccionan correctamente al combate sin generar fuga de entidades.

### Fase 4 — Arte Arcade, Visuals Duales y Audio (P1)
- Implementar el diseño visual completo de Vaus, la bola, los bloques biselados, las cápsulas neón y el marco arcade en `ArkanoidCanvasVisuals.ts` y `ArkanoidSkiaVisuals.ts`.
- Precargar los SFX arcade en `ArkanoidGame.ts` e integrarlos en las emisiones de `PlaySFX`.
- **Definition of Done**: Paridad visual y auditiva completa entre renderers Canvas2D y Skia con estética arcade neón auténtica.

### Fase 5 — Enfrentamiento Final contra Doh (P1)
- Crear la Fase 33 y la entidad de Doh.
- Implementar la IA de ataques con proyectiles dirigidos y la detección de 16 impactos en la boca del jefe.
- Conectar la animación de daño, destrucción masiva y secuencia de Victoria Final.
- **Definition of Done**: Al completar la fase 32, se carga la fase de jefe; vencer a Doh tras 16 impactos concede la victoria definitiva de la partida.

---

## 5. Suite de Pruebas y Estrategia de Validación Determinista

Se debe mantener una suite de pruebas headless en `src/games/arkanoid/__tests__/` que valide sin interfaz gráfica:

```
src/games/arkanoid/__tests__/
├── ArkanoidLevels.test.ts       # Carga correcta de los 33 niveles y conteo de bloques
├── ArkanoidBricks.test.ts       # Destrucción por HP (estándar 1-hit, plata multi-hit, oro 0-hit)
├── ArkanoidPowerUps.test.ts     # Captura y aplicación exclusiva de los 7 poderes
├── ArkanoidEnemies.test.ts      # Spawns desde trampillas y colisiones
└── ArkanoidBossDoh.test.ts      # Combate de Doh, recuento de 16 impactos y victoria
```

### Casos de Prueba Críticos
1. **Bloque Plata**: Verificar que reduce HP por cada impacto y sólo suma puntos y se destruye al llegar a 0 HP.
2. **Bloque Oro**: Confirmar que los impactos de la bola y los proyectiles láser rebotan sin alterar el HP ni sumar puntos.
3. **Power-Up Laser**: Confirmar que presionar `p1Launch` genera dos proyectiles verticales que destruyen bloques estándar pero se disipan contra bloques oro.
4. **Power-Up Catch**: Confirmar que la bola se adhiere a la pala al colisionar y permanece inmóvil horizontalmente junto con Vaus hasta presionar `p1Launch`.
5. **Combate contra Doh**: Simular 16 impactos de la bola sobre Doh y verificar que `ArkanoidState.isVictory` se establece en `true`.

---

## 6. Notas Técnicas, Consideraciones de Rendimiento y Límites de Arquitectura

1. **Optimización Hot Path Zero-Allocation**:
   - Prohibido instanciar objetos (`{}`), arreglos (`[]`), ni invocar funciones de orden superior (`.map()`, `.filter()`) dentro del método `update()` de `ArkanoidCollisionSystem`, `EnemyMovementSystem` o `ArkanoidPowerUpSpawnSystem`.
   - Utilizar pools pre-asignados para proyectiles láser, cápsulas y partículas.
2. **Determinismo y Netcode**:
   - Toda generación aleatoria de Power-Ups, selección de trampilla de spawn y patrón de movimiento de enemigos **debe usar exclusivamente** `world.gameplayRandom`. Prohibido el uso de `Math.random()`.
3. **Límites del Core y Separación de Módulos**:
   - Ninguna clase en `src/games/arkanoid/` puede importar paquetes de plataforma (`react-native`, `@shopify/react-native-skia`) ni exportaciones internas sin abstracción. Los renderers se registran vía `RendererUtils.registerAssets`.
   - Cumplir estrictamente con los checks de CI (`pnpm run ci`).
