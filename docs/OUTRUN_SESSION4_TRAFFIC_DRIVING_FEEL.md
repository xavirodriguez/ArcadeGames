# Sesión 4 — Tráfico y driving feel

**Branch:** `feat/outrun-session4-traffic-driving-feel`
**Base:** `master` (simulación; no depende de render/fog)

## T4.1 — Auditoría

| Hallazgo | Evidencia | Etiqueta |
|----------|-----------|----------|
| Rivales no cambian `lateralX` | `TrafficSystem` solo escribe `z` | **Verified** — raíles fijos |
| Rival rápido + lento mismo carril | Sin steering ni colisión racer–racer | **Verified** — atraviesan / apilan |
| Colisión jugador usa `\|dz\| < segLen*0.6` | collisionZ / collisionX | **Verified** |
| Wraparound ±trackLength/2 | Bucles while | **Verified** |
| Cresta oculta no afecta sim | Oclusión solo render | **Not a sim defect** |
| Tunneling a maxSpeed@60fps | `maxSpeed*dt = 200 > collisionZ=120` | **Verified** |

## T4.2 — Lookahead de steering

- Lookahead: `trafficLookaheadSegments * segmentLength` (default 20×200)
- Amenaza: delante, solape ≤ avoidRadius, no más rápido; incluye jugador
- Dirección: más espacio en [-1,1]; intensidad ∝ cercanía
- Coste O(n²) con n≈8; determinista

## T4.3 — Centrífuga

Fórmula **sin cambio**: `-(curve * centrifugalForce * speedRatio² * dt)`. Tests de signo y magnitud.

## T4.4 — Invariante de avance

`maxSpeed/60 = 200 > collisionZ 120` → substeps de colisión (default 4), **no** cap de velocidad.

## Config nuevos

| Clave | Default |
|-------|--------|
| trafficLookaheadSegments | 20 |
| trafficAvoidRadius | 0.35 |
| trafficSteerSpeed | 1.5 |
| trafficCollisionSubsteps | 4 |

## No tocado

Proyección, renderers, paletas, fog, generación de pista.
