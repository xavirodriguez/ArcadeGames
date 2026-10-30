# Tipografía — inventario de migración (Parte 4.5)

## D4 cerrado — Opción A
- display / kanji: **Yuji Boku**
- body (es/gl): **Noto Serif JP** (+ system-ui fallback)
- mono: pila actual (Share Tech Mono / monospace)

## Ya hecho
- `ThemeTypography.ts` + manifiesto `SUMI_FONT_MANIFEST`
- `loadSumiThemeFonts` (fallback a neón, sin throw)
- DrawAdapter Canvas/Skia leen tipografía activa / respetan fontSize
- `AestheticThemeTokens` usa SUMI tipography cuando hay semanticTokens
- Test: cadena neón `bold {n}px monospace` invariante

## ctx.font (~66) — pendiente migración incremental
Prioridad sumi-e:
1. `src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts`
2. shared drawers que pintan HUD

Resto de juegos: dejar hasta que activen tema sumi-e.

## Skia.Font
- Outrun / TowerDefense: migrar a presentation painter o helper con size
- SkiaPresentationPainter: ya tiene resolveFont

## React Text
Solo juegos con tema sumi-e activo. Listar en PR de migración por juego.

## Aceptación final
`grep -rn monospace src/games packages` → solo definición de respaldo + tests.
