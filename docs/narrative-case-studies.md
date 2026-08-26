# Casos de Estudio Narrativo-Gameplay: Campaña Multi-Juego

Este documento detalla los 3 caminos de ejecución ramificados dentro de la campaña Proof-of-Concept (`proofOfConceptStoryGraph`), ilustrando el impacto directo de las acciones del jugador en las mecánicas de juego y el desenlace narrativo.

---

## Caso Estudio A: "Flawless Run" (Victoria Impecable)

### Perfil de Ejecución
El jugador completa los 3 niveles iniciales de **Asteroids** sin morir, desbloqueando el camino heroico. Afronta **Space Invaders** con handicap (sin asistencias adicionales) y logra un puntaje superior a 5,000 puntos, asegurando los refuerzos para la batalla final en **Asteroids Redux**.

### Árbol de Decisiones y Trayectoria
```
[poc_start] ──> [poc_briefing] ──> [poc_act1_prep] (opción: Entrada Agresiva)
                                        │
                                        ▼
                            [poc_act1_asteroids] (0 muertes)
                                        │
                                        ▼
                            [poc_act1_heroic_diag] (`heroicEntry = true`)
                                        │
                                        ▼
                            [poc_transition_si] ──> [poc_act2_prep]
                                                        │
                                                        ▼
                                            [poc_act2_space_invaders] (Score: 6,500)
                                                        │
                                                        ▼
                                            [poc_act2_highscore_diag] (`reinforcementsReceived = true`)
                                                        │
                                                        ▼
                                            [poc_transition_asteroids_redux]
                                                        │
                                                        ▼
                                            [poc_act3_asteroids_redux] (Escudo x1.5)
                                                        │
                                                        ▼
                                            [poc_ending_flawless] ("Flawless Victory")
```

### Matriz de Estado por Hito

| Hito | Node ID | Flags Activos | Variables | Modificadores Aplicados |
|---|---|---|---|---|
| **Inicio Acto 1** | `poc_act1_prep` | ninguna | `asteroidsDeaths: 0` | Configuración base |
| **Fin Acto 1** | `poc_act1_heroic_diag` | `heroicEntry: true` | `asteroidsDeaths: 0` | N/A |
| **Inicio Acto 2** | `poc_act2_space_invaders` | `heroicEntry: true` | `asteroidsDeaths: 0` | `extraLives: 0`, `fireRateMultiplier: 1.0` |
| **Fin Acto 2** | `poc_act2_highscore_diag` | `heroicEntry: true`, `reinforcementsReceived: true` | `spaceinvadersScore: 6500`, `narrativeScore: 100` | N/A |
| **Inicio Acto 3** | `poc_act3_asteroids_redux` | `heroicEntry: true`, `reinforcementsReceived: true` | `spaceinvadersScore: 6500` | `shieldMultiplier: 1.5` |
| **Final** | `poc_ending_flawless` | `heroicEntry: true`, `reinforcementsReceived: true` | `narrativeScore: 100` | N/A |

### Líneas Narrativas Clave
* **AI Odyssey-7 (Heroic):** *"Increíble maniobra. Maniobra limpia en el sector de asteroides sin registrar bajas de integridad."*
* **AI Odyssey-7 (Final):** *"Victoria Impecable. Estación Odyssey salvada con daños mínimos y la flotilla enemiga destruida."*

---

## Caso Estudio B: "Pyrrhic Victory" (Victoria Nula / Pirrórica)

### Perfil de Ejecución
El jugador sufre bajas en **Asteroids** (`asteroidsDeaths >= 1`), por lo que no obtiene el flag heroico (`heroicEntry = false`). En **Space Invaders** recibe asistencias tácticas (`extraLives = 2`, `fireRateMultiplier = 1.3`), logrando superar los 5,000 puntos para activar refuerzos (`reinforcementsReceived = true`). En el acto 3 logra resistir pero con secuelas narrativas de costo elevado.

### Árbol de Decisiones y Trayectoria
```
[poc_start] ──> [poc_briefing] ──> [poc_act1_prep] (opción: Entrada Cauta)
                                        │
                                        ▼
                            [poc_act1_asteroids] (2 muertes)
                                        │
                                        ▼
                            [poc_act1_struggle_diag] (`heroicEntry = false`)
                                        │
                                        ▼
                            [poc_transition_si] ──> [poc_act2_prep]
                                                        │
                                                        ▼
                                            [poc_act2_space_invaders] (Score: 5,500)
                                                        │
                                                        ▼
                                            [poc_act2_highscore_diag] (`reinforcementsReceived = true`)
                                                        │
                                                        ▼
                                            [poc_transition_asteroids_redux]
                                                        │
                                                        ▼
                                            [poc_act3_asteroids_redux] (Escudo x1.5)
                                                        │
                                                        ▼
                                            [poc_ending_pyrrhic] ("Pyrrhic Victory")
```

### Matriz de Estado por Hito

| Hito | Node ID | Flags Activos | Variables | Modificadores Aplicados |
|---|---|---|---|---|
| **Inicio Acto 1** | `poc_act1_prep` | ninguna | `asteroidsDeaths: 0` | Configuración base |
| **Fin Acto 1** | `poc_act1_struggle_diag` | `heroicEntry: false` | `asteroidsDeaths: 2` | N/A |
| **Inicio Acto 2** | `poc_act2_space_invaders` | `heroicEntry: false` | `asteroidsDeaths: 2` | `extraLives: 2`, `fireRateMultiplier: 1.3` |
| **Fin Acto 2** | `poc_act2_highscore_diag` | `heroicEntry: false`, `reinforcementsReceived: true` | `spaceinvadersScore: 5500`, `narrativeScore: 100` | N/A |
| **Inicio Acto 3** | `poc_act3_asteroids_redux` | `heroicEntry: false`, `reinforcementsReceived: true` | `spaceinvadersScore: 5500` | `shieldMultiplier: 1.5` |
| **Final** | `poc_ending_pyrrhic` | `heroicEntry: false`, `reinforcementsReceived: true` | `narrativeScore: 100` | N/A |

### Líneas Narrativas Clave
* **AI Odyssey-7 (Struggle):** *"Navegación crítica. Casco secundario comprometido durante el cruce de asteroides."*
* **Commander Valeria (Final):** *"Sobrevivimos, pero los sistemas de la estación están diezmados. Una victoria amarga."*

---

## Caso Estudio C: "Survival" (Supervivencia Ajustada)

### Perfil de Ejecución
El jugador tiene un rendimiento deficiente en **Asteroids** (`heroicEntry = false`) y obtiene menos de 5,000 puntos en **Space Invaders** (`reinforcementsReceived = false`). Como resultado, entra a **Asteroids Redux** con una penalización de escudo (`shieldMultiplier = 0.8`), apenas logrando completar la campaña en el desenlace de mera supervivencia.

### Árbol de Decisiones y Trayectoria
```
[poc_start] ──> [poc_briefing] ──> [poc_act1_prep] (opción: Entrada Cauta)
                                        │
                                        ▼
                            [poc_act1_asteroids] (1 muerte)
                                        │
                                        ▼
                            [poc_act1_struggle_diag] (`heroicEntry = false`)
                                        │
                                        ▼
                            [poc_transition_si] ──> [poc_act2_prep]
                                                        │
                                                        ▼
                                            [poc_act2_space_invaders] (Score: 3,000)
                                                        │
                                                        ▼
                                            [poc_act2_lowscore_diag] (`reinforcementsReceived = false`)
                                                        │
                                                        ▼
                                            [poc_transition_asteroids_redux]
                                                        │
                                                        ▼
                                            [poc_act3_asteroids_redux] (Escudo x0.8)
                                                        │
                                                        ▼
                                            [poc_ending_survival] ("Bare Survival")
```

### Matriz de Estado por Hito

| Hito | Node ID | Flags Activos | Variables | Modificadores Aplicados |
|---|---|---|---|---|
| **Inicio Acto 1** | `poc_act1_prep` | ninguna | `asteroidsDeaths: 0` | Configuración base |
| **Fin Acto 1** | `poc_act1_struggle_diag` | `heroicEntry: false` | `asteroidsDeaths: 1` | N/A |
| **Inicio Acto 2** | `poc_act2_space_invaders` | `heroicEntry: false` | `asteroidsDeaths: 1` | `extraLives: 2`, `fireRateMultiplier: 1.3` |
| **Fin Acto 2** | `poc_act2_lowscore_diag` | `heroicEntry: false`, `reinforcementsReceived: false` | `spaceinvadersScore: 3000`, `narrativeScore: 50` | N/A |
| **Inicio Acto 3** | `poc_act3_asteroids_redux` | `heroicEntry: false`, `reinforcementsReceived: false` | `spaceinvadersScore: 3000` | `shieldMultiplier: 0.8` |
| **Final** | `poc_ending_survival` | `heroicEntry: false`, `reinforcementsReceived: false` | `narrativeScore: 50` | N/A |

### Líneas Narrativas Clave
* **AI Odyssey-7 (Low Score):** *"Sin respuesta de los refuerzos. Los sensores muestran múltiples interceptores hostiles activos."*
* **AI Odyssey-7 (Final):** *"Sistemas al borde del colapso. Apenas logramos mantener la energía primaria activa."*
