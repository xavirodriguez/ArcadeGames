# Samurai painted — candidato de atlas

**Estado:** candidato técnico · **no aprobado** · **no cableado** · **licencia desconocida**
**Juego:** `hitandrun` · **Tema propuesto:** sin decidir (ver §3)
**Fecha:** 2026-10-25
**Salida:** `src/games/hitandrun/assets/candidates/samurai-painted/samurai-painted.png`
**Entrada:** `assets/sprites/samurai1.png`

Este paquete convierte una hoja de key poses suelta en un atlas `512×320` compatible con el
contrato actual de `hitandrun`, y documenta todo lo que impide tratarlo como arte final. No es
un asset aprobado, no está integrado en el juego y no debe moverse a `themes/` hasta que se
decida su dirección artística y se aclare la licencia.

---

## 1. Qué hay y qué no hay

| Hay | No hay |
| --- | --- |
| Atlas `512×320`, grid `8×5`, celdas `64×64`, 40 frames. | Aprobación visual del usuario. |
| `atlas.json`, `animations.json`, `frames.json` con inventario de la fuente. | Revisión in-engine (Canvas 800×600 ni Skia). |
| Contact sheet, hoja de legibilidad y mock de contexto sintético. | Licencia, autoría, prompt ni herramienta de origen de la hoja. |
| QA genérico (tamaño/alpha) y QA Sumi-e (paleta/safe area). | Paleta de 8 swatches, alpha suave de pincel ni VFX separables. |
| Mapa de frames con holds y reutilizaciones documentadas. | Suficientes poses distintas para `8/8/8/6/8`. |

---

## 2. Fuente

| Campo | Valor |
| --- | --- |
| Ruta | `assets/sprites/samurai1.png` |
| Tamaño | `1408×768`, PNG-32 RGBA, 973 782 B |
| SHA-256 | `58a7c377d299e198f80d50eeeb763867036bed796f9af2aecfdcb76eff422804` |
| Trackeada | Commit `b3e08872` (`sprites`) |
| Fondo | Transparente real; no hay checkerboard que recortar. |
| Estructura | 5 filas con `6 / 9 / 8 / 8 / 9` segmentos = 40 poses. |
| Contenido | Idle, carrera, ataque/recoil, daño y muerte; sangre horneada y VFX de tajo fusionado al cuerpo en varias poses. |
| Facing | Mixto. Las filas de ataque, daño y muerte miran a la izquierda y se espejan al atlas. |
| Autoría / licencia | **Desconocidas.** No aprobar ni publicar sin resolverlo. |

La hoja es un set de key poses, no un atlas: los frames no comparten escala, baseline ni
separación, y algunos están unidos por el arco del tajo. El inventario completo (bbox, uso y
segmentos descartados) está en `samurai-painted.frames.json`.

---

## 3. Veredicto de estilo

La hoja es **pintura digital steel-blue con lectura ukiyo-e**, no Sumi-e:

- Miles de swatches, degradados metálicos y sangre saturada. El contrato Sumi-e exige ≤ 8
  colores RGB, sin negro/blanco puros y con alpha de pincel; este atlas no lo cumple ni de cerca.
- La paleta se acerca mucho más al tema **fantasy** por defecto
  (`playerArmor #4a5568`, `playerCape #2b6cb0`, `blood #9b1c1c` en
  `src/games/hitandrun/rendering/theme/`).
- **No fusionar con `docs/hitandrun/sumi-e/`** ni registrar como piloto Sumi-e. Si se adopta,
  debe ser como variante pintada del tema fantasy (o como base de un tercer tema), con su
  propia ficha de estilo.

Cuantizar a 8 o 12 colores se probó y destruye la legibilidad del rostro, la armadura y el
tajo. El atlas se conserva a color completo a propósito.

---

## 4. Contrato técnico (compatible, por construcción)

| Propiedad | Valor |
| --- | --- |
| Dimensiones | `512×320` |
| Grid | `8 columnas × 5 filas` |
| Celda | `64×64` |
| Frames | 40 (2 vacías: 30–31) |
| Anchor | `(0.5, 0.94)` — pies en `y = 60` |
| Facing | Derecha; ataque/daño/muerte espejados desde la fuente |
| Formato | PNG-32 RGBA8888, alpha recto (no premultiplicado) |
| Fondo | Transparente, sin fondo horneado |
| Escala | `0.40` uniforme sobre la fuente (140 px → 56 px de alto) |
| Baseline | Compartida; torso centrado por frame |
| Filtrado | Lineal (recomendado por el contrato existente) |

Rangos de frame (idénticos a `SamuraiVisualAssets.ts`):

```text
idle 0–7   walk 8–15   attack 16–23   hurt 24–29   empty 30–31   death 32–39
```

---

## 5. Frame map

La fuente no tiene 8 poses de idle, 8 de walk, 8 de attack, 6 de hurt y 8 de death. Para no
romper el contrato se mantiene la forma `8/8/8/6/8` y se rellenan los huecos con **holds
dentro del clip** y **reutilización entre clips**, ambos marcados en los JSON (`hold_of` y
`duplicate_of`).

| Clip | Celdas | Fuente | Notas |
| --- | --- | --- | --- |
| `idle` | 0–7 | R1F0–R1F5 | 6 poses; celdas 6–7 sostienen F4 y F5. |
| `walk` | 8–15 | R2F0–R2F7 | 8 poses reales; R2F8 se descarta. |
| `attack` | 16–23 | R3F0, F1, F2, F3, F3, F4, F6, F6 | Espejado. F3 sostenido una vez; F6 repetido al final. |
| `hurt` | 24–29 | R4F5, R4F4, R3F5, R5F4, R3F7, R3F6 | Espejado. Mezcla filas de daño y ataque. |
| `empty` | 30–31 | — | Vacías por contrato. |
| `death` | 32–39 | R5F4, F5, F6, F7 ×5 | Espejado. F7 sostenido 4 frames; celda 32 reusa la pose de `hurt` 27. |

**Consecuencia:** `idle`, `attack` y `death` contienen holds visibles; `hurt` y `death`
comparten una pose. Es un atlas jugable y compatible, no una animación limpia de 40 poses.

Detalle por celda en `samurai-painted.frames.json`; ritmo y loops en
`samurai-painted.animations.json`.

---

## 6. QA

Medido con `build_atlas.py` (`build-report.json`) y los auditores existentes
(`qa-generic.json`, `qa-sumi-e.txt`).

| Check | Resultado | Fuente |
| --- | --- | --- |
| `512×320`, grid `8×5`, celda `64` | **PASS** | build report / QA genérico |
| PNG-32 con alpha continuo | **PASS** — 256 niveles (ramp 4–255 en el auditor) | build report / QA Sumi-e |
| Fondo transparente | **PASS** — 112 892 px transparentes | build report |
| Anchor y baseline | **PASS** — pies en `y = 60` | build report |
| Facing derecho | **PASS** | build report |
| Paleta ≤ 8 swatches | **FAIL** — 17 427 swatches opacos / 21 863 RGB | QA Sumi-e |
| Sin negro/blanco puros | **FAIL** — 2 403 px puros (32 opacos negros; 0 blancos) | QA Sumi-e / build report |
| Safe area 2 px | **FAIL** en celdas 18–21 (arco del tajo y punta de espada); el cuerpo sí entra | build report / QA Sumi-e |
| Presupuesto de archivo | **FAIL** — 139 337 B (136,1 KiB) vs 120 KB | build report |
| Acento ≤ 5 % | **N/A** — el auditor mide la paleta Sumi-e, no aplica aquí | QA Sumi-e |

Previews:

- [`contact-sheet.png`](./contact-sheet.png) — 40 celdas etiquetadas, zoom 3×.
- [`readability.png`](./readability.png) — papel / tinta / gris 50 % a 2× y tira 1:1.
- [`context-mock.png`](./context-mock.png) — mock sintético `800×600` a 1:1, con idle/death
  sobre masa de tinta. **No es una captura in-engine.**

---

## 7. Problemas conocidos

1. **Licencia y autoría desconocidas.** Bloqueante duro para aprobar o publicar.
2. **Holds y reutilización.** `idle`, `attack` y `death` no tienen poses suficientes; ver §5.
3. **Sangre horneada** en daño y muerte. No se puede recolorear ni desactivar por código; si el
   rating del juego cambia, hay que rehacer esos frames.
4. **VFX fusionado.** El arco azul del tajo está pegado al cuerpo en ataque; por eso falla la
   safe area en 18–21. Separarlo requiere repintar, no recortar.
5. **Filtro de componente mayor.** El builder conserva solo la componente alpha más grande por
   frame para eliminar sombras sueltas; si alguna pose dependía de un trozo separado (por
   ejemplo, sangre o esquirla), se ha descartado.
6. **Peso.** 136 KiB supera el presupuesto de 120 KB. Se puede bajar con PNG-8 + paleta
   perceptual, pero eso agrava el problema de estilo.
7. **Sin revisión in-engine.** No se ha visto en Canvas 800×600 ni en Skia.
8. **Celdas 30–31 vacías** a propósito; no son un error.

---

## 8. Integración (no ejecutada)

- El juego carga el samurai con una clave fija y el frame map `8/8/8/6/8` en
  `src/games/hitandrun/rendering/SamuraiVisualAssets.ts`. **No se ha tocado.**
- Este atlas vive en `src/games/hitandrun/assets/candidates/` y **no lo importa ningún
  sistema**.
- Para cablearlo haría falta, como mínimo:
  1. decidir tema (fantasy pintado vs. tercer tema) y documentarlo;
  2. añadir clave de asset + fallback al atlas actual;
  3. revisar en Canvas y Skia;
  4. aprobar la licencia.
- **No mover a `themes/sumi-e/` ni sobrescribir `samurai-enemy.png` sin aprobación explícita.**

---

## 9. Comandos

```bash
# Construir atlas, JSON, previews y reporte
python3 docs/hitandrun/assets/samurai-painted/build_atlas.py

# Construir y validar sin escribir nada
python3 docs/hitandrun/assets/samurai-painted/build_atlas.py --check

# Auditar con el contrato Sumi-e existente (fallará: es diagnóstico, no gate de este candidato)
python3 docs/hitandrun/sumi-e/tools/asset_report_sumie.py \
  src/games/hitandrun/assets/candidates/samurai-painted/samurai-painted.png
```

El builder es determinista: dos ejecuciones producen bytes idénticos mientras no cambie la
fuente ni el script.

---

## 10. Archivos

| Archivo | Rol |
| --- | --- |
| `build_atlas.py` | Builder determinista: recorte, componente mayor, resize premultiplicado, espejado, baseline, previews y QA. |
| `build-report.json` | Métricas medidas, mapa de celdas, fallos de safe area y resumen por clip. |
| `qa-generic.json` | QA genérico de tamaño, alpha y bounds. |
| `qa-sumi-e.txt` | Salida del auditor Sumi-e (diagnóstico de estilo). |
| `../../../../src/games/hitandrun/assets/candidates/samurai-painted/samurai-painted.png` | Atlas candidato. |
| `…samurai-painted.atlas.json` | Frames, offsets y tamaños. |
| `…samurai-painted.animations.json` | Clips, fps, loops, anchor y orden de frames. |
| `…samurai-painted.frames.json` | Mapa fuente→celda, holds, duplicados e inventario de 40 segmentos. |
| [`manifest.json`](./manifest.json) | Ficha de estado del candidato. |
| [`provenance.md`](./provenance.md) | Fuente, transformaciones y bloqueos de licencia. |

---

## Puertas antes de `approved`

- [ ] Resolver autoría y licencia de `assets/sprites/samurai1.png`.
- [ ] Decidir tema y registrar la ficha de estilo (no Sumi-e).
- [ ] Aceptar o corregir holds/reutilización entre clips.
- [ ] Decidir qué hacer con la sangre horneada y el VFX fusionado.
- [ ] Bajar de 120 KB o aprobar una excepción de presupuesto.
- [ ] Revisar a 64 px en Canvas y Skia, sobre papel y sobre tinta.
- [ ] Aprobación visual del usuario.
