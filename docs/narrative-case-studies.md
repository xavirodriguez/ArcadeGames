# Casos de Estudio Narrativos: Campaña Multi-Juego Proof-of-Concept

Este documento detalla las 3 rutas principales de ejecución en el grafo narrativo de la campaña Proof-of-Concept (`proofOfConceptStoryGraph`), demostrando la propagación de banderas, variables, modificadores mecánicos y finales diferenciados.

---

## Caso A: "Flawless Run" (Victoria Impecable)

### Descripción General
El jugador demuestra un rendimiento perfecto en el Acto 1 (Asteroids) sin perder vidas y supera el umbral de 5000 puntos en el Acto 2 (Space Invaders).

### Árbol de Decisiones y Trayectoria
```
[start_node]
   ↓
[act1_asteroids_gameplay] (Sin muertes, 3 oleadas completadas)
   ↓
[eval_act1_performance] → Setea `asteroidsPerfect = true` & `heroicEntry = true`
   ↓
[branch_heroic_entry] ("Maniobra limpia. Escudos al máximo rendimiento.")
   ↓
[cutscene_trans_to_spaceinvaders]
   ↓
[act2_spaceinvaders_gameplay] (Modificadores: `extraLives = 0`, `fireRateMultiplier = 1.0`. Score: 6200 pts)
   ↓
[eval_act2_performance] → Setea `reinforcementsReceived = true`
   ↓
[branch_reinforcements_success] ("Puntuación de combate alta. Cargamento desplegado.")
   ↓
[act3_asteroids_redux_gameplay] (Modificadores: `shieldMultiplier = 1.5`, munición extra)
   ↓
[final_evaluation_branch] → Condición `all: [heroicEntry, reinforcementsReceived]` = true
   ↓
[ending_flawless] ("Flawless Victory: La estación está a salvo y la leyenda perdura.")
```

### Matriz de Estado por Hito

| Hito | Flags Activos | Variables | Modificadores Aplicados |
|------|---------------|-----------|------------------------|
| Fin Acto 1 | `asteroidsPerfect: true`, `heroicEntry: true` | `asteroidLevelReached: 2` | `navigationAssist: false` |
| Fin Acto 2 | `heroicEntry: true`, `reinforcementsReceived: true` | `spaceinvadersScore: 6200`, `narrativeScore: 100` | `extraLives: 0`, `fireRateMultiplier: 1.0` |
| Fin Acto 3 | `heroicEntry: true`, `reinforcementsReceived: true` | `narrativeScore: 300` | `shieldMultiplier: 1.5` |

---

## Caso B: "Pyrrhic Victory" (Victoria Pírrica)

### Descripción General
El jugador sufre bajas en el Acto 1 (`heroicEntry = false`), pero logra recuperarse en el Acto 2 obteniendo más de 5000 puntos (`reinforcementsReceived = true`), o viceversa.

### Árbol de Decisiones y Trayectoria
```
[start_node]
   ↓
[act1_asteroids_gameplay] (Con muertes / lucha)
   ↓
[eval_act1_performance] → Setea `asteroidsStruggle = true` & `heroicEntry = false`
   ↓
[branch_struggling_entry] ("Impactos confirmados. Activando protocolo de asistencia.")
   ↓
[cutscene_trans_to_spaceinvaders]
   ↓
[act2_spaceinvaders_gameplay] (Modificadores: `extraLives = 2`, `fireRateMultiplier = 1.3`. Score: 5400 pts)
   ↓
[eval_act2_performance] → Setea `reinforcementsReceived = true`
   ↓
[branch_reinforcements_success]
   ↓
[act3_asteroids_redux_gameplay] (Modificadores: `shieldMultiplier = 1.5`)
   ↓
[final_evaluation_branch] → Condición `any: [heroicEntry, reinforcementsReceived]` = true
   ↓
[ending_pyrrhic] ("Pyrrhic Victory: Sobreviviste, pero a un costo devastador.")
```

### Matriz de Estado por Hito

| Hito | Flags Activos | Variables | Modificadores Aplicados |
|------|---------------|-----------|------------------------|
| Fin Acto 1 | `asteroidsStruggle: true`, `heroicEntry: false` | `asteroidLevelReached: 2` | `navigationAssist: true`, `shieldMultiplier: 1.2` |
| Fin Acto 2 | `heroicEntry: false`, `reinforcementsReceived: true` | `spaceinvadersScore: 5400`, `narrativeScore: 100` | `extraLives: 2`, `fireRateMultiplier: 1.3` |
| Fin Acto 3 | `heroicEntry: false`, `reinforcementsReceived: true` | `narrativeScore: 250` | `shieldMultiplier: 1.5` |

---

## Caso C: "Survival" (Supervivencia Ajustada)

### Descripción General
El jugador sufre daños en el Acto 1 (`heroicEntry = false`) y no logra superar el umbral de 5000 puntos en Space Invaders (`reinforcementsReceived = false`).

### Árbol de Decisiones y Trayectoria
```
[start_node]
   ↓
[act1_asteroids_gameplay] (Supervivencia mínima)
   ↓
[eval_act1_performance] → Setea `heroicEntry = false`
   ↓
[branch_struggling_entry]
   ↓
[cutscene_trans_to_spaceinvaders]
   ↓
[act2_spaceinvaders_gameplay] (Score: 3100 pts < 5000)
   ↓
[eval_act2_performance] → Setea `reinforcementsReceived = false`
   ↓
[branch_reinforcements_failed] ("Línea de suministros comprometida.")
   ↓
[act3_asteroids_redux_gameplay] (Modificadores penalizados: `shieldMultiplier = 0.8`)
   ↓
[final_evaluation_branch] → Ninguna condición cumplida (fallback a prioridad 0)
   ↓
[ending_survival] ("Survival: Apenas lo logramos. Los recursos están prácticamente agotados.")
```

### Matriz de Estado por Hito

| Hito | Flags Activos | Variables | Modificadores Aplicados |
|------|---------------|-----------|------------------------|
| Fin Acto 1 | `heroicEntry: false` | `asteroidLevelReached: 2` | `navigationAssist: true` |
| Fin Acto 2 | `heroicEntry: false`, `reinforcementsReceived: false` | `spaceinvadersScore: 3100`, `narrativeScore: 50` | `extraLives: 2`, `fireRateMultiplier: 1.3` |
| Fin Acto 3 | `heroicEntry: false`, `reinforcementsReceived: false` | `narrativeScore: 100` | `shieldMultiplier: 0.8` |
