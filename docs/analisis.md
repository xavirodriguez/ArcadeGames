# Rol

Actúa como un **arquitecto senior de motores de videojuegos**, especializado en:

* TypeScript estricto.
* React Native y Expo.
* Arquitecturas ECS.
* Simulación determinista.
* Videojuegos arcade 2D.
* Renderizado con Canvas y React Native Skia.
* Diseño de APIs reutilizables.
* Testing automatizado de lógica de videojuegos.
* Networking autoritativo, snapshots, predicción y rollback.
* Diseño evolutivo de motores existentes.

Tienes acceso completo al repositorio de **Tiny Aster**, un motor arcade ECS determinista que actualmente incluye juegos como Asteroids, Space Invaders, Flappy Bird y Pong.

Tu tarea no es diseñar un motor nuevo desde cero. Debes estudiar el motor existente y proponer una evolución incremental que permita implementar nuevos juegos reutilizando al máximo la arquitectura actual.

---

# Contexto arquitectónico

El repositorio está organizado aproximadamente de esta forma:

* `packages/core`: ECS, componentes, sistemas, física, snapshots, rollback, pooling, input, audio y eventos.
* `packages/renderer-canvas`: renderizador Canvas.
* `packages/renderer-skia`: renderizador React Native Skia.
* `packages/network`: abstracciones de networking.
* `packages/network-colyseus`: integración con Colyseus.
* `packages/react-native`: bindings y adaptación a React Native.
* `src/games/*`: reglas, entidades y contenido específico de cada juego.
* `server/`: servidor autoritativo.
* `GDD.md`: diseño de mecánicas, progresión y principios de los juegos.
* `ROADMAP_FIXES.md`: errores históricos, regresiones y riesgos de integración.

La arquitectura impone estas restricciones:

1. `packages/core` no puede depender de React Native, Expo, Skia, Colyseus ni código específico de juegos.
2. La lógica que afecte al gameplay debe ser determinista.
3. Toda aleatoriedad de gameplay debe usar el generador determinista del mundo, por ejemplo `world.gameplayRandom`.
4. Los sistemas compartidos deben vivir en paquetes reutilizables.
5. La presentación debe mantenerse desacoplada de las reglas del juego.
6. Los juegos deben poder ejecutarse y probarse de forma headless siempre que sea posible.
7. Las nuevas capacidades deben funcionar, o declarar claramente sus limitaciones, tanto en Canvas como en Skia.
8. Deben respetarse los mecanismos existentes de snapshots, restore, pooling, TTL y rollback.
9. No debes introducir una segunda arquitectura paralela al ECS actual.
10. Las propuestas deben ser compatibles con TypeScript estricto y con el flujo de trabajo de Expo.

---

# Objetivo

Analiza el repositorio y propón entre **5 y 10 nuevos juegos** que puedan desarrollarse mediante mejoras evolutivas del motor.

Para cada juego debes identificar:

* Las capacidades actuales del motor que pueden reutilizarse.
* Las limitaciones que impiden implementarlo correctamente.
* Las funcionalidades compartidas que deberían añadirse al motor.
* Las funcionalidades específicas que deberían permanecer dentro del juego.
* Los cambios necesarios en renderizado, input, audio, física, IA, networking, persistencia, UI y testing.
* El coste, riesgo y valor arquitectónico de implementarlo.
* El orden recomendado de desarrollo.

El resultado debe servir como una combinación de:

* Auditoría técnica.
* Catálogo de posibles juegos.
* Gap analysis del motor.
* Roadmap evolutivo.
* Plan de implementación.

---

# Fase 1: inspección obligatoria del repositorio

Antes de sugerir juegos, inspecciona como mínimo:

1. La estructura completa del monorepo.
2. Los `package.json` raíz y de cada workspace.
3. Las exportaciones públicas de `packages/core`.
4. Las definiciones de:

   * `World`.
   * Entidades.
   * Componentes.
   * Sistemas.
   * `BaseGame`.
   * Input.
   * Eventos.
   * Audio.
   * Física y colisiones.
   * Pooling.
   * TTL.
   * Snapshots.
   * Restore.
   * Rollback.
5. Las interfaces implementadas por Canvas y Skia.
6. El sistema de registro de formas y efectos visuales.
7. Los cuatro juegos existentes.
8. Los tests unitarios e integraciones existentes.
9. `GDD.md`.
10. `ROADMAP_FIXES.md`.
11. Los scripts de CI, typecheck, lint y validación de boundaries.
12. La implementación de networking y del servidor autoritativo.

No asumas que una funcionalidad existe por estar mencionada en documentación. Verifica su implementación y su cobertura de tests.

Cuando documentación y código no coincidan, considera el código como fuente principal y registra explícitamente la discrepancia.

---

# Fase 2: inventario de capacidades

Construye un inventario de las capacidades actuales del motor.

Clasifica cada capacidad como:

* **Completa**: está implementada, probada y puede reutilizarse directamente.
* **Parcial**: existe, pero requiere ampliaciones.
* **Específica**: está acoplada a un juego concreto y debería generalizarse.
* **Ausente**: debe desarrollarse.
* **Incierta**: no existe evidencia suficiente para evaluarla.

Como mínimo, evalúa:

* Ciclo de actualización fijo.
* Determinismo.
* ECS y queries.
* Gestión de entidades.
* Pooling.
* Prefabs.
* Física.
* Colisiones.
* Triggers.
* Spatial partitioning.
* Navegación y pathfinding.
* IA basada en estados.
* IA basada en comportamiento.
* Proyectiles.
* Combate cuerpo a cuerpo.
* Daño y salud.
* Estados alterados.
* Inventario.
* Equipamiento.
* Interacciones.
* Máquinas de estados.
* Animaciones.
* Tilemaps.
* Mapas por habitaciones.
* Generación procedural.
* Cámara.
* Parallax.
* Partículas.
* Iluminación.
* Postprocesado.
* Texto y HUD.
* Menús.
* Input táctil.
* Gamepad.
* Gestos.
* Rebinding.
* Audio.
* Música dinámica.
* Persistencia.
* Progresión.
* Replays.
* Networking.
* Autoridad del servidor.
* Predicción.
* Rollback.
* Spectators.
* Bots.
* Herramientas de depuración.
* Telemetría de rendimiento.
* Testing headless.

Presenta este inventario antes de recomendar juegos.

---

# Fase 3: selección de juegos

Propón entre **5 y 10 juegos**.

No te limites a clones literales. Puedes proponer reinterpretaciones arcade con un alcance controlado.

La selección debe cubrir distintos tipos de mecánicas, por ejemplo:

* Acción top-down.
* Plataformas.
* Puzzle.
* Tower defense.
* Roguelite.
* Carreras.
* Combate por oleadas.
* Juegos por turnos.
* Cooperativo o competitivo multijugador.
* Juegos basados en grid o tilemap.

No es obligatorio cubrir todas las categorías. Escoge únicamente juegos que tengan sentido para la arquitectura observada.

Prioriza propuestas que:

1. Reutilicen capacidades existentes.
2. Añadan funcionalidades útiles para más de un juego.
3. Incrementen progresivamente la complejidad.
4. No requieran reescribir el motor.
5. Puedan probarse de forma determinista.
6. Funcionen bien en móvil, web y controles táctiles.
7. Mantengan sesiones arcade razonablemente acotadas.
8. Permitan validar Canvas y Skia.
9. Aumenten la madurez técnica del motor.
10. Generen bloques reutilizables para juegos posteriores.

Evita propuestas que dependan principalmente de:

* Mundos 3D.
* Física 3D.
* Streaming masivo de mundo abierto.
* Cinemáticas complejas.
* MMO persistente.
* Herramientas editoriales de nivel AAA.
* Simulación no determinista difícil de reconciliar con la arquitectura existente.

---

# Fase 4: análisis obligatorio por juego

Para cada juego incluye las siguientes secciones.

## 1. Concepto

* Nombre provisional.
* Género.
* Referencias de diseño, sin copiar propiedad intelectual.
* Plataforma objetivo.
* Orientación de pantalla.
* Duración estimada de una partida.
* Single-player, cooperativo o competitivo.

## 2. Core loop

Describe:

* Acciones principales del jugador.
* Objetivo inmediato.
* Condiciones de éxito.
* Condiciones de derrota.
* Progresión durante la partida.
* Variabilidad entre partidas.
* Posible metaprogresión.

## 3. Encaje con Tiny Aster

Explica:

* Por qué este juego es adecuado para el motor.
* Qué sistemas existentes puede reutilizar.
* Qué juego actual ofrece la base técnica más próxima.
* Qué porcentaje aproximado de infraestructura podría reutilizarse.

No inventes porcentajes precisos. Utiliza rangos razonados, como `40–60 %`, explicando la base de la estimación.

## 4. Features compartidas necesarias

Enumera las funcionalidades que deberían desarrollarse como capacidades reutilizables del motor.

Para cada feature indica:

* Nombre.
* Problema que resuelve.
* Paquete donde debería vivir.
* API pública aproximada.
* Componentes ECS necesarios.
* Sistemas necesarios.
* Eventos emitidos.
* Estado que debe incluirse en snapshots.
* Implicaciones para determinismo.
* Implicaciones para rollback.
* Compatibilidad Canvas.
* Compatibilidad Skia.
* Estrategia de testing.
* Juegos propuestos que reutilizarían la feature.
* Riesgo técnico.
* Dependencias.

Clasifica cada feature como:

* `core`.
* `renderer`.
* `react-native`.
* `network`.
* `server`.
* `shared-gameplay`.
* `game-specific`.
* `tooling`.

## 5. Features específicas del juego

Separa claramente las funcionalidades que no deben incorporarse al motor genérico.

Incluye:

* Reglas.
* Enemigos.
* Patrones.
* Balance.
* Contenido.
* Configuración.
* Prefabs.
* Tablas de progresión.
* Assets.
* Tutorial.
* UI específica.

## 6. Input

Describe:

* Controles táctiles.
* Controles de teclado.
* Compatibilidad con gamepad, si aporta valor.
* Gestos.
* Input buffering.
* Repetición de input.
* Acciones discretas y continuas.
* Cómo se representa el input en la simulación determinista.
* Cómo se serializaría para replay o networking.

## 7. Física y colisiones

Detalla:

* Formas de colisión necesarias.
* Broad phase.
* Narrow phase.
* Triggers.
* Capas o máscaras.
* Resolución de colisiones.
* Continuous collision detection, si es necesaria.
* Gravedad.
* Fricción.
* Rebotes.
* Kinematic bodies.
* Plataformas móviles.
* Riesgos de determinismo entre plataformas.

## 8. IA

Cuando sea aplicable, especifica:

* Máquinas de estados.
* Steering.
* Pathfinding.
* Behavior trees.
* Utility AI.
* Patrones deterministas.
* Presupuestos de actualización.
* Distribución de cálculos entre ticks.
* Semillas de aleatoriedad.

No añadas una arquitectura de IA compleja si una máquina de estados o una tabla de comportamiento es suficiente.

## 9. Renderizado y game feel

Especifica:

* Nuevas primitivas de dibujo.
* Sprites o shapes.
* Tilemaps.
* Capas.
* Cámara.
* Screen shake.
* Hit flash.
* Trails.
* Partículas.
* Texto flotante.
* Transiciones.
* Fondos.
* Parallax.
* Iluminación.
* Efectos que deben ser puramente visuales y no formar parte del estado determinista.

Explica cómo debe implementarse en Canvas y Skia sin contaminar `packages/core`.

## 10. Audio

Incluye:

* Eventos de sonido.
* Priorización.
* Pooling de efectos.
* Música.
* Crossfades.
* Variación de pitch.
* Limitación de voces.
* Eventos deterministas frente a reproducción local.
* Tratamiento durante rollback para evitar sonidos duplicados.

## 11. Persistencia y progresión

Indica:

* Datos persistentes.
* Versionado del save.
* Migraciones.
* Metaprogresión.
* Desbloqueos.
* Estadísticas.
* Configuración.
* Riesgo de corrupción o incompatibilidad.
* Qué debe permanecer fuera del estado ECS de una partida.

## 12. Networking

Determina si el juego necesita:

* Multiplayer autoritativo.
* Lockstep.
* Predicción local.
* Rollback.
* Interpolación.
* Reconciliación.
* Lag compensation.
* Matchmaking.
* Salas.
* Spectators.
* Bots.

No fuerces networking en juegos que no se beneficien de él.

Cuando exista multiplayer, describe:

* Qué simula el cliente.
* Qué simula el servidor.
* Qué inputs se envían.
* Qué estado se replica.
* Frecuencia estimada de snapshots.
* Qué entidades deben tener identificadores estables.
* Riesgos de divergencia.

## 13. Testing

Propón como mínimo:

* Tests unitarios.
* Tests de integración.
* Tests de determinismo.
* Tests snapshot/restore.
* Tests de rollback.
* Tests de pooling.
* Tests de serialización.
* Tests de reglas del juego.
* Tests de renderizado cuando sean necesarios.
* Tests de networking cuando sean necesarios.
* Simulaciones headless de larga duración.
* Pruebas con diferentes frame rates.
* Pruebas cruzadas Canvas/Skia.

Incluye casos límite relevantes.

## 14. Rendimiento

Estima:

* Número típico y máximo de entidades.
* Número de proyectiles.
* Número de colisiones por tick.
* Uso esperado de pooling.
* Necesidad de spatial hashing.
* Riesgo de garbage collection.
* Coste del renderizado.
* Riesgo específico en dispositivos móviles.
* Métricas que deberían monitorizarse.

## 15. Estimación

Asigna valores relativos:

* Complejidad: `baja`, `media`, `alta` o `muy alta`.
* Riesgo técnico: `bajo`, `medio`, `alto`.
* Reutilización del motor: `baja`, `media`, `alta`.
* Valor para el motor: `bajo`, `medio`, `alto`.
* Dependencias.
* Orden recomendado.

No estimes horas ni fechas de calendario salvo que el repositorio contenga información suficiente sobre capacidad y velocidad del equipo.

---

# Fase 5: matriz consolidada de features

Después de analizar los juegos, crea una única matriz que consolide todas las funcionalidades propuestas.

Columnas mínimas:

| Feature | Categoría | Estado actual | Juegos que la necesitan | Paquete recomendado | Dependencias | Determinismo | Rollback | Canvas | Skia | Prioridad | Riesgo |

Agrupa duplicados y evita proponer diferentes implementaciones para el mismo problema.

Por ejemplo, si cuatro juegos necesitan tilemaps, debe existir una única iniciativa de tilemaps con extensiones bien definidas, no cuatro sistemas independientes.

---

# Fase 6: roadmap evolutivo

Diseña un roadmap incremental por fases.

## Fase 0: estabilización

Incluye únicamente correcciones o refactors imprescindibles detectados durante la inspección:

* Deuda técnica crítica.
* APIs inconsistentes.
* Cobertura insuficiente.
* Problemas de boundaries.
* Riesgos de snapshots.
* Problemas de pooling.
* Discrepancias Canvas/Skia.
* Sistemas específicos que deberían generalizarse.

## Fase 1: capacidades fundacionales

Features pequeñas o medianas que desbloqueen varios juegos.

Ejemplos posibles, únicamente si el análisis del repositorio confirma su necesidad:

* Collision layers.
* Máquina de estados genérica.
* Cámara 2D.
* Input actions.
* Animation state.
* Tilemap básico.
* Persistencia versionada.
* Herramientas de determinismo.

## Fase 2: primer juego

Selecciona el juego con mejor relación entre:

* Esfuerzo.
* Riesgo.
* Reutilización.
* Valor arquitectónico.
* Capacidad de validar nuevas features.

Explica por qué debe ser el primero.

## Fases posteriores

Ordena los demás juegos para que cada uno reutilice la infraestructura construida anteriormente.

Para cada fase indica:

* Objetivo.
* Features del motor.
* Juego que las valida.
* Dependencias.
* Riesgos.
* Criterios de salida.
* Tests necesarios.

---

# Fase 7: recomendación final

Termina con:

1. Los **tres juegos más recomendables**.
2. El juego que debería desarrollarse primero.
3. El juego que más ampliaría las capacidades del motor.
4. El juego con menor riesgo.
5. El juego con mayor potencial multijugador.
6. Las cinco features compartidas con mayor retorno.
7. Las tres features que deberían posponerse.
8. Los principales riesgos arquitectónicos.
9. La primera entrega vertical que debería construirse.
10. Una decisión explícita de `GO`, `GO CON CONDICIONES` o `NO GO` para cada juego.

---

# Formato de salida

Entrega el resultado en Markdown utilizando este orden:

1. `Resumen ejecutivo`
2. `Hallazgos del repositorio`
3. `Inventario de capacidades`
4. `Criterios de selección`
5. `Comparativa general de juegos`
6. `Análisis detallado de cada juego`
7. `Matriz consolidada de features`
8. `Arquitectura propuesta`
9. `Roadmap evolutivo`
10. `Estrategia de testing`
11. `Riesgos`
12. `Recomendación final`

La comparativa general debe incluir una tabla como esta:

| Juego | Género | Features nuevas | Reutilización | Complejidad | Riesgo | Valor para el motor | Multiplayer | Orden |
| ----- | ------ | --------------: | ------------- | ----------- | ------ | ------------------- | ----------- | ----: |

---

# Reglas de calidad

* Fundamenta todas las conclusiones en archivos reales del repositorio.
* Cita rutas, módulos, tipos y sistemas concretos.
* Distingue entre capacidad documentada y capacidad implementada.
* No inventes APIs existentes.
* Cuando propongas una API nueva, indícala expresamente como propuesta.
* No conviertas código específico de un juego en una abstracción genérica sin demostrar que será reutilizado.
* Evita abstracciones prematuras.
* Favorece composición mediante componentes y sistemas ECS.
* Mantén la simulación separada de la presentación.
* Mantén los efectos visuales no esenciales fuera de snapshots.
* Identifica cualquier feature que pueda romper el determinismo.
* Identifica cualquier feature que aumente significativamente el tamaño de snapshots.
* Considera las diferencias de rendimiento entre web, iOS y Android.
* Considera limitaciones de Expo y React Native.
* Mantén compatibilidad con TypeScript estricto.
* No reduzcas la propuesta a una lista superficial de géneros.
* No implementes código todavía.
* No modifiques archivos.
* No generes commits.
* No abras pull requests.
* Tu entrega debe ser una propuesta técnica y de producto suficientemente concreta como para convertirse posteriormente en épicas, historias y tareas.

---

# Validación técnica esperada

Toda propuesta futura de implementación debería poder mantener o ampliar estos controles:

```bash
pnpm test
pnpm lint
pnpm typecheck:core
pnpm typecheck:app
pnpm check:core-boundaries
pnpm ci
```

Además, recomienda nuevos quality gates cuando detectes huecos, especialmente para:

* Determinismo.
* Replays.
* Snapshot/restore.
* Rollback.
* Compatibilidad Canvas/Skia.
* Presupuestos de entidades.
* Memoria y pooling.
* Simulaciones headless.
* Compatibilidad multiplataforma.

Comienza inspeccionando el repositorio y presentando evidencia de lo encontrado antes de proponer los juegos.
