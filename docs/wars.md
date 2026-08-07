# GEOMETRYWARS_ROADMAP.md

## Propósito

Este documento es la fuente persistente de verdad para desarrollar un twin-stick shooter arcade 2D en Tiny Aster.

Repositorio:

```text
xavirodriguez/asteroides
```

Juego nuevo:

```text
src/games/geometrywars/
```

El desarrollo se ejecutará mediante sesiones independientes, una por fase o por grupo pequeño de fases. Cada sesión debe leer este documento, comprobar el estado de las fases anteriores y actualizar la checklist antes de terminar.

No se debe intentar completar todo el roadmap en una única sesión de agente.

---

# Hechos verificados del repositorio

## Input

`InputFrame` ya es una interfaz genérica basada en acciones y ejes:

```typescript
export interface InputFrame {
  protocolVersion: number;
  tick: number;
  timestamp: number;
  actions: string[];
  axes: Record<string, number>;
}
```

No debe ampliarse con campos fijos como:

```text
aimX
aimY
movementX
movementY
fire
```

El twin-stick debe representarse mediante claves semánticas:

```typescript
frame.axes.aimX
frame.axes.aimY
frame.axes.moveX
frame.axes.moveY
frame.actions.includes("fire")
```

Antes de definir nuevas claves, verificar las convenciones ya utilizadas por otros juegos para movimiento y disparo.

`InputFrame` está duplicado al menos en:

```text
packages/network/src/NetTypes.ts
server/src/NetTypes.ts
```

Ambas definiciones deben permanecer estructuralmente idénticas.

Como el twin-stick no necesita modificar la interfaz, no se deben editar estos contratos salvo que aparezca una necesidad distinta y demostrada.

Debe añadirse un control automático que detecte divergencias futuras entre las copias cliente y servidor.

## Routing de input

Los sistemas:

```text
JoystickSystem
UnifiedInputSystem
```

están deprecados.

No deben reactivarse.

El flujo vigente es:

```text
UI React
→ InputFrame
→ BaseGame.setInputState()
→ simulación ECS
```

El doble stick debe seguir este flujo.

## Networking

Las clases siguientes existen y pueden utilizarse en la fase opcional de networking:

```text
packages/core/src/network/LocalPredictionSystem.ts
packages/core/src/network/RemoteInterpolationSystem.ts
```

## Shared gameplay

Actualmente `src/games/shared/` contiene:

```text
arcade/
rendering/
types/
```

No existen todavía:

```text
src/games/shared/combat/
src/games/shared/spawn/
```

Tampoco existen `DamageComponent` ni `FactionComponent`.

Por tanto, la construcción de Combat y Spawn es un prerrequisito obligatorio, no una comprobación condicional.

## Partículas

`ParticleSystem` ya evita crear efectos durante resimulación mediante:

```typescript
if (world.isReSimulating) return;
```

Los efectos visuales y el audio deben seguir la misma política conceptual.

## Spatial partitioning

`SpatialPartitioningSystem` calcula coordenadas de grid, pero debe verificarse si `CollisionSystem2D` las consume realmente para reducir pares candidatos.

No se debe considerar que existe un broadphase optimizado hasta comprobarlo en código y tests.

---

# Restricciones arquitectónicas

1. No crear un motor paralelo.
2. Mantener la arquitectura ECS existente.
3. Mantener TypeScript estricto.
4. No introducir lógica específica del juego en `packages/core`.
5. No introducir en `packages/core` imports de:

   * `react-native`
   * `expo-*`
   * `@shopify/react-native-skia`
   * `@colyseus`
   * `src/games`
   * `src/app`
6. No utilizar `Math.random()` en gameplay.
7. Utilizar exclusivamente el RNG determinista oficial del `World`.
8. Mantener la simulación independiente del frame rate de renderizado.
9. Serializar todo estado relevante para gameplay.
10. Cubrir componentes nuevos mediante snapshot y restore.
11. Verificar rollback cuando una feature produzca eventos o efectos secundarios.
12. No incluir callbacks, funciones ni objetos de plataforma en componentes ECS.
13. No desactivar tests, lint, typecheck ni boundaries para ocultar fallos.
14. No realizar refactors no relacionados.
15. No avanzar de fase con quality gates obligatorios en rojo.

---

# Estrategia de ejecución

Cada sesión de desarrollo debe trabajar sobre una única fase o sobre un grupo máximo de tres fases estrechamente relacionadas.

Agrupación recomendada:

```text
Sesión A: prerrequisitos Combat y Spawn
Sesión B: Fases 0 y 1
Sesión C: Fase 2
Sesión D: Fase 3
Sesión E: Fases 4 y 5
Sesión F: Fases 6 y 7
Sesión G: Fases 8 y 9
Sesión H: Fases 10 y 11
Sesión I: Fase 12 opcional
```

Antes de empezar una sesión:

1. Leer este documento.
2. Leer la checklist de estado.
3. Verificar los commits o cambios de fases anteriores.
4. Ejecutar una validación base.
5. No repetir trabajo ya marcado como completado.
6. No asumir que una fase está terminada solo porque existen sus archivos.

Después de terminar:

1. Actualizar la checklist.
2. Registrar archivos modificados.
3. Registrar tests añadidos.
4. Registrar comandos ejecutados.
5. Registrar riesgos pendientes.
6. Marcar la fase como completada, bloqueada o completada con deuda.

---

# Checklist persistente

| Fase                             | Estado    | Quality gates | Evidencia | Riesgos pendientes |
| -------------------------------- | --------- | ------------- | --------- | ------------------ |
| Prerrequisito Combat             | PENDIENTE | —             | —         | —                  |
| Prerrequisito Spawn              | PENDIENTE | —             | —         | —                  |
| 0. Esqueleto y contratos         | PENDIENTE | —             | —         | —                  |
| 1. Input twin-stick              | PENDIENTE | —             | —         | —                  |
| 2. Armas y proyectiles           | PENDIENTE | —             | —         | —                  |
| 3. Broadphase                    | PENDIENTE | —             | —         | —                  |
| 4. Steering e IA                 | PENDIENTE | —             | —         | —                  |
| 5. Oleadas geométricas           | PENDIENTE | —             | —         | —                  |
| 6. Combat, combo y score         | PENDIENTE | —             | —         | —                  |
| 7. Game feel, partículas y audio | PENDIENTE | —             | —         | —                  |
| 8. Cámara                        | PENDIENTE | —             | —         | —                  |
| 9. Canvas y Skia                 | PENDIENTE | —             | —         | —                  |
| 10. HUD y ciclo de partida       | PENDIENTE | —             | —         | —                  |
| 11. Vertical slice               | PENDIENTE | —             | —         | —                  |
| 12. Networking cooperativo       | OPCIONAL  | —             | —         | —                  |

Estados válidos:

```text
PENDIENTE
EN CURSO
COMPLETADA
COMPLETADA CON DEUDA
BLOQUEADA
POSPUESTA
NO APLICA
```

---

# Prerrequisito obligatorio — Combat y Spawn

Antes de crear el nuevo juego deben existir:

```text
src/games/shared/combat/
src/games/shared/spawn/
```

## Combat

Debe incluir como mínimo:

```text
DamageComponent
FactionComponent
CombatSystem
combat:hit
combat:death
```

Debe reutilizar `HealthComponent`.

Debe cubrir:

* Daño.
* Invulnerabilidad.
* Facciones.
* Friendly fire.
* Emisión única de muerte.
* Deduplicación de pares de colisión.
* Snapshot.
* Restore.
* Rollback.
* Determinismo.

No debe incluir:

* Score.
* Combo.
* Loot.
* Partículas.
* Sonido.
* Fragmentación.
* Reglas específicas de enemigos.

## Spawn

Debe incluir como mínimo:

```text
SpawnDirectorComponent
SpawnDirectorSystem
WaveDefinition
SpawnRequest
spawn:wave_start
spawn:wave_complete
```

Debe cubrir:

* Oleadas serializables.
* Cola determinista de spawn.
* RNG determinista.
* Blueprints o adaptadores del juego.
* Snapshot.
* Restore.
* Rollback.
* Emisión única de eventos.
* Ausencia de spawns duplicados.

No comenzar la Fase 0 hasta que ambos módulos estén testeados y sus quality gates estén en verde.

---

# Fase 0 — Esqueleto y contratos

Crear:

```text
src/games/geometrywars/
├── __tests__/
├── components/
├── config/
├── entities/
├── rendering/
├── scenes/
├── systems/
├── types/
├── GeometryWarsGame.ts
└── index.ts
```

Crear únicamente las carpetas que tengan contenido real.

Definir:

* Registro de componentes.
* Registro de eventos.
* Escena principal.
* Configuración tipada.
* Estado de partida.
* Entidad mínima de jugador.
* Integración mínima con aplicación.
* Shape básica para Canvas.
* Shape básica para Skia.
* Smoke test headless.

No implementar todavía oleadas, enemigos complejos ni networking.

---

# Fase 1 — Input twin-stick

## Contrato de red

No modificar la estructura de `InputFrame`.

Representar el input mediante:

```typescript
axes.moveX
axes.moveY
axes.aimX
axes.aimY
actions.includes("fire")
```

Confirmar primero los nombres ya utilizados en el repositorio. Evitar crear sinónimos como `shoot` y `fire` simultáneamente.

## `AimComponent`

Crear un componente serializable:

```typescript
interface AimComponent {
  type: "Aim";
  aimX: number;
  aimY: number;
  isFiring: boolean;
}
```

Puede adaptarse a las convenciones reales del registro de componentes.

## Móvil

Crear dos instancias de `VirtualJoystick`:

* Izquierdo: movimiento.
* Derecho: apuntado.

El estado visual del gesto no debe formar parte de la simulación.

El joystick derecho debe activar `fire` cuando la magnitud supere una zona muerta configurable.

## Web

Implementar:

* WASD o flechas para movimiento.
* Puntero para apuntado.
* Botón principal para disparo.
* Conversión pantalla-mundo compatible con cámara y zoom.

## Gamepad

Verificar soporte real antes de implementarlo.

No crear una abstracción de gamepad si no puede conectarse de forma fiable con web y Expo.

## Sincronización cliente-servidor

Inspeccionar siempre:

```text
packages/network/src/NetTypes.ts
server/src/NetTypes.ts
```

Añadir un test o quality gate que confirme que ambas definiciones de `InputFrame` permanecen sincronizadas.

Como la interfaz no cambia en esta fase, cualquier edición accidental de una sola copia debe considerarse un fallo.

---

# Fase 2 — Armas y proyectiles

Crear:

```text
WeaponComponent
WeaponSystem
```

Reutilizar:

```text
ProjectilePool
TTLSystem
ReclaimableComponent
DamageComponent
FactionComponent
```

El sistema debe:

* Leer `AimComponent`.
* Aplicar zona muerta.
* Normalizar dirección.
* Respetar cooldown.
* Soportar disparo continuo.
* Inicializar daño y facción.
* Utilizar pooling.
* Reciclar proyectiles expirados.
* Mantener determinismo.
* Evitar crecimiento ilimitado.

Añadir un test headless prolongado que verifique:

* Estabilidad del pool.
* Ausencia de componentes residuales.
* Resultado determinista.
* Límite de proyectiles activos.
* Ausencia de fugas lógicas de entidades.

---

# Fase 3 — Broadphase

Leer completamente:

```text
packages/core/src/physics/collision/CollisionSystems.ts
packages/core/src/systems/SpatialPartitioningSystem.ts
```

## Si el broadphase ya es real

* Integrarlo correctamente.
* Añadir tests de escala.
* Documentar límites.
* Comparar resultados con una referencia exhaustiva.

## Si la detección sigue siendo O(n²)

No realizar el refactor como una subtarea incidental de Geometry Wars.

Crear un roadmap independiente:

```text
COLLISION_BROADPHASE_ROADMAP.md
```

Ese roadmap debe incluir:

* Diseño del broadphase.
* Compatibilidad con colliders grandes.
* Celdas vecinas.
* Capas y máscaras.
* Triggers.
* Deduplicación.
* Orden determinista.
* Equivalencia con fuerza bruta.
* Benchmarks.
* Regresión completa de:

  * Asteroids.
  * Space Invaders.
  * Pong.
  * Flappy Bird.

Geometry Wars queda bloqueado en esta fase hasta completar el roadmap independiente o demostrar mediante benchmarks que la implementación actual satisface el presupuesto.

No continuar simplemente documentando una limitación grave de escalabilidad.

---

# Fase 4 — Steering e IA

Crear inicialmente dentro de:

```text
src/games/geometrywars/
```

No mover a `src/games/shared/ai/` hasta demostrar reutilización real.

Implementar solo:

* Seek.
* Flee.
* Orbit o strafe simple, si es necesario.

No introducir behavior trees ni utility AI.

Los tres enemigos iniciales son:

1. Perseguidor.
2. Evasivo u orbital.
3. Rápido y frágil.

Estos mismos tres enemigos constituyen el contenido de la vertical slice. La Fase 11 no exige crear otros tres adicionales.

---

# Fase 5 — Oleadas geométricas

Reutilizar `SpawnDirectorSystem`.

Crear inicialmente tres patrones:

1. Línea.
2. Anillo o círculo.
3. Espiral.

Estos mismos tres patrones se utilizarán en la vertical slice. La Fase 11 no exige tres patrones adicionales.

Las definiciones deben ser serializables y utilizar exclusivamente el RNG determinista de gameplay.

Cubrir:

* Snapshot a mitad de patrón.
* Restore.
* Rollback.
* Cambio de oleada.
* Emisión única de finalización.
* Ausencia de spawn duplicado.
* Límites de cola.

---

# Fase 6 — Combat, combo y score

Reutilizar:

```text
CombatSystem
ComboSystem
```

Mantener fuera de Combat:

* Score.
* Multiplicadores.
* Partículas.
* Audio.
* Loot.
* Progresión.
* Reglas específicas de enemigos.

El juego debe mantener una sola fuente de verdad para score y combo.

Añadir tests de rollback que demuestren que una muerte no incrementa dos veces:

* Score.
* Combo.
* Estadísticas.
* Progresión de oleada.

---

# Fase 7 — Game feel, partículas y audio

Reutilizar:

```text
ParticleSystem
ScreenShakeSystem
JuiceSystem
```

## Partículas

No deben crearse durante resimulación.

Seguir la política:

```typescript
if (world.isReSimulating) return;
```

o la abstracción equivalente existente.

## Audio

Aplicar la misma política de confirmación o supresión al audio.

El disparo continuo, impactos y muertes no deben reproducir sonidos duplicados durante rollback.

Antes de implementar audio:

1. Inspeccionar el sistema real de audio.
2. Determinar si existe confirmación de ticks.
3. Determinar si existe deduplicación.
4. Determinar si el audio se ejecuta durante resimulación.

Si no existe infraestructura suficiente, implementar una solución local mínima o documentar el bloqueo.

No almacenar instancias de audio dentro del estado ECS serializable.

Distinguir:

```text
evento determinista de gameplay
→ trigger local de audio confirmado
```

Tests mínimos:

* Sin audio durante resimulación.
* Un sonido por evento confirmado.
* Disparo continuo limitado por política de voces.
* Sin duplicados tras rollback.
* El gameplay es idéntico con audio activado o desactivado.

---

# Fase 8 — Cámara

Verificar primero si existe un sistema funcional para `Camera2DComponent`.

Completar únicamente lo que falte:

* Seguimiento suave.
* Límites.
* Zoom.
* Conversión pantalla-mundo.
* Conversión mundo-pantalla.

La conversión pantalla-mundo debe utilizarse para apuntar con ratón.

La cámara no debe introducir diferencias de gameplay entre Canvas y Skia.

---

# Fase 9 — Canvas y Skia

Registrar las mismas shapes en ambos renderers.

Añadir un test estructural que compare:

* Identificadores de shapes.
* Shapes ausentes.
* Orden de capas.
* Interpretación de escala.
* Rotación.
* Opacidad.
* Visibilidad.

No exigir igualdad exacta de píxeles cuando los renderers utilicen APIs diferentes.

Añadir pruebas manuales documentadas para web, iOS y Android cuando el entorno lo permita.

---

# Fase 10 — HUD y ciclo de partida

Implementar:

* Score.
* Combo.
* Oleada.
* Vida.
* Pausa.
* Reanudación.
* Game over.
* Reinicio.
* Ayuda de controles.

Evitar renderizados React causados por cada entidad o cada tick cuando no sean necesarios.

El reinicio debe limpiar:

* Entidades.
* Estado de oleadas.
* Combo.
* Score.
* Inputs activos.
* Pools.
* Eventos pendientes.

---

# Fase 11 — Vertical slice

La vertical utiliza el contenido ya construido:

* Los mismos tres enemigos de la Fase 4.
* Los mismos tres patrones de la Fase 5.
* Un arma.
* Un jugador.
* Doble stick.
* Teclado y ratón.
* Combat.
* Spawn.
* Combo.
* Score.
* Partículas.
* Audio.
* Cámara.
* Canvas.
* Skia.
* Game over.
* Reinicio.

No añadir en esta fase:

* Tres enemigos adicionales.
* Tres patrones adicionales.
* Metaprogresión.
* Inventario.
* Árboles de mejoras.
* Múltiples armas.
* Boss complejo.
* Networking.

---

# Fase 12 opcional — Networking cooperativo

Utilizar los sistemas existentes:

```text
LocalPredictionSystem
RemoteInterpolationSystem
NetworkManager
NetworkController
```

No comenzar hasta que:

* Single-player sea estable.
* Snapshot y restore funcionen bajo carga.
* Rollback sea determinista.
* Combat y Spawn no dupliquen eventos.
* Los pools sean estables.
* Broadphase cumpla el presupuesto.

Verificar siempre la sincronización de:

```text
packages/network/src/NetTypes.ts
server/src/NetTypes.ts
```

Los inputs twin-stick se transmiten mediante las claves genéricas de `actions` y `axes`; no requieren cambiar la forma de `InputFrame`.

No replicar partículas ni audio.

---

# Quality gates

Al final de cada fase ejecutar, según corresponda:

```bash
pnpm test
pnpm lint
pnpm typecheck:core
pnpm typecheck:app
pnpm check:core-boundaries
pnpm ci
```

Añadir quality gates específicos para:

* Sincronización de `InputFrame`.
* Determinismo.
* Snapshot y restore.
* Rollback.
* Pooling.
* Broadphase.
* Paridad Canvas/Skia.
* Simulación headless prolongada.
* Audio durante resimulación.

---

# Condiciones de parada

Marcar una fase como bloqueada cuando:

* Combat o Spawn no estén terminados.
* Se requiera modificar la estructura de `InputFrame` sin justificación.
* Cliente y servidor diverjan en tipos de red.
* El broadphase requiera un refactor transversal no aislado.
* Snapshot no incluya un componente nuevo.
* Restore duplique entidades.
* Rollback duplique efectos, audio, score o combo.
* Canvas y Skia necesiten modelos incompatibles.
* Se rompan juegos existentes.
* Falle `check-core-boundaries`.
* El alcance crezca de forma sustancial.

Ante un bloqueo:

1. Detener fases dependientes.
2. Documentar causa.
3. Citar archivos implicados.
4. Crear un roadmap independiente cuando corresponda.
5. Proponer la alternativa mínima.
6. No ocultar el fallo.

---

# Definición de terminado

El desarrollo se considera terminado cuando:

* Combat y Spawn existen y están probados.
* El twin-stick utiliza `InputFrame.actions` y `InputFrame.axes`.
* No se ha modificado innecesariamente la estructura de `InputFrame`.
* Cliente y servidor mantienen tipos sincronizados.
* Existen tres enemigos iniciales.
* Existen tres patrones iniciales.
* Proyectiles y partículas utilizan pooling.
* Broadphase ha sido validado o mejorado mediante un roadmap independiente.
* Steering es determinista.
* Combat, combo y score no se duplican durante rollback.
* Audio y partículas no se reproducen durante resimulación.
* Cámara, Canvas y Skia funcionan.
* Existe una vertical slice completa.
* Existen tests de determinismo, snapshot, restore y rollback.
* Todos los quality gates están en verde.
* Los juegos existentes no presentan regresiones.