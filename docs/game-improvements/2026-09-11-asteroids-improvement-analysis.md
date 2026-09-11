# Análisis de mejoras — Asteroids

**Fecha**: 2026-09-11
**Versión del análisis**: 1
**Juego**: `asteroids`

---

## 1. Diagnóstico actual

### Qué funciona bien
- **Base física y movimiento vectorial sólido**: La inercia de la nave, rotación suave y fricción espacial están bien sintonizadas usando `computeShipPhysics` y el motor ECS determinista.
- **Sistemas compartidos bien integrados**: `ComboSystem`, `LootSystem`, `PowerUpSystem`, `DifficultyDirectorSystem` y `AchievementSystem` están conectados vía `EventBus` y componentes genéricos de `packages/gameplay-kit`.
- **Soporte multicanal y dual-rendering**: Paridad visual entre Canvas2D (`AsteroidsCanvasVisuals.ts`) y Skia (`AsteroidsSkiaVisuals.ts`) con soporte para predicción de red local y sincronización de estado.
- **Narrativa integrada en Campaign / Story**: `KeplersGhostGraph.ts` e interacción con `MiniGameEncounterRegistry` y `StoryDirectorSystem` le otorgan un contexto narrativo único frente al arcade tradicional.

### Principales debilidades / oportunidades (priorizadas)
1. **Sensación de impacto y Game Feel acotado (Juice)**:
   - Las explosiones de asteroides generan partículas estáticas simples sin variación dinámica de masa, dirección de impulso retenida ni deformación de la nave al acelerar (squash & stretch / screen shake reactivo por masa).
   - Los disparos carecen de destello de cañón (muzzle flash), retroceso visual (recoil offset) y sonido/vibración de feedback direccional en impactos.
2. **Profundidad del Core Loop y variabilidad de enemigos**:
   - Falta de arquetipos de asteroides diferenciados (ej. asteroides magnéticos, explosivos/volátiles, o de cristal reflectante) que alteren la toma de decisiones al fragmentar.
   - La presencia de ovnis/UFOs es estática y poco reactiva a la posición del jugador o al estado de peligro de la ola.
3. **Mecánica de Hyperspace de alto riesgo/recompensa subutilizada**:
   - El botón de Hyperspace simplemente teleporta aleatoriamente sin costo, recarga ni mecánica de pulso gravitacional o distorsión temporal al reaparecer.
4. **Claridad de HUD y Feedback visual de combos / mutadores**:
   - Aunque el multiplicador sube con el `ComboSystem`, no hay indicadores de cadena activa proyectados en el espacio de juego alrededor de la nave ni advertencia visual cuando el temporizador de combo está por expirar.
5. **Optimización de asignaciones en Hot Path de partículas y física**:
   - Aunque existen pools para balas y partículas (`BulletPool`, `ParticlePool`), la generación de vectores y fragmentación de asteroides en `AsteroidCollisionSystem` aún instancian literales de objetos y colores aleatorios por cada fragmento en ticks intensos.

---

## 2. Mejoras concretas (priorizadas)

### 1. Sistema de Impulso Retenido y Juice en Fragmentación
- **Descripción**: Al destruir un asteroide grande o mediano, transferir parte del vector momento (`velocity` de la bala + `velocity` del asteroide original) a los fragmentos resultantes con dispersión cónica, agregando *recoil* a la nave y *micro-freeze* (stop-frame de 16ms en impactos críticos).
- **Impacto esperado**:
  - **Feel**: Excelente (sensación de peso físico y masa espacial).
  - **Depth**: Media (los fragmentos vuelan de forma predecible según el ángulo de disparo).
- **Dificultad de implementación**: Baja.
- **Archivos / sistemas afectados**:
  - `src/games/asteroids/EntityFactory.ts` (`fragmentAsteroid`)
  - `src/games/asteroids/systems/AsteroidCollisionSystem.ts`
- **Cambios clave / Pseudocódigo**:
```typescript
// En fragmentAsteroid(world, asteroidEntity, bulletVelocity)
const asteroidVel = world.getComponent(asteroidEntity, "Velocity");
const baseAngle = Math.atan2(bulletVelocity.vy, bulletVelocity.vx);

for (let i = 0; i < numFragments; i++) {
  const spreadAngle = baseAngle + (rng.next() - 0.5) * (Math.PI / 3);
  const inheritedSpeed = Math.sqrt(asteroidVel.vx ** 2 + asteroidVel.vy ** 2) * 0.5;
  const fragmentSpeed = inheritedSpeed + rng.nextRange(60, 120);

  const vx = Math.cos(spreadAngle) * fragmentSpeed;
  const vy = Math.sin(spreadAngle) * fragmentSpeed;
  // Asignar a VelocityComponent del nuevo fragmento
}
```

---

### 2. Arquetipos Dinámicos de Asteroides (Volátil, Magnético, Acorazado)
- **Descripción**: Introducir tipos de asteroides con comportamientos e identidades visuales únicas en la tabla de spawns de olas:
  1. **Volatile (Explosivo - Naranja)**: Al destruirse, genera una onda expansiva corta que destruye asteroides vecinos y empuja la nave.
  2. **Magnetic (Cobalto - Azul)**: Genera una leve atracción gravitacional hacia la nave si está a menos de 150px.
  3. **Armored (Acorazado - Metálico)**: Requiere 2 impactos de bala para fragmentar y emite chispas metálicas en el primer impacto.
- **Impacto esperado**:
  - **Depth**: Muy Alto (obliga al jugador a priorizar objetivos y usar detonaciones en cadena).
  - **Retention**: Alto (mayor variedad entre niveles y encuentros de campaña).
- **Dificultad de implementación**: Media.
- **Archivos / systems afectados**:
  - `src/games/asteroids/types/AsteroidRegistry.ts` (Componente `AsteroidTypeComponent`)
  - `src/games/asteroids/EntityFactory.ts` (`createAsteroid`)
  - `src/games/asteroids/systems/AsteroidCollisionSystem.ts`
  - `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts` & `AsteroidsSkiaVisuals.ts`
- **Cambios clave / Pseudocódigo**:
```typescript
export interface AsteroidTypeComponent {
  type: "AsteroidType";
  kind: "standard" | "volatile" | "magnetic" | "armored";
  armorHitsRemaining?: number;
}

// En AsteroidCollisionSystem para Volatile Asteroids:
if (asteroidType.kind === "volatile") {
  // Disparar evento de onda expansiva / PhysicsQuery.shapeCast o query por distancia
  const nearby = queryAsteroidsInRange(world, position, 120);
  for (const target of nearby) {
    this.onCombatDeath(world, { entity: target, sourceEntity: asteroid });
  }
}
```

---

### 3. Hyperspace Singular Overdrive (Mecánica Táctica de Emergencia)
- **Descripción**: Convertir la acción de `hyperspace` en un sistema táctico con cooldown (ej. 8 segundos). Al activar Hyperspace:
  1. La nave desaparece dejando una pequeña onda de choque gravitacional (empuja asteroides cercanos).
  2. Reaparece en un punto seguro evaluado mediante un raycast/query espacial (`PhysicsQueryHelper`) libre de colisiones.
  3. Concede 1.5 segundos de campo de distorsión electromagnética que ralentiza asteroides cercanos en un 50%.
- **Impacto esperado**:
  - **Depth**: Alto (pasa de ser un botón de suicidio aleatorio a un recurso de escape calculado).
  - **Feel**: Muy Alto (efectos de distorsión visual y estela de partículas al reaparecer).
- **Dificultad de implementación**: Media.
- **Archivos / sistemas afectados**:
  - `src/games/asteroids/systems/AsteroidInputSystem.ts`
  - `src/games/asteroids/types/AsteroidConfigSchema.ts`
  - `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts` / `AsteroidsSkiaVisuals.ts`
- **Cambios clave / Pseudocódigo**:
```typescript
// En AsteroidInputSystem.ts cuando 'hyperspace' es presionado y cooldown <= 0
const safePos = findSafestSpawnPosition(world, screenWidth, screenHeight, 100);
world.mutateComponent(ship, "Transform", (t) => {
  t.x = safePos.x;
  t.y = safePos.y;
});
world.getCommandBuffer().addComponent(ship, {
  type: "HyperspaceCooldown",
  remaining: 8.0
});
// Emitir evento para ondas de choque y partículas de teletransporte
eventBus.emitDeferred("hyperspace:activated", { x: safePos.x, y: safePos.y });
```

---

### 4. Overclock de Cañón y Disparo Cargado (Power-Up / Core Feature)
- **Descripción**: Permitir que mantener presionado el botón de disparo cargue un disparo de plasma concentrado que atraviesa hasta 3 asteroides pequeños/medianos o destruye de un golpe un asteroide acorazado, consumiendo una barra de energía/calor que se disipa automáticamente.
- **Impacto esperado**:
  - **Depth**: Alto (aporta decisiones de cadencia de tiro vs. disparo cargado en situaciones de acorralamiento).
  - **Feel**: Alto (feedback de carga con escala de partículas en la punta de la nave).
- **Dificultad de implementación**: Media.
- **Archivos / sistemas afectados**:
  - `src/games/asteroids/systems/AsteroidInputSystem.ts`
  - `src/games/asteroids/EntityFactory.ts` (`createBullet`)
  - `src/games/asteroids/systems/AsteroidCollisionSystem.ts`

---

### 5. Anillo de Proximidad de Peligro y UI Radial para la Nave
- **Descripción**: Renderizar indicadores HUD dietéticos alrededor de la nave espacial:
  - Anillo de enfriamiento de Hyperspace / Disparo Cargado.
  - Indicadores de amenaza fuera de pantalla o cerca de colisión inminente (flechas rojas direccionales en los bordes para asteroides de alta velocidad en rumbo de colisión).
- **Impacto esperado**:
  - **UX / Polish**: Excelente (evita muertes injustas por asteroides que entran a alta velocidad desde los bordes envueltos por la pantalla).
  - **Retention**: Alto (reduce la frustración del jugador principiante).
- **Dificultad de implementación**: Baja.
- **Archivos / sistemas afectados**:
  - `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts`
  - `src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts`

---

### 6. Zero-Allocation Hot Path Refactoring en Colisiones y Partículas
- **Descripción**: Eliminar asignaciones implícitas en el bucle principal de `AsteroidCollisionSystem.ts`:
  - Reemplazar la paleta de colores de explosión estática recreada o leída de arrays por paletas numéricas pre-empaquetadas en un array constante y acceso con índice aleatorio.
  - Pre-asignar buffers reutilizables para `query` de asteroides cercanos y puntos de seguridad de Hyperspace.
- **Impacto esperado**:
  - **Technical**: Crítico para mantener 60/120 FPS estables sin pausas de Garbage Collector en móviles gama media/baja o durante resimulaciones de red (rollback netcode).
- **Dificultad de implementación**: Baja.
- **Archivos / sistemas afectados**:
  - `src/games/asteroids/systems/AsteroidCollisionSystem.ts`

---

## 3. Plan de implementación sugerido

1. **Fase 1: Juice & Polish Inmediato (Game Feel)**
   - Implementar la herencia de momento y dispersión cónica en `fragmentAsteroid`.
   - Agregar micro-shake reactivo a la masa del asteroide destruido y partículas direccionales de impacto.
   - Refactorizar las paletas de explosión para eliminar asignaciones temporales en el hot path.

2. **Fase 2: Profundización de Mecánicas Core (Depth & Táctica)**
   - Refactorizar Hyperspace para usar cooldown, búsqueda de punto seguro (`PhysicsQuery`) y pulso gravitacional de escape.
   - Introducir el disparo cargado (Plasma Cannon) e integración con la barra de calor/energía en `AsteroidInputSystem`.

3. **Fase 3: Variabilidad y Contenido (Enemigos & Gameplay Loop)**
   - Crear los arquetipos de asteroides (`Volatile`, `Magnetic`, `Armored`) en `EntityFactory.ts` e integrar sus reacciones en `AsteroidCollisionSystem`.
   - Actualizar los renderers Canvas y Skia con distintivos estéticos (colores neón, resplandores y patrones de fragmentación específicos).

4. **Fase 4: UX & Asistencias de Juego (Presentation)**
   - Implementar los indicadores de proximidad de amenaza fuera de pantalla en los renderers de la nave.
   - Renderizar el medidor radial de carga y enfriamiento de Hyperspace proyectado bajo la nave.

---

## 4. Ideas "wow" / diferenciadoras

1. **Singularity Collapse (Agujero Negro Táctico)**:
   - Al combinar un Power-Up raro o detonar 3 asteroides *Volatile* simultáneamente en un combo de x5, se genera una Singularidad Espacial temporal de 3 segundos en el centro de masa del impacto.
   - La singularidad atrae asteroides y ovnis cercanos, absorbiéndolos y otorgando una explosión masiva de puntos y gemas de XP para meta-progresión.

2. **Quantum Ghost Replay System (Desafío contra tu Sombras anterior)**:
   - Aprovechando el motor ECS determinista y el sistema de re-simulación de entradas, permitir al jugador competir contra su "Fantasma Cuántico" (su mejor partida registrada).
   - El fantasma de la nave se renderiza con un shader neón semitransparente replicando exactamente cada movimiento registrado por frame.

3. **Gravedad Cero Dinámica y Deformación de Malla Espacial**:
   - Agregar una capa de fondo interactiva en Skia/Canvas2D que simula una malla gravitacional. Los asteroides pesados y la nave curvan la malla de fondo en tiempo real mediante un grid deformable simplificado sin costo de computación 3D.

---

## 5. Notas técnicas / riesgos

- **Determinismo y Rollback Netcode**:
  - Toda la aleatoriedad para la generación de arquetipos de asteroides, ángulos de dispersión de fragmentos y posiciones de Hyperspace **debe obligatoriamente** utilizar `world.gameplayRandom`.
  - Queda estrictamente prohibido usar `Math.random()` en cualquier sistema de lógica o factor de fragmentación para prevenir desincronizaciones en multijugador o replays.
- **Boundaries de Arquitectura**:
  - Ninguno de los componentes o sistemas de `src/games/asteroids/` puede ser importado desde `@tiny-aster/core`. Toda comunicación debe fluir a través de los eventos de `EventBus`, la configuración Zod, o mediante las interfaces registradas en `packages/gameplay-kit`.
- **Rendimiento y Zero-Allocation in Hot Loops**:
  - Ninguna mejora visual o de mecánica debe instanciar arreglos (`[]`), objetos (`{}`), ni métodos como `.map()` o `.filter()` dentro del método `update()` de los sistemas de física o colisión.
  - Se deben reutilizar los pools existentes (`ParticlePool`, `BulletPool`) y buffers estáticos del sistema.
