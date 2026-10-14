# Auditoría y Mejoras de Jugabilidad Táctil en Móvil

Este documento resume la auditoría de control táctil (móvil) y las soluciones aplicadas para cuatro juegos de la plataforma: **Arkanoid**, **Asteroids**, **Hit & Run** y **Racing**.

---

## 1. ARKANOID

### (1) Cómo funciona el input hoy
- **Captura de input**:
  - `src/app/arkanoid/index.tsx`: Captura toques a través de `<TouchDragZone>` (para mover la paleta) y `<TouchActionButton>` (para lanzar la pelota).
  - Teclado en Web: `src/hooks/useKeyboardControls.ts` mapea `Space`, `ArrowUp`, `KeyW` a las acciones `p1Launch`, `p1Left`, `p1Right`.
- **Conversión en estado ECS**:
  - `src/games/arkanoid/systems/ArkanoidInputSystem.ts`: Se ejecuta en la fase `SystemPhase.Simulation`. Lee del recurso `InputSystem` (`UnifiedInput`) y del recurso `TouchInputState`.
  - Actualiza la velocidad y posición de la paleta (`Paddle`, `Transform`, `Velocity`) y administra el lanzamiento/posicionamiento de la pelota (`Ball`).
- **Loop y react**:
  - El input se canaliza mediante el puente mutable `game.setInputState()` y el recurso `TouchInputState`, evitando la reactividad de React por frame.
  - Timestep fijo a 60 FPS conducido por `GameLoop` en `packages/core/src/loop/GameLoop.ts`.

### (2) Causa raíz verificada
- **Disparidad en el nombre de la acción de lanzamiento**: La UI de Arkanoid llamaba a `handleInputState({ launch: true })` notificando la acción `"launch"`, mientras que `ArkanoidInputSystem.ts` leía exclusivamente `inputSys.getAction("p1Launch")`. Por tanto, el toque sobre el botón "LAUNCH" no era procesado por el sistema ECS.
- **Falta de detector de tap en zona de arrastre**: Al tocar directamente sobre la pantalla dentro del área de arrastre (`TouchDragZone`), la bola no se lanzaba porque la zona no registraba ni consumía eventos de tap discreto (`touchState.pushTap`).

### (3) Qué se arregló
- **Sincronización de acción de lanzamiento**: Se actualizó `ArkanoidInputSystem.ts` para verificar tanto `p1Launch` como `launch` y consultar los taps consumibles de `TouchInputState` (`touchState.consumeTaps()`). Se actualizó `src/app/arkanoid/index.tsx` para emitir ambas claves.
- **Detector de Tap en `TouchDragZone`**: Se añadió detección de taps (interacción con duración < 250 ms y desplazamiento < 10 px) en `src/components/controls/TouchDragZone.tsx` para llamar a `touchState.pushTap({ x, y, timestamp })`.
- **Lanzamiento atómico y restricción de ángulo**: En `ArkanoidInputSystem.ts`, al lanzar la pelota se desactiva `b.isAttached = false` y se asigna inmediatamente el vector de velocidad con ángulo restringido entre -120° y -60° respecto a la horizontal (`[-2π/3, -π/3]`). Se previene sobrescribir la velocidad con cero en fotogramas subsecuentemente.
- **Test de regresión**: Añadido en `src/games/arkanoid/__tests__/ArkanoidGameplay.test.ts` comprobando que la pelota cambia `isAttached` a `false` y adquiere velocidad vertical negativa al recibir la acción de lanzamiento.

### (4) Queda pendiente y soluciones posibles
- **Autolanzamiento tras tiempo de espera (Timer)**:
  - *Opción*: Lanzar la bola automáticamente tras 3.0s si el jugador no toca la pantalla.
  - *Pros*: Evita bloqueos en partidas AFK o jugadores novatos.
  - *Contras*: Puede tomar por sorpresa al usuario si estaba calculando el momento.
  - *Recomendación*: Añadir un indicador visual discreto "Toca para lanzar" cuando la bola esté pegada.

### (5) Cómo probarlo en un móvil real
1. Abrir la aplicación en un dispositivo móvil o simulador táctil (Chrome DevTools Mobile Mode).
2. Iniciar una partida de Arkanoid.
3. Tocar el botón "LAUNCH" o pulsar rápidamente sobre cualquier lugar del panel de juego.
4. Verificar que la pelota se despega inmediatamente de la paleta impulsándose hacia arriba de forma fluida.

---

## 2. ASTEROIDS

### (1) Cómo funciona el input hoy
- **Captura de input**:
  - `src/app/asteroids/index.tsx`: Controles mediante `<VirtualJoystick>` flotante a la izquierda y botones táctiles `<GestureActionButton>` a la derecha para disparo y hiperespacio.
  - Teclado Web: `src/hooks/useKeyboardControls.ts` mapea `rotateLeft`, `rotateRight`, `thrust`, `shoot`, `hyperspace`.
- **Conversión en estado ECS**:
  - `src/games/asteroids/systems/AsteroidInputSystem.ts`: Ejecutado en `SystemPhase.Simulation`. Consume `TouchInputState` y actualiza la entidad del jugador (`LocalPlayer`, `Transform`, `Velocity`, `Input`).
  - La física de la nave se calcula mediante la función pura `computeShipPhysics` (`packages/core/src/physics/utils/ShipPhysics.ts`).
- **Loop y react**:
  - Timestep fijo (1/60s). Interpolación y simulación determinista preparadas para rollback/multijugador.

### (2) Causa raíz verificada
- **Giro por botones discontinuos en lugar de ángulo analógico suave**: El joystick virtual mapeaba movimientos a rotación discreta o requería pulsar botones de giro en lugar de rotar la nave directamente hacia la orientación apuntada por el pulgar.

### (3) Qué se arregló
- **Giro suave por el camino corto**: Se amplió `computeShipPhysics` y `AsteroidInputSystem.ts` para aceptar `targetAngle` derivado del joystick (`Math.atan2(moveY, moveX)`).
- **Función pura de rotación en `packages/core`**: Se implementaron `shortestAngleDifference` y `rotateTowardsAngle` en `packages/core/src/input/TouchInputUtils.ts` para girar suavemente hacia el ángulo objetivo respetando la velocidad angular máxima (`SHIP_ROTATION_SPEED`) y eliminando el salto de ángulo en el cruce -π/π (359°→0°).
- **Empuje proporcional e inercia independiente del framerate**: Si el joystick se desplaza hacia afuera (>0.3), se activa el empuje progresivo.

### (4) Queda pendiente y soluciones posibles
- **Esquema Twin-Stick (Joystick derecho de apuntado + autodisparo)**:
  - *Opción*: Sustituir los botones rígidos de disparo por un joystick derecho dedicado de apuntado que dispara automáticamente al mantenerlo empujado.
  - *Pros*: Máxima precisión táctil estilo arcade moderno.
  - *Contras*: Cambio invasivo de la interfaz táctil existente.
  - *Recomendación*: Mantener el esquema de joystick flotante izquierdo + botón táctil con autodisparo continuo mientras se mantiene presionado el botón de fuego.

### (5) Cómo probarlo en un móvil real
1. Abrir Asteroids en un móvil.
2. Arrastrar el joystick flotante izquierdo en cualquier dirección de 360°.
3. Observar cómo la nave gira suavemente hacia la dirección apuntada sin parpadeos ni saltos al cruzar los 0°.
4. Mantener presionado el botón de fuego a la derecha para disparar continuamente.

---

## 3. HIT & RUN

### (1) Cómo funciona el input hoy
- **Captura de input**:
  - `src/app/hitandrun/index.tsx`: Utiliza un joystick virtual táctil `<TouchVirtualJoystick>` en la zona izquierda y botones `<TouchActionButton>` a la derecha (MELEE, FIRE, JUMP).
  - La lógica de apuntado en 8 direcciones se resuelve mediante `src/games/hitandrun/input/resolveHitRunAim.ts`.
- **Conversión en estado ECS**:
  - Se actualiza el componente `BeltInput` de la entidad del jugador en la vista de desplazamiento tipo correa/beat'em-up.
- **Loop y react**:
  - Timestep fijo con integración en tiempo real en la simulación del mundo.

### (2) Causa raíz verificada
- **Sectores rectangulares rígidos con umbrales estrechos**: Se utilizaban umbrales cuadrados simples (`x < -0.2`, `y < -0.2`) para clasificar la dirección. Esto producía un área diagonal extremadamente estrecha en el joystick, provocando que apuntar en diagonal fuera inestable y saltara constantemente a direcciones cardinales (arriba/izquierda/derecha/abajo).

### (3) Qué se arregló
- **Sectores asimétricos de 8 direcciones en `packages/core`**: Se implementó `snapTo8WayAsymmetric` en `packages/core/src/input/TouchInputUtils.ts`, otorgando sectores diagonales más amplios (~60° por diagonal frente a ~30° por cardinal).
- **Integración analógica en Hit & Run**: Se actualizó `resolveHitRunAim.ts` y `src/app/hitandrun/index.tsx` para pasar las coordenadas continuas `(axisX, axisY)` del joystick virtual. La puntería diagonal se encaja ahora de manera intuitiva y estable sin parpadeos.

### (4) Queda pendiente y soluciones posibles
- **Imán de apuntado / Asistencia a objetivos (Aim Assist Magnet)**:
  - *Opción*: Ajustar automáticamente la trayectoria del proyectil un máximo de ±15° hacia el enemigo más cercano dentro de un cono frontal.
  - *Pros*: Facilita golpear enemigos en plataformas a diferente altura.
  - *Contras*: Puede desviar disparos intencionados hacia otros objetivos.
  - *Recomendación*: Probar una asistencia leve (±10°) solo para armas de rango directo.

### (5) Cómo probarlo en un móvil real
1. Abrir Hit & Run en un dispositivo táctil.
2. Mover el joystick en diagonal (por ejemplo, arriba-derecha o abajo-izquierda).
3. Confirmar que el personaje ajusta su disparo a la diagonal de 45° con estabilidad y sin alternar erráticamente entre la horizontal y la vertical.

---

## 4. RACING

### (1) Cómo funciona el input hoy
- **Captura de input**:
  - `src/app/racing/index.tsx`: Arrastre táctil en `<TouchDragZone>` junto a botones táctiles para acelerar (GAS) y nitro (BOOST).
- **Conversión en estado ECS**:
  - `src/games/racing/systems/RacingInputSystem.ts`: Lee el input y llama a `computeCarPhysics` para actualizar la velocidad (`vx`, `vy`) y la rotación del coche.

### (2) Causa raíz verificada
- **BUG CRÍTICO DE COORDENADAS**: En `RacingInputSystem.ts`, la posición X del toque táctil (`touchState.paddle.x`) se estaba comparando directamente contra la coordenada global X del coche en el mundo (`transform.x`):
  ```ts
  if (touchState.paddle.x < transform.x - 5) moveX = -1;
  ```
  Puesto que `transform.x` representa las coordenadas de la pista en el mundo (por ejemplo, 500 px), y `touchState.paddle.x` representaba la coordenada de la pantalla (por ejemplo, 150 px), la condición `150 < 495` se evaluaba como verdades SIEMPRE. Esto provocaba que el coche girara a la izquierda de forma incontrolable de manera permanente al tocar la pantalla.

### (3) Qué se arregló
- **Dirección por desplazamiento relativo**: Se eliminó la comparación errónea contra `transform.x`. En `src/app/racing/index.tsx`, el arrastre horizontal calcula ahora el desplazamiento relativo respecto al punto inicial del toque (`steerX = clamp(deltaX / 60, -1, 1)`), transmitiendo una dirección analógica fluida `moveX` a `RacingInputSystem.ts`.
- **Autocentrado al soltar**: Al levantar el dedo de la pantalla, la dirección regresa automáticamente a 0 (`moveX = 0`).

### (4) Queda pendiente y soluciones posibles
- **Asistencia de centrado en carril y deslizamiento indulgente en paredes**:
  - *Opción*: Aplicar una fuerza suave de alineación hacia la línea central del carril y reducir la pérdida de velocidad al rozar los bordes de la pista.
  - *Pros*: Hace la conducción táctil en pantallas pequeñas mucho más perdonadora y divertida.
  - *Contras*: Reduce el nivel de exigencia técnica en el control.
  - *Recomendación*: Mantener la física actual y ajustar el agarre lateral en las curvas.

### (5) Cómo probarlo en un móvil real
1. Abrir Micro Racers / Racing en un móvil.
2. Iniciar la carrera y pulsar GAS.
3. Deslizar el pulgar a la izquierda o derecha en la pantalla.
4. Comprobar que el vehículo gira proporcionalmente a la cantidad de arrastre horizontal y se endereza inmediatamente al soltar la pantalla.
