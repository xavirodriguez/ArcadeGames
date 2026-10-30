# Tower Defense — Minijuego ECS Determinista

Minijuego de Tower Defense construido sobre la arquitectura ECS determinista de `@tiny-aster/core` y `@tiny-aster/gameplay-kit`.

## Dirección de Arte
- **Especificación Sumi-E**: [Dirección de Arte — Tower Defense (tinta sumi-e)](../../docs/tower-defense/ART_DIRECTION_SUMI_E.md)

## Arquitectura y Convenciones

### 1. Unidades de Tiempo
- **Convención del motor**: Todas las variables de tiempo recibidas por los sistemas en `update(world, dt)` están expresadas estrictamente en **SEGUNDOS** (`dt = 1/60` s = ~0.016667 s).
- Configuración (`config/tower-defense.json`): Los intervalos de spawn y cooldowns están definidos en segundos, y las duraciones en milisegundos se convierten explícitamente multiplicando por `1000` únicamente donde sea necesario.

### 2. Mapa y Waypoints
- El mapa se define mediante `LEVEL_LAYOUT` en `config/tower-defense.json` (16 columnas x 12 filas, tamaño de celda 40px).
- Leyenda del mapa:
  - `S`: Spawn de creeps.
  - `E`: Base del jugador.
  - `P`: Camino transitable por creeps.
  - `B`: Celda donde se pueden construir torres.
  - `X`: Muro / bloque inaccesible.
- Pathfinding: `extractWaypoints` realiza una búsqueda BFS determinista desde `S` hasta `E` garantizando un camino continuo y ordenado. Si la distribución carece de camino válido, el juego arroja una excepción explícita indicando la falla.

### 2.1 Proyección isométrica y coordenadas

- `projection` admite `isometric` y `topdown`; el modo predeterminado del juego es `isometric`. `ISO_TILE_RATIO` controla la relación entre los semiejes del rombo.
- `worldToIso` y `isoToWorld` son transformaciones inversas para posiciones. La simulación ECS, waypoints, alcance, movimiento, colisiones y targeting permanecen en coordenadas cartesianas de mundo.
- En modo isométrico, `createIsoConfig` obtiene una escala uniforme a partir de los límites de ancho y alto del viewport. La proyección mantiene `ISO_TILE_RATIO`, encaja los cuatro vértices exteriores del grid dentro de `worldWidth × worldHeight` y centra su caja. En modo top-down, conserva el tamaño `CELL_SIZE` y los offsets del grid.
- El ajuste afecta exclusivamente a la transformación de presentación. No cambia `CELL_SIZE`, las coordenadas ECS ni la geometría lógica usada por movimiento, colisiones o pathfinding.
- La entrada táctil y de puntero comprueba la geometría de los rombos proyectados. En vértices compartidos, el desempate es estable: primero la menor suma `row + col`, después `row` y `col`.
- El cursor ECS transporta el centro de celda en coordenadas de mundo. Los drawers proyectan esa posición una sola vez; no deben aplicar una segunda inversión.
- Torres, creeps y proyectiles comparten `resolveEntityIsometricOffset`: usa `Transform.worldX/worldY` (con fallback a `x/y`), entrega el mismo anclaje proyectado a Canvas y Skia y mantiene intacto el componente `Transform`.
- La orientación de torretas y las estelas de proyectiles proyectan vectores mediante `projectVector`; no deben calcular ángulos con coordenadas locales ni duplicar la matriz isométrica en cada backend.
- El orden de profundidad usa `worldX + worldY` únicamente en `Render.order`; nunca reescribe la posición de gameplay.
- Los círculos de alcance del gameplay conservan el radio euclídeo del mundo. La previsualización lo transforma en una elipse exacta para representar el mismo conjunto de puntos después de la proyección.
- `TowerDefenseIsoDepthSortSystem` solo modifica `Render.order` en modo isométrico usando `worldX + worldY`. No escribe en `Transform` ni modifica la simulación.
- Los drawers de entidades y VFX aplican la proyección solo en presentación. Canvas y Skia comparten las mismas coordenadas, composición de capas y contrato de entrada.
- El mapa se registra como efecto de fondo; los VFX se registran como efectos de primer plano y se dibujan después de las entidades.

### 3. Sistemas y Fases ECS
Los sistemas ejecutan la simulación organizados en las siguientes fases:

1. **Phase: Input**
   - `BuildSystem`: Procesa comandos de selección de celda, construcción, venta y mejora de torres basados en la posición del cursor y fondos disponibles.
2. **Phase: Simulation**
   - `CreepMovementSystem`: Dueño único de la posición de los creeps a lo largo de la lista de waypoints. Desactiva la velocidad adicional en `MovementSystem` para evitar doble integración.
   - `TowerTargetingSystem`: Bloquea objetivos deterministas (creeps dentro de rango más avanzados en el camino).
   - `TowerFiringSystem`: Dispara proyectiles respetando la cadencia de fuego utilizando `world.commands.spawnFromBlueprint`.
   - `ProjectileHomingSystem`: Dirige la velocidad del proyectil hacia su objetivo bloqueado.
   - `MovementSystem`: Integra la velocidad de proyectiles a su posición (`PhysicsIntegrateSystem`).
   - `HierarchySystem`: Sincroniza las coordenadas jerárquicas del mundo (`worldX`, `worldY`).
   - `TTLSystem`: Destruye proyectiles caducados.
   - `BoundarySystem`: Elimina entidades fuera de los límites.
   - `WaveSpawnSystem`: Controla el estado serializable del director de oleadas (`SpawnDirectorComponent`).
3. **Phase: Collision**
   - `CollisionSystem2D`: Broadphase (Sweep & Prune) y narrowphase para detectar impactos de proyectiles sobre creeps.
   - `CombatSystem`: Aplica daño, verifica facciones ("player" vs "enemy"), gestiona la vida (`Health`) y marca entidades destruidas.
4. **Phase: GameRules**
   - `CreepDeathSystem`: Procesa la muerte de los creeps (`combat:death` y `Health <= 0`), garantizando la emisión única del evento `creep:killed` mediante un registro interno `killedEntities`.
   - `SlowOnHitSystem`: Aplica la ralentización al recibir impactos de torres heladas.
   - `GameStateSystem`: Gestiona oro, puntuación, vidas restantes, fase de juego (`build`, `wave`, `intermission`, `game_over`, `victory`) y desbloqueo de siguientes oleadas.
5. **Phase: Presentation**
   - `JuiceSystem`, `RenderUpdateSystem`, `TowerDefenseAudioSystem`, `ThreatHudSystem` y `TowerDefenseVfxSystem`.
   - `TowerDefenseVfxSystem` gestiona únicamente efectos visuales efímeros (impactos, desintegración, recompensas flotantes y avisos de oleada/fin de partida); omite la simulación de efectos durante rollback y no altera daño, movimiento ni colisiones.

### 4. Controles e Interfaz
- **Controles táctiles y puntero**: Tocar cualquier celda del mapa proyecta las coordenadas del canvas al mundo determinando la celda objetivo (`touchToCellCoords`).
- **Botones de acción**: Botones para seleccionar tipo de torre (`Basic`, `Sniper`, `Rapid`, `Frost`), construir (`CONSTRUIR`), mejorar (`MEJORAR`), vender (`VENDER`) e iniciar la oleada (`OLEADA ▶`).
- **Atajos de teclado (Web)**:
  - `1`, `2`, `3`, `4`: Seleccionar tipo de torre.
  - `B`: Construir torre.
  - `X`: Vender torre.
  - `U`: Mejorar torre.
  - `Espacio`: Iniciar oleada.
  - `R` / `Enter`: Reiniciar partida en pantalla de Game Over / Victoria.

### 5. Determinismo y Red
- **Randomness**: Todos los cálculos aleatorios utilizan `world.gameplayRandom`.
- **Mutaciones Estructurales**: Creación y eliminación de entidades dentro de sistemas en simulación utilizan de manera estricta `world.commands` o blueprints.
