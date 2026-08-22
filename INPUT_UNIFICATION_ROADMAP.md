# Roadmap: Unificación de Input y Estandarización de Contratos

Este documento rige la transición de los múltiples esquemas de input ad-hoc (`moveLeft`, `thrust`, `rotateRight`) a una única tubería canónica (`CanonicalInputState`), aislando la capa de captura del ECS de red.

## Fase 1 — Contrato `CanonicalInputState`
Definir los tipos estáticos base que representarán la intención del jugador, independientes del hardware.
* **Ubicación:** `packages/core/src/input/CanonicalInput.ts`.
* **Definición de Acciones:**
  ```typescript
  export type CanonicalActionName<TExtra extends string = "never"> =
    | "fire" | "secondary" | "boost" | "hyperspace" | "pause" | "confirm" | "cancel" | TExtra;
  ```
* **Definición de Estado:**
  ```typescript
  export interface CanonicalInputState<TExtra extends string = "never"> {
    axes: { moveX: number; moveY: number; aimX: number; aimY: number; };
    actions: Set<CanonicalActionName<TExtra>>;
    timestamp: number;
  }
  ```
* **Contrato de Red Restringido:** Está terminantemente prohibido modificar `packages/network/src/NetTypes.ts` y `server/src/NetTypes.ts`. La estructura binaria/serializada de `InputFrame` se mantiene intacta. La unificación se logra inyectando funciones puras de traducción `CanonicalInputState` <-> `InputFrame` en los bordes del sistema.

## Fase 2 — Proveedores de Input (InputProviders)
Construir los adaptadores de hardware en `packages/core/src/input/providers/` que emitan instancias válidas de `CanonicalInputState`.
* **KeyboardInputProvider:** Implementación orientada a eventos para reemplazar las lecturas dispersas en `src/hooks/useKeyboardControls.ts`.
* **GamepadInputProvider:** Nueva integración consumiendo la Gamepad API nativa, normalizando deadzones a los axes canónicos.
* **VirtualJoystickProvider:** Implementación táctil siguiendo el diseño twin-stick: joystick izquierdo mapeado a `moveX`/`moveY`, joystick derecho mapeado a `aimX`/`aimY` disparando `fire` al superar el umbral límite (deadzone).

## Fase 3 — Migración Incremental (Juego por Juego)
El retrofit no será atómico. Se actualizarán los adaptadores `setInputState` de cada juego de forma secuencial.
* **Geometry Wars:** Refactor directo. Sustituir su input actual (`moveX`, `moveY`, `aimX`, `aimY`, `fire`) por la nueva interfaz.
* **Space Invaders:** Traducir eje: `axes.moveX` a su estado interno y `actions.has("fire")` a `shoot`.
* **Asteroids:** Mapear `axes.moveX` a `rotateLeft`/`Right`, `axes.moveY` (positivo) a `thrust`, y acciones a `hyperspace`/`shoot`.
* **Flappy Bird:** Mapear acciones de confirmación y salto a `flap`/`glide`.
* **Gate de Calidad:** Cada juego migrado debe incluir su propio test unitario de no-regresión de comportamiento, comparando los viejos mutadores ECS con la nueva tubería ante simulaciones idénticas de pulsaciones de teclado.

## Fase 4 — Contrato de Red en CI (Gate)
Proteger la sincronización cliente/servidor.
* Implementar un test en el entorno de CI que falle inmediatamente si los archivos `NetTypes.ts` (específicamente la interfaz `InputFrame`) del `packages/network` y del `server` divergen en propiedades o tipos.

## Bloqueos y Gobernanza
* **Sunset de Input Legacy:** Ningún juego de nueva creación dentro del repositorio asteroides puede depender de `useKeyboardControls.ts` o definir diccionarios de input ad-hoc.
* **Prohibición de Alias:** No se permite añadir sinónimos en `CanonicalActionName` (ej. no coexistirán `shoot` y `fire`). Los juegos individuales deben mapear la acción base a su dominio interno si la semántica del juego lo requiere.
