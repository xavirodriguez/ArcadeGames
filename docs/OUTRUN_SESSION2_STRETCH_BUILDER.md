# Sesión 2 — Stretch builder con easing

**Branch:** `feat/outrun-session2-eased-stretch-builder`  
**Base:** `fix/outrun-session1-projection-occlusion` (incluye fix H4 `basePercent`)

## Prerequisito H4

| Estado | Detalle |
|--------|---------|
| H4 en master | **Not present** (master aún sin fix de sesión 1) |
| H4 en rama sesión 1 | **Verified + corregido** (`dx/dy = -(base * basePercent)`) |
| Decisión | Continuar sobre la rama de sesión 1 para no amplificar el pop lateral |

## Qué se migró

| Sección | Antes | Después |
|---------|-------|---------|
| Curva fija `+2` (30 segs) | `add(30, 2, 0)` | `addStretch({ enter:8, hold:14, leave:8, curve:2 })` |
| Curva `-3` + hill | `add(35, -3, -1)` | eased curve; hill constante |
| Curvas `±4` | abruptas | eased 5/10/5 |
| Curva `+2` + hill `-2` | abrupta | eased curve; hill constante |
| **4 tramos aleatorios** | `add(len, curve, hill)` constante | enter/hold/leave ~25/50/25 % |
| Rectas / hills puros | `add(...)` | **sin cambio** (abruptos legítimos) |

## Helper

- `src/games/outrun/rendering/RoadStretch.ts` — puro, sin estado
- Enter: `easeIn` (t²) — alineado con Jake
- Leave: `easeInOut` coseno — alineado con Jake
- Valores horneados en `RoadSegment.curve` / `.hill` al generar

## Elevación (T2.1c)

**Diferida.** Hills en tramos migrados siguen siendo **constantes** por segmento (`easeHill` no activado). Motivo: el modelo `dy += hill` acumula deriva; un easing de hill sin emparejar ascenso/descenso cambiaría la altura neta del tramo de forma no obvia. Requiere fixtures de perfil dedicados en una sesión posterior; no se cambia a alturas absolutas.

## API

- `add(count, curve, hill)` — tramos abruptos (rectas, plateaus, hills puros)
- `addStretch(StretchDescriptor)` — curvas con enter/hold/leave

## Tests

- `RoadStretch.test.ts` — endpoints, monotonía, continuidad de uniones, enter/leave = 0, signos
- Determinismo de pista: misma semilla → mismos `curve` por índice

## No tocado

Proyección, renderers, tráfico, fog, parallax, contrato `RoadSegment`.
