# Tower Defense — Minijuego ECS Determinista

Minijuego de Tower Defense construido sobre la arquitectura ECS determinista de `@tiny-aster/core` y `@tiny-aster/gameplay-kit`.

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
   - `JuiceSystem`, `RenderUpdateSystem`, `TowerDefenseAudioSystem`, `ThreatHudSystem`.

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
