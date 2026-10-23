# Sesión 1 — Auditoría y corrección de defectos de proyección/oclusión

**Branch:** `fix/outrun-session1-projection-occlusion`
**Scope:** Solo defectos verificados de proyección y oclusión. Sin easing, fog, tráfico ni mejoras visuales.

## Tabla H1–H5

| ID | Hipótesis | Etiqueta | Evidencia | Fix |
|----|-----------|----------|-----------|-----|
| H1 | Near-plane `cameraDepth/0.001` produce coordenadas extremas | **Verified** | `RoadProjection.ts` (pre-fix): scale clamp; primer segmento de cada frame con `p1z = -cameraZ ≤ 0` | T1.1 geometric near-plane clip (`NEAR_PLANE = 0.5`) |
| H2 | Oclusión `y2 >= maxy` sin back-face; `y1` unclamped | **Partially verified** | Skip sin actualizar maxy es correcto; falta back-face cull | T1.2 back-face `y2 >= y1` en Canvas y Skia; `maxy = y2` conservado (documentado) |
| H3 | `clip = projY2` incorrecto | **Mostly already solved** | Código real: `clip = maxy` previo (oclusión cercana). Gap: sprites con proyección inválida | T1.3 skip en `iterateOutrunSprites` si `w1 ≤ 0` o coords no finitas |
| H4 | Sin corrección `basePercent` → pop en boundaries | **Verified** | `dx` arrancaba en 0 | T1.4 `dx = -(base.curve * basePercent)` (+ hill análogo) |
| H5 | Paridad palette/fog Canvas vs Skia | **Deferred** | Palette ya compartida vía `resolveOutrunRoadContext`; fog solo en Canvas | Fuera de alcance de esta sesión |

## Decisiones documentadas

1. **Near plane:** clip geométrico por interpolación en camera-space; prohibido epsilon-scale-clamp y segment-skip como sustituto.
2. **`maxy` post-draw:** se mantiene `maxy = p.y2` (comportamiento previo). Jake v3 usaba `p2`, v4 `p1`; fixtures de cresta no exigieron cambiarlo.
3. **Back-face:** `p.y2 >= p.y1 → skip` en ambos renderers; segmento saltado no modifica `maxy`.
4. **RoadSegment contract:** sin cambios.
5. **H5 fog:** deferred (política de sesión).

## Archivos tocados

- `src/games/outrun/rendering/RoadProjection.ts` — T1.1 + T1.4
- `src/games/outrun/rendering/OutrunRenderShared.ts` — T1.3
- `src/games/outrun/rendering/OutrunCanvasVisuals.ts` — T1.2
- `src/games/outrun/rendering/OutrunSkiaVisuals.ts` — T1.2
- `src/games/outrun/__tests__/RoadProjection.test.ts` — fixtures H1/H2/H4 + existentes

## Criterios de done

- [x] Cada fix con tests de regresión (near-plane straddle, continuity sweep, crest finite)
- [x] Determinismo preservado
- [x] Misma geometría compartida; mismos criterios de skip en Canvas/Skia
- [ ] CI verde en el repo (verificar tras push)
