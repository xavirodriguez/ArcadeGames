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

### 2. Introducción de "Shadow Mode" (Modo Sombra) para `ArcadeKernel`
El `ArcadeKernel` operará de forma pasiva en **Shadow Mode** (Modo Sombra). Esto implica que:
- El `ArcadeKernel` escuchará de manera reactiva los eventos y ticks generados por el motor legacy (`BaseGame`).
- No forzará cambios de estado de juego (`PLAYING -> PAUSED`, etc.) ni de ciclo de vida de forma autónoma.
- Registrará y verificará de forma pasiva los frames y hashes en tiempo real para validar la paridad del determinismo.

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
