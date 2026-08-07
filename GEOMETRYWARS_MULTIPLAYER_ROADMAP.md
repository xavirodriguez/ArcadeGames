# Geometry Wars - Multiplayer Roadmap

Este documento detalla el plan de diseño, arquitectura y ejecución técnica para transformar la vertical slice de **Geometry Wars** en una experiencia multijugador cooperativa en tiempo real con servidor autoritativo (`Colyseus`), reconciliación en cliente, predicción local y compensación de lag.

---

## 1. Arquitectura General del Sistema

El juego seguirá el patrón de **Servidor Autoritativo con Simulación Headless (ECS) e Interpolación en Cliente**.

```text
               +--------------------------------------+
               |          Colyseus Server             |
               | (Headless ECS World simulation tick) |
               +------------------+-------------------+
                                  ^
                                  |  1. Input Frames
                                  |  (axes.moveX/Y, axes.aimX/Y, fire)
                                  v
+---------------------------------+-----------------------------------+
|                            Clients                                  |
|  - Local Prediction: Predicts local player immediately              |
|  - Server Reconciliation: Re-simulates ticks on server correction   |
|  - Remote Interpolation: Smoothly interpolates other entities       |
|  - Render & VFX: Zero-allocation particle/sound rendering           |
+---------------------------------------------------------------------+
```

### Contrato de Red (`InputFrame`)
Reutilizaremos la interfaz genérica `InputFrame` compartida entre el cliente (`packages/network/src/NetTypes.ts`) y el servidor (`server/src/NetTypes.ts`):

```typescript
export interface InputFrame {
  protocolVersion: number;
  tick: number;
  timestamp: number;
  actions: string[]; // e.g. ["fire", "bomb"]
  axes: Record<string, number>; // e.g. {"moveX": 1.0, "aimX": -0.5, ...}
}
```

---

## 2. Fases del Roadmap de Multijugador

### Fase A: Definición de Esquemas Colyseus (`GeometryWarsState.ts`)
Crear el estado serializable sincronizado para Colyseus en `server/src/schema/GeometryWarsState.ts`.

1. **`GeometryWarsState`**:
   - `score: number` (puntuación colectiva o individual)
   - `wave: number`
   - `bombs: number`
   - `gameStarted: boolean`
   - `gameOver: boolean`
   - `serverTick: number`
   - `players: MapSchema<Player>`
   - `enemies: MapSchema<Enemy>`
   - `bullets: MapSchema<Bullet>`
2. **`Player` Schema**:
   - `sessionId: string`
   - `name: string`
   - `x: number`, `y: number`, `angle: number`
   - `velocityX: number`, `velocityY: number`
   - `lives: number`
   - `alive: boolean`
3. **`Enemy` Schema** & **`Bullet` Schema**:
   - `id: string`
   - `type: string` (`"gw_chaser"`, `"gw_evader"`, `"gw_grunt"`)
   - `x: number`, `y: number`, `angle: number`

---

### Fase B: Creación de la Sala del Servidor (`GeometryWarsRoom.ts`)
Crear la clase de sala `GeometryWarsRoom` heredando de Colyseus `Room` en el directorio `server/src/GeometryWarsRoom.ts`.

1. **Instanciar la Simulación Headless**:
   - Arrancar la clase `GeometryWarsGame` configurada con `headless: true` e `isMultiplayer: true`.
   - Limitar el bucle de actualización a un step fijo (`16.66ms` / 60 FPS).
2. **Ciclo de Recepción de Inputs**:
   - Recibir los `InputFrame` de los clientes y almacenarlos en un buffer indexado por `sessionId`.
3. **Paso de Simulación Autoritativo**:
   - Leer el buffer de inputs de cada cliente para el tick correspondiente.
   - Si un input falta, aplicar duplicación determinista del último frame recibido.
   - Ejecutar un paso síncrono del motor ECS (`gameSimulation.runSimulationStep()`).
4. **Sincronización con el Schema**:
   - Mapear las posiciones físicas y lógicas desde el mundo ECS autoritativo a las propiedades del `GeometryWarsState` de Colyseus para su replicación.

---

### Fase C: Integración en el Lado del Cliente (`useMultiplayer.ts`)
Conectar la pantalla principal (`src/app/geometrywars/index.tsx`) al sistema multijugador utilizando la infraestructura existente.

1. **Suscripción y Puentes de Red**:
   - Utilizar el hook `useMultiplayer("geometrywars")` para conectarse a la sala de Colyseus del servidor.
   - Pasar la instancia del juego local a modo multijugador con `game.setMultiplayerMode(true)`.
2. **Predicción Local del Jugador (Local Prediction)**:
   - Al capturar la interacción de movimiento o apuntado, empaquetar el `InputFrame` y enviarlo inmediatamente mediante `room.send("input", frame)`.
   - Aplicar el mismo frame localmente sobre la nave del jugador local de inmediato para una respuesta instantánea y sin latencia.
3. **Reconciliación con el Servidor (Server Reconciliation)**:
   - Al recibir el estado autoritativo del servidor, comparar la posición calculada en el cliente con la recibida del servidor para ese tick.
   - Si hay discrepancias mayores que un margen de error (tolerancia), restaurar el snapshot del servidor para ese tick del pasado y volver a resimular secuencialmente todos los frames pendientes del buffer local hasta el tick actual (rollback determinista).

---

### Fase D: Interpolación de Entidades Remotas (`RemoteInterpolationSystem`)
Asegurar que los enemigos y otros jugadores remotos se visualicen de manera fluida y suave.

1. **Replicación Selectiva**:
   - Los otros jugadores y los proyectiles deben interpolarse linealmente entre los snapshots recibidos utilizando el `RemoteInterpolationSystem` existente para disimular la latencia de red.
2. **Supresión Visual de Efectos Locales**:
   - Asegurarse de que durante el rebobinado y resimulación de ticks (Rollback ticks), no se emitan explosiones de partículas redundantes ni se reproduzcan efectos de sonido duplicados (`if (world.isReSimulating) return;`).

---

### Fase E: Registro de Rutas del Servidor y Quality Gates
Asegurar que los servicios estén listos para compilar, probar y desplegar.

1. **Registrar la Sala del Servidor**:
   - En `server/src/index.ts`, registrar el ruteador de la nueva sala:
     ```typescript
     gameServer.define("geometrywars", GeometryWarsRoom);
     ```
2. **Pruebas de Sincronización Automáticas**:
   - Mantener el test `InputFrameSync.test.ts` en verde para evitar divergencias accidentales en los contratos de red cliente-servidor.
   - Crear un test de estrés `GeometryWarsMultiplayer.test.ts` para verificar la estabilidad de los buffers de snapshots y el rendimiento de la replicación del servidor bajo carga de 4 jugadores y 150 enemigos concurrentes.

---

## 3. Beneficios y Desafíos Clave

* **Determinismo Puro:** La selección de objetivos de la IA (`SteeringSystem`), el generador de números aleatorios (`world.gameplayRandom`), y las colisiones (`BroadPhase` + `CollisionSystem2D`) son 100% deterministas en el cliente y el servidor.
* **Seguridad Antihack:** Al ser el servidor quien realiza las colisiones de combate y decrementa las vidas del jugador, los clientes no pueden inyectar puntuaciones falsas ni modificar su salud de forma local.
* **Desafío - Presupuesto de Ancho de Banda:** Dada la gran densidad de proyectiles en pantalla, se debe implementar una estrategia de replicación compacta (como la codificación binaria de posiciones de balas o usar el `GWBulletPool` de forma sincronizada con una semilla de RNG unificada).
