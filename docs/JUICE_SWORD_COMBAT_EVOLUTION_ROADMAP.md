# Unified Combat Juice Evolution Roadmap (Peso e Impacto de Espada y Bola de Fuego)

**Ruta:** `docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md`
**Repositorio:** `xavirodriguez/ArcadeGames` (TinyAsterEngine: monorepo pnpm, TypeScript estricto, ECS determinista, renderers Canvas2D y Skia)
**Estado:** Roadmap de Implementación (Versión 1.0 — Verificado contra la base de código actual).

---

## 1. Objetivo y Filosofía del Modelo Unificado

El objetivo de este roadmap es proporcionar una sensación de combate ("game feel" o "punch") pesada, tangible y expresiva a los ataques de los juegos del motor TinyAsterEngine, unificando dos familias de ataque fundamentales bajo una misma canalización de ciclo de vida de fases (`CombatJuicePipeline`):

1. **Melee (Espada):** Golpe cuerpo a cuerpo con barrido en arco.
2. **Proyectil (Bola de fuego / Láser):** Se lanza, viaja y estalla al llegar.

En lugar de construir dos sistemas paralelos para espada y fuego, ambos derivan del mismo motor de estados por fases. Fusionamos los ingredientes de impacto con punch (flash blanco, sonido de impacto, partículas direccionales, knockback y screen shake + freeze) con los principios de animación de Disney (anticipación con lean back, squash and stretch en el eje de movimiento/impacto, follow-through con arrastre de estela e inercia, y arcos en trayectorias y números de daño flotantes).

---

## 2. Paso 0: Verificación de la Base de Código (Evidencia e Inventario)

Toda la arquitectura propuesta se valida contra el estado actual del repositorio `xavirodriguez/ArcadeGames`.

### 2.1 Estado de Verificación (Verificado vs No verificado)

- **Simulación y Timestep [VERIFICADO]:**
  - `BaseGame.ts` (`packages/core/src/runtime/BaseGame.ts`) ejecuta un bucle de tick determinista a 60Hz fijo (`dt = 1/60`s).
  - El almacenamiento ECS utiliza `SparseSetStorage.ts` y `MapStorage.ts` (`packages/core/src/ecs/storage/`). El estado del mundo y los hashes de snapshot son deterministas a nivel binario.
- **Hitboxes y Colisiones [VERIFICADO]:**
  - Las cajas de colisión leen de `BoxColliderComponent` (`packages/core/src/ecs/CoreComponents.ts`) y `SpatialCullingSystem` / `Broadphase`.
  - Las posiciones para detección de impactos leen directamente de `TransformComponent.x`, `y`, `rotation`.
  - Las hitboxes de colisión son completamente independientes del renderizado visual y de cualquier transformación cosmética (`VisualTransformComponent`).
- **Juegos con Ataques Reales [VERIFICADO]:**
  - `hitandrun` (`src/games/hitandrun/`): ¡Tiene ambas familias de ataque! Barrido melee de espada (`HitRunMeleeSystem.ts`, `ComboMeleeSystem.ts`) y proyectiles/fuego (`HitRunWeaponSystem.ts`, `HitRunBulletPool.ts`, `fireWeapon.ts`).
  - `platformer` (`src/games/platformer/`): Melee por pisotón/contacto (`PlatformerDamageSystem.ts`), pero carece de barrido de espada direccional.
  - `geometrywars` (`src/games/geometrywars/`): Armas de proyectiles rápidos con retroceso direccional, sin espada melee.
  - `space-invaders`, `asteroids`, `vertical-shmup`: Proyectiles y colisiones destructivas.
  - `tower-defense`: Proyectiles de torre con desaceleración/impacto.
- **Inventario Reutilizable [VERIFICADO]:**
  - `SharedVFX.ts` y `SharedVFXInternal.ts` (`src/games/shared/rendering/`): Generación de partículas, destellos y score/textos flotantes.
  - `VisualParticlePool.ts` (`src/games/shared/rendering/`): Pool de partículas con capacidad máxima acotada y cero asignaciones de memoria dinámicas en runtime.
  - `CircularPositionBuffer.ts` (`src/games/shared/rendering/`): Historial circular de posiciones para estelas de movimiento ("motion trails").
  - `HitStopSystem.ts` (`src/games/shared/rendering/`): Sistema global de pausa de frames por prioridad (`requestHitStop`).
  - `JuiceOrchestrator.ts` (`src/games/shared/rendering/`): Orquestación de screen shake, ruidos de cámara y efectos de borde.
  - `@tiny-aster/arcade-sound-kit` (`packages/arcade-sound-kit/`): Síntesis procedural de audio de 8 bits con validación estricta de recetas (`validateRecipe`, `RecipeValidationError`).
- **Dibujo de Personajes y Proyectiles [VERIFICADO]:**
  - Renderizado dual mediante `CanvasRenderer` (`packages/renderer-canvas/`) y `SkiaRenderer` (`packages/renderer-skia/`).
  - Se utilizan formas vectoriales (rectángulos, círculos, arcos) y sprites. Aplicar transformaciones visuales mediante `ctx.save() / ctx.scale() / ctx.rotate() / ctx.restore()` o `canvas.save() / canvas.scale() / canvas.rotate() / canvas.restore()` es computacionalmente muy barato (coste $O(1)$ de matriz 2D).
- **Multijugador y Reconciliación [VERIFICADO]:**
  - Red usando Colyseus (`packages/network-colyseus/`) con replicación de estados por snapshots y simulación determinista en cliente y servidor (`sendDeltaState`, `executeReplicationLoop`).
- **No Verificado [NO VERIFICADO]:**
  - Los valores exactos de duración en ms de la anticipación antes de sentir latencia molesta por parte de los jugadores en pantalla táctil móvil (requiere tuning en sesión con controles táctiles).

---

## 3. Modelo Unificado de Ciclo de Vida (Línea de Tiempo en 5 Fases)

Ambas familias de ataque comparten exactamente la misma secuencia de 5 fases. Cada efecto visual/kinético se cuelga explícitamente de una o más fases:

```
+---------------------------------------------------------------------------------------------------+
|                                 LÍNEA DE TIEMPO DEL CICLO DE VIDA DE ATAQUE                       |
+---------------------+--------------------+--------------------+-------------------+---------------+
| 1. ANTICIPACIÓN     | 2. EJECUCIÓN       | 3. CONTACTO        | 4. IMPACTO        | 5. FOLLOW-THRU|
| (Carga / Inclinación)| (Barrido / Viaje) | (Detección Golpe)  | (Aplastamiento)   | (Inercia / Asentamiento)|
+---------------------+--------------------+--------------------+-------------------+---------------+
| Héroe hacia atrás   | Estela en arco     | Evento de contacto | Flash blanco      | Cuerpo asienta|
| Fuego se comprime   | Proyectil estirado | Inicio hit stop    | Golpe knockback   | Estela disipa |
| Telegrafiado visual | Trayectoria arco   | Disparo de sonido  | Ráfaga partículas | Texto flotante|
|                     |                    |                    | Shake de pantalla | Arrastre humo |
+---------------------+--------------------+--------------------+-------------------+---------------+
```

### Tabla de Fusión de Efectos

| Fase | Melee (Espada) | Proyectil (Bola de Fuego) |
|---|---|---|
| **1. Anticipación** | El héroe se inclina hacia atrás (`scaleX = 0.85`, `rotation = -5°`), brillo de espada. | El héroe se inclina hacia atrás, la bola de energía se comprime (`scaleX = 0.7`, `scaleY = 1.3`) en la mano. |
| **2. Ejecución** | Barrido rápido en arco con cinta de estela mediante `CircularPositionBuffer`. | Bola viaja estirada a lo largo del vector de velocidad (`scaleX = 1.4`, `scaleY = 0.75`). |
| **3. Contacto** | La hitbox de la espada intersecta la caja de colisión del enemigo. Dispara sonido e inicio de hit stop. | El proyectil intersecta al enemigo u obstáculo. Dispara sonido e inicio de hit stop. |
| **4. Impacto** | El objetivo se pinta de blanco (3 ticks); ráfaga de partículas direccionales; impulso de knockback; shake de pantalla; enemigo se aplasta en el eje del golpe (`scaleX = 0.6`, `scaleY = 1.4`). | El objetivo y la bola se aplastan en el eje de impacto; la bola estalla en explosión; partículas direccionales con inercia; knockback; shake de pantalla. |
| **5. Follow-through** | El cuerpo del héroe vuelve a la posición neutral (`easeInOut`); la estela de la espada se disipa en 4 ticks. | La estela del proyectil se retrasa y disuelve; las partículas de humo conservan inercia; números de daño vuelan en arcos parabólicos. |

---

## 4. Matriz Juego × Tipo de Ataque × Efecto

Evaluación exhaustiva de los 15 juegos presentes en el repositorio `src/games/`.

| Juego | Familia Melee | Familia Proyectil | Efectos Aplicados | Efectos Excluidos y Justificación |
|---|---|---|---|---|
| `hitandrun` **(PILOTO)** | Barrido de Espada / Combo | Bola de fuego / Láser / Escopeta / Granada | **TODOS LOS EFECTOS:** Anticipación, Squash/Stretch, Flash, Sonido, Partículas, Knockback, Shake, Hit Stop, Arcos, Follow-through. | Ninguno. Juego piloto principal que reúne ambas mecánicas de combate. |
| `platformer` | Pisotón / Salto | Proyectiles Enemigos | Flash, Sonido, Partículas, Knockback, Shake, Hit Stop, Squash/Stretch al pisar. | Barrido de espada: El jugador combate mediante saltos/embestidas en vez de espada. |
| `geometrywars` | Ninguno | Plasma Rápido / Mísiles Teledirigidos | Flash, Sonido, Partículas Direccionales, Knockback de Retroceso, Shake, Estelas. | Anticipación Melee: Shooter twin-stick hiperrápido requiere respuesta instantánea (0 ticks de carga). |
| `space-invaders` | Ninguno | Cañón / Plasma Alienígena | Flash, Sonido, Partículas de Explosión, Hit Stop en Escudos/UFO, Shake de pantalla. | Knockback: Los marcianos se mueven en un paso de matriz fijo; el knockback rompería la alineación de la cuadrícula. |
| `asteroids` | Ninguno | Disparo Láser / Ruptura de Asteroide | Retroceso de nave, Partículas Explosivas, Shake, Flash, Sonido, Hit Stop en asteroides grandes. | Barrido de espada: No hay combate cuerpo a cuerpo. |
| `vertical-shmup` | Embestida con Escudo | Balas de Plasma / Bombas | Flash, Sonido, Spray de Partículas, Shake, Hit Stop en Jefes. | Knockback de posición: El esquive en bullet hell exige control posicional milimétrico sin empujones. |
| `tower-defense` | Ninguno | Flechas / Cañones / Magia / Fuego | Sonido, Partículas de Impacto, Arcos de Daño Flotante, Flash de Enemigo, Squash de Objetivo. | Anticipación de Jugador: Las torres disparan automáticamente según su cadencia. |
| `arkanoid` | Impacto con Pala | Láser / Balas de Doh | Squash/Stretch en la pala al rebotar, Flash, Sonido, Chispas, Estela de bola, Shake al romper ladrillos. | Knockback de entidades: Los ladrillos son estáticos; la bola sigue reflejos puramente geométricos. |
| `pong` | Impacto de Pala | Bola | Stretch de la pala al golpear, Flash, Sonido, Chispas, Shake en gol. | Anticipación de Espada/Fuego: Física clásica de pong. |
| `echorunner` | Barrida / Slide | Onda de Eco | Flash, Sonido, Polvo de Partículas, Camera Shake, Hit Stop. | Knockback: La velocidad del runner está fija al desplazamiento de los carriles. |
| `flappybird` | Colisión con Tubería (Muerte) | Ninguno | Flash, Sonido, Ráfaga de Plumas, Shake, Hit Stop al chocar. | Canalizaciones de ataque (juego de esquive puro). |
| `frogger` | Aplastamiento / Hundimiento | Ninguno | Flash, Sonido, Salpicadura de Agua, Hit Stop. | Mecánicas de ataque (juego de cruzar la calle). |
| `outrun` | Colisión entre Vehículos | Ninguno | Shake de Pantalla, Sonido, Humo/Debris, Penalización de velocidad. | Ataques de combate. |
| `racing` | Choque entre Coches | Ninguno | Humo de Neumáticos, Sonido de Impacto, Camera Shake, Rebote elástico. | Ataques de combate. |
| `story` (compartido) | Delega en el minijuego activo | Delega en el minijuego activo | Hereda del adaptador de minijuego (`BaseArcadeAdapter`). | N/A |

---

## 5. Decisiones Arquitectónicas Fundamentales

### 5.1 Simulación frente a Presentación

Para garantizar el determinismo absoluto del ECS y la sincronización multijugador (Rollback / Snapshots en Colyseus):

- **Presentación Pura (Local / Cliente):**
  - Flash (tinte blanco), partículas visuales, reproducción de audio, camera shake, escalas visuales de squash/stretch, arcos de texto flotante cosméticos y estelas de movimiento.
  - *Invariante:* Desactivar los efectos de presentación altera 0 bytes del estado de simulación o del hash de snapshot.
- **Lógica de Simulación (Núcleo Determinista):**
  - Impulso de knockback (modifica `VelocityComponent`), contador de ticks de hit stop (cuando congela la física) y duración de la anticipación (cuando retrasa la activación del collider de ataque).
  - *Invariante:* Se ejecuta de forma idéntica en el cliente y en el servidor.

### 5.2 Squash and Stretch sin Tocar la Hitbox

- **Componente:** `VisualTransformComponent` (`packages/gameplay-kit/src/combat/components/VisualTransformComponent.ts`).
  ```typescript
  export interface VisualTransformComponent {
    scaleX: number;
    scaleY: number;
    rotationOffset: number;
    skewX: number;
    skewY: number;
    offsetX: number;
    offsetY: number;
  }
  ```
- **Aislamiento de Hitbox:** `BoxColliderComponent` y `TransformComponent` mantienen las dimensiones del mundo sin deformar `(x, y, width, height)`. Los sistemas de colisión leen `TransformComponent` y `BoxColliderComponent` directamente. Los renderers de Canvas2D y Skia aplican la matriz de `VisualTransformComponent` exclusivamente durante la fase de renderizado.
- **Alineación de Eje:**
  - En proyectiles: Eje de deformación alineado con el vector de velocidad normalizado `(vx, vy)`.
  - En golpes melee: Eje de deformación alineado con la normal del impacto `(nx, ny)`.
- **Paridad Canvas2D / Skia:** Ambos renderers aplican `ctx.save() / ctx.translate(x + offsetX, y + offsetY) / ctx.rotate(rotation + rotationOffset) / ctx.scale(scaleX, scaleY)` y restituyen la matriz de transformación con `ctx.restore()` o `canvas.restore()`.

### 5.3 Anticipación y Latencia

- **Compromiso de Juego:** Un retraso de windup de 6 ticks (100ms) en un arcade puede sentirse lento si no está amortiguado.
- **Estrategia por Familia de Ataque:**
  - *Ataque Melee Rápido (Espada Táctica):* 2 ticks (33ms) de anticipación. No cancelable.
  - *Ataque Melee Pesado (Gran Mandoble):* 5 ticks (83ms) de anticipación. Cancelable por esquive/rodada del jugador hasta el tick 3.
  - *Proyectil (Bola de Fuego):* 4 ticks (66ms) de anticipación de canalización en las manos del héroe. El proyectil se engendra físicamente en el tick 5.
- **Valores Iniciales Sugeridos para Tuning (a 60Hz):**
  - Espada Melee: `anticipationTicks = 3`, `executionTicks = 4`, `contactTicks = 2`, `followThroughTicks = 6`.
  - Bola de Fuego: `anticipationTicks = 5`, `executionTicks = 30` (tiempo de vuelo máx), `contactTicks = 2`, `followThroughTicks = 8`.

### 5.4 Arcos (Gameplay vs. Cosméticos)

- **Trayectorias de Gameplay (Simulación):** Las bolas de fuego viajan en línea recta o en arcos parabólicos deterministas mediante pasos gravimétricos en el `MovementSystem` (`vy += gravity * dt`).
- **Arcos Cosméticos (Presentación):**
  - Partículas de Chispas / Fuego: Calculadas con curvas Bezier cuadráticas:
    $$P(t) = (1-t)^2 P_0 + 2(1-t)t P_c + t^2 P_1$$
    donde $P_c$ se desplaza en dirección perpendicular a la normal de impacto $N$.
  - Números de Daño Flotante: Nacen en la posición de impacto $P_0$, suben con una parábola de elevación de $24\text{px}$ y caen suavemente mediante un factor de gravedad cosmético durante $0.5\text{s}$.

### 5.5 Follow-Through e Inercia

- **Estelas de Movimiento:** Se utiliza `CircularPositionBuffer` (`capacidad = 16`). Cada tick guarda las posiciones históricas `(x, y)`, la velocidad y la rotación.
- **Efecto de Desfase / Arrastre:** El renderer dibuja la estela atenuando la opacidad $A(i) = (i / capacidad)^{1.5}$. Cuando el emisor se detiene, los puntos de la estela continúan moviéndose 3 ticks según su última velocidad almacenada antes de colapsar.
- **Inercia de Partículas:** Al explotar la bola de fuego o golpear la espada, las partículas heredan el 30% del vector de velocidad del atacante/proyectil $\vec{V}_{\text{padre}}$ sumado a su vector radial de explosión $\vec{V}_{\text{radial}}$.

### 5.6 Hit Stop Unificado por Prioridad

Utiliza `HitStopSystem.ts` con prioridades estrictas:
- `LIGHT_HIT` (Proyectil débil / espadazo rápido): 2 ticks (33ms), prioridad `LOW`.
- `MEDIUM_HIT` (Espadazo pesado / impacto directo bola de fuego): 4 ticks (66ms), prioridad `NORMAL`.
- `CRITICAL_HIT` (Golpe de gracia / impacto en jefe / daño recibido por el héroe): 8 ticks (133ms), prioridad `CRITICAL`.

**Mecanismo:** `HitStopSystem` decrementa `HitStopRemaining`. Mientras `HitStopRemaining > 0`, los sistemas de física de posición (`MovementSystem`, `PhysicsSystem`) pausan la integración del movimiento de las entidades involucradas, mientras que los renderers y las partículas continúan dibujando animaciones ambientales y efectos de pantalla. En multijugador online, la congelación se limita al atacante y al objetivo para evitar que otros jugadores sufran micro-tirones.

### 5.7 Eventos Decoplados de Ataque e Impacto

Los sistemas de combate no llaman directamente al código de jugosidad, sino que emiten eventos fuertemente tipados en `world.getEventBus()`:

```typescript
export interface CombatAttackPhaseEvent {
  entity: number;
  attackId: string;
  family: "melee" | "projectile";
  phase: "anticipation" | "execution" | "contact" | "impact" | "follow_through";
  position: { x: number; y: number };
  direction: { x: number; y: number };
}

export interface CombatImpactEvent {
  attackerEntity: number;
  targetEntity: number;
  attackFamily: "melee" | "projectile";
  profileId: string;
  position: { x: number; y: number };
  normal: { x: number; y: number }; // Vector normalizado (nx, ny)
  damage: number;
  isFatal: boolean;
}
```

### 5.8 Perfiles Data-Driven de Jugosidad

Los parámetros de sensación de cada ataque se definen mediante interfaces tipadas sin `any` ni `unknown`:

```typescript
export interface CombatJuiceProfile {
  id: string;
  family: "melee" | "projectile";
  phases: {
    anticipationTicks: number;
    executionTicks: number;
    contactTicks: number;
    followThroughTicks: number;
  };
  squashStretch: {
    anticipationScaleX: number;
    anticipationScaleY: number;
    impactTargetScaleX: number; // Ej. 0.6
    impactTargetScaleY: number; // Ej. 1.4
    recoveryDurationTicks: number;
  };
  flash: {
    durationTicks: number;
    colorHex: string;
  };
  particles: {
    count: number;
    speedMin: number;
    speedMax: number;
    spreadAngleRad: number;
    inheritVelocityFactor: number;
    tintTokens: string[];
  };
  knockback: {
    impulseMagnitude: number;
    decayFactor: number;
  };
  shake: {
    intensity: number;
    durationMs: number;
  };
  hitStop: {
    durationMs: number;
    priority: number;
  };
  soundRecipe: {
    recipeId: string;
    pitchVariation: number;
  };
}
```

Los perfiles se alojan en `packages/gameplay-kit/src/combat/profiles/` y se registran en los recursos del `World`.

### 5.9 Ubicación de cada Pieza y Límites de Paquetes

- `packages/gameplay-kit/src/combat/`:
  - `CombatJuicePipeline.ts`: Sistema central que procesa fases de ataque e impactos.
  - `components/VisualTransformComponent.ts`: Componente ECS para transformaciones visuales.
  - `systems/VisualSquashStretchSystem.ts`: Recuperación elástica suave hacia escala (1,1).
- `src/games/shared/rendering/`:
  - `SharedVFX.ts`: Generación reutilizable de explosiones, ráfagas direccionales y textos flotantes en arco.
  - `JuiceOrchestrator.ts`: Conector de eventos hacia shake de pantalla y audio.
- `@tiny-aster/arcade-sound-kit`:
  - Recetas de audio para espada (`sword_sweep`, `sword_clash`, `sword_flesh_hit`) y fuego (`fireball_cast`, `fireball_fly_loop`, `fireball_detonate`).

### 5.10 Partículas, Knockback, Límites de Sonido y Colisiones

- **Límite de Partículas:** `VisualParticlePool` mantiene una capacidad máxima fija de 256 partículas. Cada impacto genera un máximo de 24 partículas.
- **Límite de Voces de Audio:** Máximo 4 voces de impacto por frame con variación aleatoria de pitch de $\pm 8\%$ (`1 + (random - 0.5) * 0.16`).
- **Knockback e Interacción con Límites:** Los impulsos de knockback verifican colisiones estáticas en el escenario mediante `Broadphase` / `GridRaycast`. Si el knockback empuja al enemigo contra una pared, la velocidad se frena y se engendran chispas secundarias de choque contra el muro.

### 5.11 Interruptor Global y Modo de Reducción de Movimiento

Configurable desde el recurso `Theme` o `VFXWorldState`:
- **`juiceLevel === 0` (Desactivado):**
  - Desactiva squash/stretch, shake de cámara, flashes blancos, números de daño y partículas.
  - La duración de hit stop se reduce a 0.
  - **Invariante:** La física de la simulación (knockback y duración de ticks) se ejecuta de forma 100% idéntica.
- **`motionReduction === true` (Accesibilidad de Movimiento Reducido):**
  - La intensidad de shake de cámara se escala a 0.
  - El flash de pantalla completa se reemplaza por un borde fino sutil.
  - Las deformaciones de squash/stretch se limitan a un máximo de $\pm 10\%$.

---

## 6. Plan de Implementación por Fases (Dimensionado para Sesiones)

Cada fase está dimensionada para una sesión de trabajo enfocada con un commit independiente.

```
+-----------------------------------------------------------------------------------+
|                            HOJA DE RUTA DE EJECUCIÓN                              |
+-----------------------------------------------------------------------------------+
| FASE 1: Motor de Combat Juice & Transform Visual (packages/gameplay-kit)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 2: Recetas de Sonido, Utilidades VFX & Textos en Arco                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 3: Integración Piloto en Hit & Run (Espada Melee y Bola de Fuego)            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 4: Despliegue en Juegos Secundarios (Platformer, GeometryWars, TowerDefense) |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 5: Accesibilidad, Reducción de Movimiento & Guardarraíles de Determinismo    |
+-----------------------------------------------------------------------------------+
```

---

### Fase 1 — Motor Central de Combat Juice y Componente de Transformación Visual

**Objetivo de la Sesión:** Crear `VisualTransformComponent`, `VisualSquashStretchSystem` y el pipeline por fases `CombatJuicePipeline` en `packages/gameplay-kit`.

- **Archivos / Paquetes Involucrados:**
  - `packages/gameplay-kit/src/combat/components/VisualTransformComponent.ts` (NUEVO)
  - `packages/gameplay-kit/src/combat/systems/VisualSquashStretchSystem.ts` (NUEVO)
  - `packages/gameplay-kit/src/combat/types/CombatJuiceTypes.ts` (NUEVO)
  - `packages/gameplay-kit/src/combat/systems/CombatJuicePipeline.ts` (NUEVO)
  - `packages/renderer-canvas/src/CanvasRenderer.ts`
  - `packages/renderer-skia/src/SkiaRenderer.ts`
- **Pasos Atómicos:**
  1. Definir `VisualTransformComponent` con `scaleX`, `scaleY`, `rotationOffset`, `offsetX`, `offsetY`.
  2. Implementar `VisualSquashStretchSystem` aplicando amortiguación elástica ($k = 300, c = 20$) hacia escala (1,1) cada tick.
  3. Actualizar `CanvasRenderer` y `SkiaRenderer` para aplicar las transformaciones de `VisualTransformComponent` sin modificar `TransformComponent` ni `BoxColliderComponent`.
  4. Crear `CombatJuicePipeline` escuchando los eventos de fase e impacto.
- **Criterio de Aceptación Comprobable:**
  - Los tests unitarios verifican que aplicar escalas visuales de squash/stretch no cambia los límites de `BoxColliderComponent` ni el resultado de las colisiones.
  - Los renderers de Canvas2D y Skia aplican las deformaciones visuales de manera idéntica.
- **Riesgos y Mitigación:**
  - *Riesgo:* Fugas en la pila de matrices de renderizado. *Mitigación:* Envolver las transformaciones en bloques estrictos `ctx.save()` / `ctx.restore()` y Skia `canvas.save()` / `canvas.restore()`.

---

### Fase 2 — Recetas de Sonido, Utilidades VFX y Arcos de Daño

**Objetivo de la Sesión:** Añadir recetas para espada y bola de fuego en `@tiny-aster/arcade-sound-kit` y extender `SharedVFX` con ráfagas direccionales y textos flotantes en arco.

- **Archivos / Paquetes Involucrados:**
  - `packages/arcade-sound-kit/src/recipes/combatRecipes.ts` (NUEVO)
  - `src/games/shared/rendering/SharedVFX.ts`
  - `src/games/shared/rendering/VisualParticlePool.ts`
- **Pasos Atómicos:**
  1. Añadir 6 recetas procedurales de audio en `arcade-sound-kit`: `sword_sweep`, `sword_clash`, `sword_flesh_hit`, `fireball_cast`, `fireball_fly_loop`, `fireball_detonate`.
  2. Añadir la función `spawnDirectionalBurst()` a `SharedVFX.ts` aceptando origen $(x,y)$, vector normal $(nx,ny)$, ángulo de apertura y velocidad.
  3. Añadir la función `spawnParabolicDamageText()` a `SharedVFX.ts` animando números flotantes en arcos parabólicos Bezier.
  4. Integrar el límite de 4 voces de audio concurrentes por frame.
- **Criterio de Aceptación Comprobable:**
  - `pnpm --filter=@tiny-aster/arcade-sound-kit test` ejecuta y valida todas las recetas.
  - La generación masiva de partículas recicla elementos limpiamente al llegar al tope de 256 sin asignaciones dinámicas en heap.
- **Riesgos y Mitigación:**
  - *Riesgo:* Saturación de sonido por impactos simultáneos. *Mitigación:* Compresor suave en la síntesis de audio de `arcade-sound-kit`.

---

### Fase 3 — Integración Piloto en Hit & Run (Espada Melee y Bola de Fuego)

**Objetivo de la Sesión:** Integrar el pipeline unificado de combat juice en el juego piloto `hitandrun`, validando los golpes de espada y los proyectiles de fuego en un juego real.

- **Archivos Involucrados:**
  - `src/games/hitandrun/melee/HitRunMeleeSystem.ts`
  - `src/games/hitandrun/weapons/HitRunWeaponSystem.ts`
  - `src/games/hitandrun/systems/HitRunCombatSystem.ts`
  - `src/games/hitandrun/systems/registerHitRunFeedback.ts`
  - `src/games/hitandrun/HitAndRunGame.ts`
  - `src/games/hitandrun/__tests__/HitRunCombatJuice.test.ts` (NUEVO)
- **Pasos Atómicos:**
  1. Emitir `combat:attack_phase` en `HitRunMeleeSystem.ts` durante inclinación de carga, barrido en arco y recuperación.
  2. Emitir `combat:attack_phase` en `HitRunWeaponSystem.ts` al cargar, lanzar bola de fuego y en la detonación.
  3. Emitir `combat:impact` en `HitRunCombatSystem.ts` incluyendo la normal del golpe y el daño.
  4. Registrar `CombatJuicePipeline` en `registerHitRunFeedback.ts` con perfiles para `sword_slash` y `fireball_blast`.
  5. Ejecutar tests de integración y comprobar la sensación visual en Canvas2D y Skia.
- **Criterio de Aceptación Comprobable:**
  - El tajo de espada dispara inclinación del héroe, estela en arco, flash blanco en objetivo, sonido, ráfaga de chispas direccionales, aplastamiento enemigo y hit stop de 4 ticks.
  - La bola de fuego dispara compresión al cargar, vuelo estirado, explosión en la detonación, shake de pantalla e impulso de knockback.
  - Todos los tests unitarios existentes en `hitandrun` continúan pasando sin regresiones.
- **Riesgos y Mitigación:**
  - *Riesgo:* El hit stop interfiere con los temporizadores de cadencia de tiro. *Mitigación:* Los sistemas de recarga verifican si el mundo está en hit stop antes de restar tiempo de recarga.

---

### Fase 4 — Integración en Juegos Secundarios (Platformer, Geometry Wars, Tower Defense)

**Objetivo de la Sesión:** Desplegar la canalización de combat juice en `platformer`, `geometrywars` y `tower-defense`.

- **Archivos Involucrados:**
  - `src/games/platformer/systems/PlatformerDamageSystem.ts`
  - `src/games/geometrywars/systems/`
  - `src/games/tower-defense/systems/`
- **Pasos Atómicos:**
  1. Vincular `VisualTransformComponent` al jugador en `platformer` durante pisotones y daño.
  2. Emitir `combat:impact` con retroceso direccional en `geometrywars` para impactos de plasma y detonación de mísiles.
  3. Emitir `combat:impact` en `tower-defense` al impactar proyectiles de torre para activar flash en enemigo, sonido, aplastamiento y números de daño en arco.
- **Criterio de Aceptación Comprobable:**
  - La respuesta al impacto funciona de manera coherente en los 3 juegos respetando la matriz Juego × Efecto.
- **Riesgos y Mitigación:**
  - *Riesgo:* Caída de frames en oleadas densas de enemigos en Geometry Wars o Tower Defense. *Mitigación:* Aplicar tope de 8 partículas por impacto en hordas.

---

### Fase 5 — Accesibilidad, Reducción de Movimiento y Tests de Guardarraíl

**Objetivo de la Sesión:** Implementar controles de accesibilidad de movimiento e implementar la suite de tests automatizados de determinismo y seguridad.

- **Archivos Involucrados:**
  - `src/games/shared/rendering/JuiceOrchestrator.ts`
  - `packages/core/src/theme/Theme.ts`
  - `packages/core/tests/CombatDeterminismParity.test.ts` (NUEVO)
  - `packages/core/tests/HitboxIsolation.test.ts` (NUEVO)
- **Pasos Atómicos:**
  1. Implementar los modificadores `juiceLevel` y `motionReduction` en `JuiceOrchestrator`.
  2. Escribir test de determinismo: ejecutar 100 ticks de combate con `juiceLevel = 1.0` y con `juiceLevel = 0.0`; comprobar que el hash de snapshot del `World` resultante es 100% idéntico.
  3. Escribir test de aislamiento de hitbox: aplicar deformación extrema $(2.0, 0.5)$ en `VisualTransformComponent`; verificar que las cajas AABB de `BoxColliderComponent` no sufren alteración.
  4. Escribir test de límite de memoria en pool de partículas: simular 1000 impactos seguidos; comprobar que la memoria asignada no supera las 256 partículas preasignadas.
- **Criterio de Aceptación Comprobable:**
  - Los 3 tests automatizados de guardarraíl se ejecutan y pasan correctamente.
  - `pnpm run ci` pasa sin errores de tipado o ratchet.

---

## 7. Pruebas Mínimas de Guardarraíl (Automated Test Guardrails)

1. **Test de Paridad y Determinismo (`CombatDeterminismParity.test.ts`):**
   - *Requisito:* El hash de snapshot del estado del mundo tras $N$ ticks de simulación de combate debe ser exactamente idéntico independientemente de si los efectos visuales están activados (`juiceLevel = 1.0`) o desactivados (`juiceLevel = 0.0`).
2. **Test de Aislamiento de Hitbox (`HitboxIsolation.test.ts`):**
   - *Requisito:* Modificar `VisualTransformComponent` (scaleX, scaleY, skew, rotationOffset) no debe alterar las consultas de culling espacial, las cajas AABB ni las intersecciones de `BoxColliderComponent`.
3. **Test de Límite en Pool de Partículas (`ParticlePoolBoundedness.test.ts`):**
   - *Requisito:* Engendrar impactos continuos durante 10,000 frames debe mantener un uso de memoria constante sin asignaciones en el heap de JavaScript tras la fase inicial de calentamiento.

---

## 8. Preguntas Abiertas que Requieren Decisión

1. **Comportamiento del Hit Stop en Multijugador Online (Colyseus):**
   - *Pregunta:* ¿El hit stop debe pausar la simulación de física de forma global para TODAS las entidades (estilo arcade clásico en pantalla compartida), o solo debe pausar la física del atacante y del objetivo impactado (preservando el movimiento fluido de otros jugadores remotos)?
   - *Recomendación:* Congelación global para juegos single-player y co-op local; congelación aislada por entidad en multijugador online para evitar micro-tirones en clientes remotos.
2. **Ventana de Cancelación en Ataque Melee (Espada):**
   - *Pregunta:* ¿Los ataques de espada pesados deben ser cancelables con esquive/rodada durante la fase inicial de anticipación (ticks 1-3), o el ataque debe comprometer toda la animación una vez pulsado el botón?
   - *Recomendación:* Permitir cancelación por rodada durante la anticipación para favorecer la habilidad técnica del jugador en `hitandrun`.
3. **Estilo Visual de los Números de Daño Flotantes:**
   - *Pregunta:* ¿Los números de daño deben utilizar glifos de fuente bitmap retro de 8 bits o deben renderizarse mediante trazados de vectores procedimentales según los tokens del tema activo?
   - *Recomendación:* Utilizar trazados de vectores procedimentales derivados de los tokens del tema activo para preservar la paridad y desacoplamiento de temas.

---

## 9. Definición de Hecho (Definition of Done)

- Pipeline unificado de combat juice (`CombatJuicePipeline`) implementado en `packages/gameplay-kit`.
- Renderers Canvas2D y Skia soportan `VisualTransformComponent` para squash & stretch sin afectar a los colliders de física.
- El juego piloto `hitandrun` presenta golpes con peso e impacto completo tanto para espadas como para bolas de fuego.
- Todas las pruebas de guardarraíl (Determinismo, Aislamiento de Hitbox, Pool de Partículas) pasan con 100% de cobertura.
- Verificación completa del repositorio (`pnpm run ci` o typecheck) finaliza sin errores.
