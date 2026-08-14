# ADR-001: Propiedad del Loop de Juego y Control de Inputs en la Migración de AsteroidsGame

## Estado
**Aprobado**

## Contexto
Estamos iniciando la migración de `AsteroidsGame` hacia el nuevo runtime unificado de la plataforma (`GameSession` y `ArcadeKernel`). Actualmente, `AsteroidsGame` hereda de `BaseGame`, lo que le proporciona un game loop integrado (`BaseGame.loop`), gestión de entrada local (`InputSystem`/`UnifiedInputSystem`), y un administrador de escenas propio (`SceneManager`). El nuevo runtime propone delegar estas responsabilidades de orquestación a una capa externa determinista (`GameSession` / `ArcadeKernel`), desacoplando la simulación física de la presentación.

## Problema
Durante esta fase de transición, existe un riesgo severo de "Doble Dueño" (Double Ownership) si tanto la infraestructura heredada (`BaseGame`) como la infraestructura nueva (`ArcadeKernel` / `GameSession`) intentan controlar activamente el ciclo de vida del juego, los fotogramas físicos (ticks) y el flujo de inputs de forma concurrente. Esto podría ocasionar:
1. **Condiciones de Carrera (Race Conditions):** Actualizaciones desfasadas de componentes ECS en un mismo fotograma.
2. **Fugas de Memoria y Rendimiento:** Bucles paralelos activos consumiendo CPU.
3. **Desincronizaciones en Red:** Ambas capas intentando replicar y reconciliar estados con hashes conflictivos.

## Decisiones

### 1. Conservación Temporal de la Propiedad en `BaseGame`
Para garantizar una migración con "zero-downtime" y bajo riesgo, la lógica interna del juego no se reescribirá. Durante la Fase 1, `BaseGame` retiene la propiedad principal del loop de tiempo real y de la captura y ruteo de inputs (a través del puente `setInputState`).

### 2. Promoción de "Shadow Mode" a "Active Mode" (Modo Activo)
Inicialmente, el `ArcadeKernel` operó de forma pasiva en **Shadow Mode** (Modo Sombra). Tras confirmar la paridad determinista mediante tests de equivalencia bit a bit (`AsteroidsMigration.test.ts`), el `ArcadeKernel` y `GameSession` han sido promovidos a **Active Mode** (Modo Activo).

Esto implica que:
- **Desmantelamiento del Loop Legacy:** Cuando el juego es instanciado y gestionado por una `GameSession`, el game loop interno y automático de `BaseGame` se detiene por completo (`loop.stopInternalLoop()`).
- **Control Centralizado:** La `GameSession` asume el rol del motor principal de ejecución física paso-a-paso, invocando `.step()` de manera secuencial y determinista.
- **Sincronización Bidireccional de Pausa:** Las transiciones de estado del kernel (`PLAYING ⇄ PAUSED`) se sincronizan directamente con el recurso global `IsPaused` y el bucle físico del juego, logrando una gestión de pausa unificada y robusta.
- **Transición Automática de Fin de Juego:** Cuando la simulación termina, el sistema de juego emite un evento `game:over` que transiciona de forma automática el `ArcadeKernel` de `PLAYING` a `GAME_OVER`.

### 3. Encapsulamiento Mediante Wrapper (`AsteroidsDefinition`)
La conexión con el nuevo runtime se realiza a través del adaptador `AsteroidsDefinition` que implementa la interfaz `GameDefinition`. En su método `createSimulation`, instancia `AsteroidsGame` encapsulando la asincronía del método `init()` (la inicialización de assets y pools) mediante su carga y resolución síncrona/espera asíncrona controlada antes del primer tick en el flujo de `GameSession`.

### 4. Estrategia de Control de Inputs
Los inputs serán ruteados inicialmente por la capa de presentación hacia el puente desacoplado `setInputState` de `AsteroidsGame`. Cuando se complete la transición de propiedad en fases subsecuentes, los inputs de los controladores de interfaz (React Native / Web) fluirán directamente a través del buffer secuencializado de `GameSession.playTick(input)`.

## Consecuencias

### Positivas (Beneficios)
- **Cero Regresiones:** El comportamiento legacy permanece intacto y 100% operativo.
- **Validación Matemática:** Permite realizar pruebas de equivalencia bit a bit tick por tick (como se demuestra en `AsteroidsMigration.test.ts`).
- **Desacoplamiento Gradual:** Facilita la desactivación futura de la orquestación legacy de `BaseGame` con un simple switch de configuración de runtime, sin modificar la lógica física de Asteroids.

### Negativas / Riesgos Mitigados
- **Complejidad Temporal:** Mantenemos temporalmente dos representaciones del estado del juego (la interna de `BaseGame` y la de tracking de `GameSession`), riesgo mitigado mediante la prueba de integración automatizada de no-regresión que asegura consistencia absoluta de hashes.
