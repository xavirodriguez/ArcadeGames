Antes de las ventajas, vale la pena remarcar el punto clave del análisis anterior: la infraestructura de bajo nivel para esto **ya existe casi completa** — `NarrowPhase.test` genera manifolds SAT con normal, profundidad de penetración y puntos de contacto para Circle/Box/Polygon [1](#2-0) , y `CollisionSystems.ts` ya recorre el broadphase, calcula el manifold y dispara callbacks/eventos con esa data [2](#2-1) . Lo que falta es la capa de **resolución de impulsos** (`PhysicsSolveSystem` es un no-op) y una capa de **restricciones persistentes** (joints/springs) sobre esa base. Confirmé además que hoy en día los juegos existentes (p. ej. Asteroids) resuelven colisiones a nivel de gameplay puro (destruir bala, fragmentar asteroide, restar vida) en vez de física real de impulsos [3](#2-2) , y que el movimiento de la nave es un modelo simplificado de aceleración/fricción, no un cuerpo rígido con masa/inercia real [4](#2-3) .

Dado ese contexto, las ventajas concretas de invertir en esto son:

1. **Apalancamiento del trabajo ya hecho en NarrowPhase/SAT.** No hace falta reescribir la detección de colisiones — sólo consumir el `CollisionManifold` que ya se calcula y añadir la etapa de resolución que falta. El coste marginal es menor que construir un motor de física desde cero.

2. **Desbloquea un género completo con alta demanda de mercado:** Angry-Birds-likes, puzzles físicos, grappling hooks, péndulos, cadenas/cuerdas — géneros que hoy son literalmente imposibles porque no hay ningún mecanismo de restricción entre dos cuerpos ni de rebote realista con conservación de momento.

3. **Beneficia transversalmente a juegos ya existentes.** Un solver de impulsos genérico mejoraría el "feel" físico de cualquier juego con colisiones dinámicas cuerpo-cuerpo (Asteroids, Pong-like, breakout-like) reemplazando lógica de gameplay ad-hoc por respuesta física consistente y reutilizable, reduciendo duplicación de código entre juegos.

4. **Reutiliza la arquitectura ECS/System existente.** Al igual que `PhysicsIntegrateSystem`/`PhysicsSolveSystem` ya están registrados en el pipeline (`SystemPhase.Collision` presumiblemente), añadir un `JointSolverSystem` es coherente con el patrón arquitectónico ya establecido — no requiere un paradigma nuevo.

5. **Determinismo compatible con rollback netcode.** El motor ya prioriza funciones puras deterministas para simulación en red (ver el comentario explícito en `computeShipPhysics` sobre "100% deterministic... across network rollbacks") [5](#2-4) . Un solver de impulsos/joints bien diseñado (iterativo, con paso fijo) puede mantener esa misma garantía, lo cual es valioso porque muchos motores de física de terceros no son deterministas y no serían compatibles con el `NetworkManager`/`LocalPredictionSystem` ya construido.

6. **Efecto multiplicador con otros sistemas propuestos.** Un solver de constraints robusto es también la base técnica para "ragdolls" simples, vehículos con suspensión, o joints usados como decoración/feedback visual (JuiceSystem), ampliando el valor más allá del género "física de proyectiles".

## Roadmap: Física con Joints/Springs

### Fase 0 — Fundaciones de masa/inercia (prerequisito silencioso)

- Añadir `RigidBodyComponent { mass, invMass, inertia, invInertia, restitution, friction, isStatic }`. Hoy no existe ningún componente de masa; `VelocityComponent` solo tiene `vx/vy/angularVelocity` sin masa [4](#3-3) .
- Sin esto, ningún solver de impulsos puede calcular respuesta física correcta (F=ma, conservación de momento).

### Fase 1 — Solver de impulsos base (llenar `PhysicsSolveSystem`)

- Consumir el `CollisionManifold` que ya produce `NarrowPhase.test` (normal, `depth`, `contactPoints`) [5](#3-4) , que hoy ya se calcula en `CollisionSystems.ts` pero solo se usa para eventos de gameplay (`onCollision`/`onTriggerEnter`), no para resolución física [6](#3-5) .
- Implementar: separación posicional (resolver penetración via `depth`/`normal`), impulso normal (restitución), impulso tangencial (fricción de Coulomb).
- Test de validación: dos círculos con masas distintas chocando deben conservar momento total (regresión determinista, similar a `BoltPerformance.test.ts` que ya valida física con 30 ticks fijos) [7](#3-6) .
- Registrar en `SystemPhase.Collision` después de `CollisionSystem2D`, como ya hacen otros sistemas de colisión encadenados (`CollisionSystem2D` → `CombatSystem` en Arkanoid/Asteroids) [8](#3-7) .

### Fase 2 — Componentes de joint y tipos

- `JointComponent`: discriminated union por `jointType: "distance" | "revolute" | "spring"`, con `entityA`, `entityB`, `anchorA {x,y}` (local), `anchorB {x,y}` (local), y parámetros específicos (`restLength`, `stiffness`, `damping` para spring; `maxDistance` para distance; ninguno extra para revolute/pin).
- Añadir helpers de creación (`createDistanceJoint`, `createSpringJoint`) siguiendo el patrón de blueprints/factories ya usado en el motor.

### Fase 3 — `JointSolverSystem`

- Sistema nuevo registrado en `SystemPhase.Collision` (misma fase que el solver de colisión, con prioridad para ejecutar antes o después según se decida iterar constraints antes/después de colisiones — igual que Arkanoid ordena `CollisionSystem2D` antes de `CombatSystem` con el patrón de prioridad de `Schedule`) [9](#3-8) .
- Iterar cada `JointComponent`, calcular error de restricción (distancia actual vs `restLength`), aplicar corrección de velocidad/posición (Baumgarte stabilization o unas pocas iteraciones tipo PBD — 4-8 iteraciones por tick es suficiente para joints simples de arcade).
- Para `spring`: aplicar fuerza proporcional (`F = -k * (dist - restLength) - damping * relativeVelocity`) directamente sobre `VelocityComponent`, sin necesitar corrección posicional rígida.
- Para `revolute/pin`: fijar punto de anclaje compartido, corrigiendo posición de ambos cuerpos proporcionalmente a `invMass`.

### Fase 4 — Integración con determinismo/rollback

- Verificar que todo el solver usa únicamente matemática de punto flotante determinista sin `Math.random`, siguiendo la misma disciplina que `ShipPhysics.ts` documenta explícitamente para compatibilidad con `LocalPredictionSystem`/replay [10](#3-9) .
- Añadir test de snapshot/rollback: simular N ticks, guardar snapshot, reproducir con `ReplaySystem`, verificar hash idéntico — mismo patrón que `DivergenceDetector`/`DeterministicReplayPlayer` ya usan para otros sistemas.

### Fase 5 — Prototipo de juego de validación

- Construir un mini-juego de prueba (grappling hook o péndulo simple) reutilizando `PhysicsQuery.pointCast` para anclar el joint a un punto tocado por el jugador [11](#3-10) , validando la API end-to-end antes de declarar el sistema "listo para producción".

### Fase 6 — Exponer en `index.ts` y documentación

- Exportar `RigidBodyComponent`, `JointComponent`, `JointSolverSystem` desde `packages/core/src/index.ts` junto al resto de física (`PhysicsIntegrateSystem`, `PhysicsSolveSystem`) [12](#3-11) .
- Actualizar `etc/asteroides.api.md` (API report generado) y la wiki de "Physics Subsystem".

**Orden de dependencia crítico:** Fase 0 → Fase 1 son bloqueantes y no opcionales — sin masa e impulsos, joints/springs no tienen semántica física correcta (se comportarían como snapping teleport, no física real). Fases 2-3 son el "producto" en sí. Fase 4 es la que distingue este motor de una librería de física genérica de terceros (debe mantener el determinismo que ya garantiza el resto del stack de red).
