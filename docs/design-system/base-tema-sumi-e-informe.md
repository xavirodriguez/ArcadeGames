# Informe — Base del tema sumi-e

**Rama:** `design-system/base-tema-sumi-e` (un solo commit)
**Repo:** https://github.com/xavirodriguez/ArcadeGames
**Decisiones D1–D4:** [PENDIENTE]

## Parte 1 — Auditoria
drawText Skia ignora `_fontSize`. Contrastes y deltaE00 medidos.

## Parte 2 — SSOT provisional
`inkWorldPalette.ts` como SSOT (tonos D1 propuestos, regla contorno sumi para oro/energyBlue).
Diferencias vs paletas vivas documentadas; no se migraron hex con deltaE00 >= 3.

## Parte 3 — Contencion del neon
- `scripts/color-literals-ratchet.mjs` + baseline (557).
- `pnpm run check:color-literals` / `colors:update-baseline`; enganchado a `ci`.
- Allowlist candidata pendiente de confirmacion.

## No hecho
Parte 4 (tipografia). No se cambiaron hex en pantalla.
