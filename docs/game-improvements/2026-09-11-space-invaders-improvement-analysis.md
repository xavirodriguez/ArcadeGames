# Análisis de mejoras — Space Invaders

**Fecha**: 2026-09-11
**Versión del análisis**: 1
**Juego**: `space-invaders`

---

## 1. Diagnóstico actual

### Qué funciona bien
- **Formación rígida y movimiento de enjambre (Swarm Movement)**: El cálculo coordinado de fronteras y aceleración progresiva de la horda en `SpaceInvadersFormationSystem.ts` según el ratio de invasores restantes funciona de forma fluida y determinista.
- **Diversidad de eventos y variantes dinámicas**: La integración de eventos de ola en `SpaceInvadersGameStateSystem.ts` (`Boss`, `Kamikaze Surge`, `Obstacle`, `Time Modifier`) y el invasor con capacidad de teletransporte (`invader_teleporter`, `TeleporterSystem.ts`) rompen con la monotonía del juego clásico.
- **Sistemas compartidos y Meta-progresión**: Excelente acoplamiento con `LootSystem`, `PowerUpSystem`, `ComboSystem`, `MutatorRegistry` y la captura de `Collectible` (fragmentos de historia) mediante `EventBus`.
- **Doble Renderer (Canvas2D & Skia)**: Soporte completo de paridad visual entre `SpaceInvadersCanvasVisuals.ts` y `SpaceInvadersSkiaVisuals.ts` con drawers modularizados para naves, balas, escudos y efectos.

### Principales debilidades / oportunidades (priorizadas)
1. **Sensación de disparo y Juice limitado en la nave del jugador (Game Feel)**:
   - El disparo del jugador emite proyectiles sin destello de cañón (*muzzle flash*), retroceso visual de la nave (*recoil offset*) ni feedback hSequence dinámico en la cadencia.
   - Las colisiones de balas enemigas con escudos destructibles rompen bloques de forma binaria sin emitir micro-partículas de escombros (*debris*) o deformación de textura en los segmentos adyacentes.
2. **Dinámica de escudos estática e interactividad reducida**:
   - Los búnkeres de escudos (`shield_block`) son meras barreras pasivas. Falta una mecánica de regeneración por sobrecarga, polaridad electromagnética o dispersión de esquirlas reflectantes cuando la nave dispara a través de ellos.
3. **Mecánica de Kamikazes y aviso de amenaza imprevista**:
   - Aunque existen variantes de Kamikaze (`standard`, `splitter`, `trail`), su entrada en picado desde la formación ocurre con una anticipación visual limitada para el jugador en la zona inferior de la pantalla.
4. **Cadencia de tiro rígida y falta de disparo cargado / habilidad activa de apoyo**:
   - La nave del jugador depende exclusivamente de cadencia continua o *Triple Shot* como Power-Up temporal. Falta una habilidad de sobrecarga reactiva integrada (ej. *Overcharge EMP Burst* o barrera temporal de emergencia).
5. **Asignaciones temporales en el Hot Path de disparo de la formación**:
   - En `SpaceInvadersFormationSystem.ts`, la selección de invasores de la columna inferior limpia y llena la estructura `columnShooters` en cada tick de disparo, además de requerir iteraciones sobre mapas que pueden ser optimizadas mediante buffers pre-asignados.

---

## 2. Mejoras concretas (priorizadas)

### 1. Sistema de Disparo Reactivo: Muzzle Flash, Recoil & Heavy Impact
- **Descripción**: Agregar un efecto de retroceso físico/visual (*recoil*) y un destello de cañón (*muzzle flash*) a la nave del jugador al disparar. Al impactar una bala en un invasor, generar un micro-frenado de pantalla (*hit-stop* de 20ms) y una dispersión cónica de chispas en la dirección del proyectil.
- **Impacto esperado**:
  - **Feel**: Excelente (transforma el disparo plano en un arma con peso e impacto táctil).
  - **Depth**: Baja.
- **Dificultad de implementación**: Baja.
- **Archivos / sistemas afectados**:
  - `src/games/space-invaders/systems/SpaceInvadersInputSystem.ts`
  - `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` & `SpaceInvadersSkiaVisuals.ts`
- **Cambios clave / Pseudocódigo**:
```typescript
// En SpaceInvadersInputSystem.ts al emitir disparo
world.mutateComponent(playerEntity, "Render", (render) => {
  render.muzzleFlashFrames = 3;
});
Juice.squash(world, playerEntity, 0.85, 1.15, 80); // Retroceso visual vertical
Juice.offset(world, playerEntity, 0, 3, 60);       // Desplazamiento de recoil +y

// En SpaceInvadersCollisionSystem.ts (onCombatHit para Invader)
Juice.shake(world, 3.5, 120);
world.setResource("GameplayFreeze", { remaining: 0.03 }); // 30ms hit-stop
```

---

### 2. Búnkeres Electromagnéticos Reactivos & Escombros Dinámicos
- **Descripción**: Permitir que los segmentos de escudo destructible emitan chispas y fragmentos cuando son destruidos. Si la nave del jugador dispara a través de un escudo propio, el proyectil adquiere una carga electromagnética de plasma (disparo potenciado que atraviesa 1 invasor adicional pero reduce la durabilidad del escudo en 1 HP).
- **Impacto esperado**:
  - **Depth**: Muy Alto (agrega una decisión táctil: usar los escudos como cobertura o sacrificarlos para potenciar disparos contra la horda).
  - **Feel**: Alto.
- **Dificultad de implementación**: Media.
- **Archivos / sistemas afectados**:
  - `src/games/space-invaders/types/SpaceInvadersTypes.ts` (Componente `ShieldComponent` / `ChargedBullet`)
  - `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`
  - `src/games/space-invaders/EntityFactory.ts`
- **Cambios clave / Pseudocódigo**:
```typescript
// En SpaceInvadersCollisionSystem.ts cuando PlayerBullet colisiona con Shield
if (bulletFaction === "player" && shieldEntity) {
  world.mutateComponent(bulletEntity, "Damage", (dmg) => {
    dmg.amount += 1; // Incrementa daño
    dmg.category = "charged_plasma";
  });
  world.mutateComponent(bulletEntity, "Render", (render) => {
    render.color = "#00FFFF"; // Visual de disparo cargado
  });
  // Reducir HP del escudo y emitir partículas de escombros de plasma
  this.damageShield(world, shieldEntity, destroyedEntities);
}
```

---

### 3. EMP Blast Wave (Habilidad de Emergencia con Cooldown)
- **Descripción**: Introducir una habilidad activa secundaria para el jugador (tecla `E` / Botón Secundario). Al activar el EMP:
  1. Emite una onda de choque concéntrica desde la nave.
  2. Cancela todas las balas enemigas presentes en un radio de 180px.
  3. Paraliza la formación invasora durante 2.0 segundos.
  4. Posee un cooldown de 15 segundos rellenado mediante eliminaciones de enemigos (5 eliminaciones = 100% carga).
- **Impacto esperado**:
  - **Depth**: Alto (proporciona un mecanismo de salvación de emergencia en momentos de saturación de proyectiles).
  - **Retention**: Alto.
- **Dificultad de implementación**: Media.
- **Archivos / sistemas afectados**:
  - `src/games/space-invaders/systems/SpaceInvadersInputSystem.ts`
  - `src/games/space-invaders/types/SpaceInvadersConfigSchema.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` & `SpaceInvadersSkiaVisuals.ts`

---

### 4. Indicadores Dietéticos de Kamikazes y Rayos Laser de Advertencia
- **Descripción**: Cuando un invasor inicia su modo Kamikaze o prepara un disparo de rayo láser (Boss o Commander):
  1. Renderizar una línea de trayectoria proyectada semitransparente con parpadeo rápido hacia la zona de impacto en el suelo.
  2. Mostrar una retícula de peligro en la coordenada inferior correspondiente para dar al jugador la oportunidad de esquivar con precisión.
- **Impacto esperado**:
  - **UX / Polish**: Excelente (elimina muertes imprevistas o injustas por embestidas kamikaze sin aviso).
  - **Feel**: Alto (tensión visual dramática previa al impacto).
- **Dificultad de implementación**: Baja.
- **Archivos / sistemas afectados**:
  - `src/games/space-invaders/systems/KamikazeSystem.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersSkiaVisuals.ts`

---

### 5. Zero-Allocation Hot Path Optimization en Firing & Formation Updates
- **Descripción**: Optimizar `SpaceInvadersFormationSystem.ts`:
  - Reemplazar el `Map<number, { entity: number; y: number }>` instanciado por columna por un array estático pre-asignado `Int32Array` indexado por el número máximo de columnas (`INVADER_MAX_COLS`).
  - Pre-asignar la selección aleatoria de tirador en la columna inferior sin instanciar arreglos intermedios ni llamadas a `Map.values()`.
- **Impacto esperado**:
  - **Technical**: Crítico para asegurar 60/120 FPS constantes en plataformas móviles y prevenir picos de GC en resimulaciones multijugador / rollback.
- **Dificultad de implementación**: Baja.
- **Archivos / sistemas afectados**:
  - `src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts`

---

## 3. Plan de implementación sugerido

1. **Fase 1: Juice Inmediato y Retroalimentación de Disparo (Game Feel)**
   - Agregar *muzzle flash*, retroceso visual (*recoil*) y *hit-stop* al disparar e impactar invasores en `SpaceInvadersInputSystem.ts` y `SpaceInvadersCollisionSystem.ts`.
   - Implementar partículas de escombros de plasma al impactar o degradar escudos.

2. **Fase 2: Profundización de Mecánicas Core (Depth & Táctica)**
   - Implementar la mecánica de disparos cargados al atravesar escudos de cobertura.
   - Diseñar e integrar la habilidad activa *EMP Blast Wave* con recarga por eliminaciones en `SpaceInvadersInputSystem.ts`.

3. **Fase 3: UX & Claridad de Combate (UX & Presentation)**
   - Añadir las líneas de trayectoria proyectada y retículas de advertencia para ataques Kamikaze y láseres de Boss.
   - Actualizar los renderers de Canvas2D y Skia para dibujar las estelas neón y campos electromagnéticos de la habilidad EMP.

4. **Fase 4: Optimización Técnica de Bucle Hot Path (Performance)**
   - Refactorizar `SpaceInvadersFormationSystem.ts` para eliminar la asignación de mapas y cierres en el bucle de tiro.
   - Verificar la tasa de asignación con cero pérdidas de memoria en partidas extensas.

---

## 4. Ideas "wow" / diferenciadoras

1. **Mesa de Gravedad Invertida (Magnetic Swarm Inversion)**:
   - Al activar un mutador especial o alcanzar una racha de combo de x10, el jugador puede invertir la polaridad gravitacional de la pantalla durante 4 segundos.
   - Las balas enemigas en pantalla invierten su rumbo volando hacia arriba y destruyendo a la propia formación invasora en una reacción en cadena espectacular.

2. **Boss con Fases de Destrucción Modular (Destructible Hull Modules)**:
   - Rediseñar el jefe (*Boss*) para que posea 3 módulos independientes destructibles (Ala Izquierda, Cañón Central, Ala Derecha).
   - Destruir las alas deshabilita sus ataques de dispersión lateral y cambia su patrón de movimiento en tiempo real, ofreciendo un combate multicapa interactivo.

3. **Invasores Fantasma en Matriz Neón (Cyber Grid Hack)**:
   - Introducir una ola secreta donde la matriz de la pantalla entra en modo "Glitch Cyberpunk", volviendo transparentes a los invasores salvo cuando son iluminados por un escáner de luz proyectado desde la nave del jugador.

---

## 5. Notas técnicas / riesgos

- **Determinismo y Rollback Netcode**:
  - La habilidad *EMP Blast Wave*, la selección de tiradores en la formación y el cálculo del cooldown rellenado por eliminaciones **deben obligatoriamente** utilizar `world.gameplayRandom` o el estado sincrónico de componentes ECS.
  - No usar `Math.random()` ni temporadores basados en el reloj del sistema (`Date.now()`).
- **Boundaries de Arquitectura**:
  - Ninguna clase dentro de `src/games/space-invaders/` puede importar librerías externas de renderizado directamente fuera de las capas de abstracción `Renderer` / `Canvas` / `Skia`, ni invocar componentes React/Expo.
- **Rendimiento y Zero-Allocation**:
  - Mantener la prohibición de usar `.map()`, `.filter()`, arreglos dinámicos `[]` u objetos `{}` dentro del método `update()` de `SpaceInvadersFormationSystem.ts`, `SpaceInvadersCollisionSystem.ts` y `KamikazeSystem.ts`.
