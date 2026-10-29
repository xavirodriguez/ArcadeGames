# Informe — Base del tema sumi-e

**Rama:** `design-system/base-tema-sumi-e`
**Repo:** https://github.com/xavirodriguez/ArcadeGames

## Decisiones
| # | Estado |
|---|--------|
| D1–D3 | [PENDIENTE] (valores propuestos en uso) |
| **D4** | **Cerrado — Opción A** |
| D5 | Confirmado (neón = monospace, sin fuentes nuevas) |

### D4 Opción A
- **display / kanji:** Yuji Boku (OFL-1.1)
- **body es/gl:** Noto Serif JP (OFL-1.1) + system-ui fallback
- **mono:** pila actual

## Parte 1–3
SSOT inkWorld, ratchet literales (en master vía PR #988), allowlist candidata.

## Parte 4
- Contrato + manifiesto + `loadSumiThemeFonts`
- DrawAdapter: tipografía activa; Skia respeta tamaño
- AestheticThemeTokens enlaza sumi tipography si hay semanticTokens
- allowed-kanji.txt + test
- Inventario de migración; **no** se migraron los ~66 ctx.font en este commit
- No se descargaron archivos de fuente (colocar en `assets/fonts/` y subset después)

## No hecho
- Descarga/subset de Yuji Boku y Noto Serif JP
- Migración masiva ctx.font / React Text
- Parte 3 allowlist confirmación formal
