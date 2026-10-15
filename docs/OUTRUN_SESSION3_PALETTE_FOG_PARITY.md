# Sesión 3 — Paridad Canvas/Skia: paletas y fog

**Branch:** `feat/outrun-session3-palette-fog-parity`  
**Base:** `feat/outrun-session2-eased-stretch-builder` (incluye Sesión 1 H4 + Sesión 2 stretch)

## T3.1 — Auditoría

### Paleta

| Elemento | Canvas (antes) | Skia (antes) | ¿Difiere? | Después |
|----------|----------------|--------------|-----------|---------|
| Cielo / sol / nubes | `resolveOutrunRoadContext` → `getScenarioPaletteAtZ` + `applyDayPhase` | igual | **No** | Sin cambio (ya unificado) |
| Horizonte / montañas | misma `palette` | igual | **No** | Sin cambio |
| Césped / rumble / road / lane | `rumbleColor` / `roadColor` + `palette` | igual | **No** | Sin cambio |
| Imports muertos | `COAST_PALETTE`, `getScenarioPaletteAtZ` no usados en drawer | igual | n/a | Eliminados |
| H5 sesión 1 (“Canvas fija COAST”) | **Obsoleta** | — | — | Ambos ya usan contexto compartido |

### Fog

| Aspecto | Canvas (antes) | Skia (antes) | Después (compartido) |
|---------|----------------|--------------|----------------------|
| Entrada | `p.fog` = `i/maxProject` | no usaba | misma entrada del buffer |
| Curva | umbral duro `> 0.4`, linear remap a α≤0.8 | — | **smoothstep**, sin umbral, α≤0.55 |
| Color | hardcode `rgba(135,206,235,…)` | — | far **sky-band token** de la paleta activa |
| Capas | solo franja de carretera (~1.2×w) | — | **strip completo** (grass+rumble+road, `screenW`) |
| Sprites / horizonte | sin fog | sin fog | sin fog (**intencional**) |

## T3.2 — Decisión de paleta

**Correcto = paleta por escenario** (`getScenarioPaletteAtZ` + `applyDayPhase`), alineado con OUTRUN_ART.md §2 (tokens por escenario, cero colores fuera de tokens).  
La hipótesis H5 de “Canvas fijo” ya no aplica: ambos drawers consumen `resolveOutrunRoadContext`.

## T3.3 — Decisión de fog

| Opción | Motivo |
|--------|--------|
| No copiar fog exponencial verde de javascript-racer | OUTRUN_ART prioriza tokens de escenario 2049, no el look arcade 80s hardcodeado |
| smoothstep vs umbral 0.4 | evita salto visual; near-road permanece legible |
| maxAlpha 0.55 | cue de profundidad sin blanquear la pista lejana |
| Color = última sky-band | respeta tokens; cambia con coast/desert/mountain automáticamente |
| Capas = strip de segmento | misma decisión en Canvas y Skia; sprites sin fog para silueta |

Fuente única: `resolveSegmentFog(distanceFog, palette)` en `OutrunPalettes.ts`.

## Residuales intencionales

- Rasterización Canvas vs Skia (AA, gamma) — no pixel-perfect.
- Sprites y horizonte sin fog — legibilidad; puede revisarse en sesión posterior.
- `p.fog` sigue siendo lineal en el buffer; solo la **curva de intensidad** es shared.

## Archivos

- `OutrunPalettes.ts` — `smoothstep`, `fogIntensity`, `hexToRgb`, `resolveSegmentFog`
- `OutrunCanvasVisuals.ts` — usa shared fog; imports muertos fuera
- `OutrunSkiaVisuals.ts` — añade shared fog
- `__tests__/OutrunFog.test.ts`
- este informe

## No tocado

Generación de pista, easing, proyección geométrica, tráfico, parallax, oclusión.
