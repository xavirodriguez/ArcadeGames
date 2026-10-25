# Provenance — `samurai-painted` (candidato)

**Estado:** CANDIDATO técnico. No aprobado. No cableado. **Licencia desconocida.**
**Asset:** `src/games/hitandrun/assets/candidates/samurai-painted/samurai-painted.png`
**Manifiesto:** [`manifest.json`](./manifest.json)
**Ficha de dirección:** [`README.md`](./README.md)

---

## Fuente

| Campo | Valor |
| --- | --- |
| Ruta | `assets/sprites/samurai1.png` |
| Tipo | Hoja de key poses en raster (no atlas, no generador determinista) |
| Tamaño | `1408×768`, PNG-32 RGBA, 973 782 B |
| SHA-256 | `58a7c377d299e198f80d50eeeb763867036bed796f9af2aecfdcb76eff422804` |
| Trackeada | Commit `b3e08872` (`sprites`) |
| Herramienta / modelo | **Desconocidos** |
| Autoría | **Desconocida** |
| Prompt / fuente | **No documentada** |
| Licencia | **Desconocida — no shippable hasta resolverla** |
| Atribución | Ninguna documentada |

## Estado legal

La hoja de entrada no declara autoría, licencia ni procedencia. Este candidato **no puede
aprobarse, publicarse ni distribuirse** hasta que el usuario confirme que tiene derechos sobre
`assets/sprites/samurai1.png` o sustituya la fuente por una de licencia conocida. El builder y
los JSON de este paquete son código propio del repositorio; el contenido visual derivado
(atlas y previews) hereda el problema de la fuente.

---

## Transformaciones

Todas las operaciones son deterministas y están implementadas en
[`build_atlas.py`](./build_atlas.py).

| Fecha | Operación | Detalle |
| --- | --- | --- |
| 2026-10-25 | Segmentación | Bandas de fila por proyección de columnas; frames que se tocan por VFX se separaron a mano. Resultado: `6/9/8/8/9` segmentos. |
| 2026-10-25 | Limpieza de alpha | Se conserva solo la componente alpha más grande de cada frame; se descartan sombras sueltas y restos de VFX. |
| 2026-10-25 | Normalización | Resize premultiplicado a escala `0.40` (140 px → 56 px de alto), sin cambiar la relación de aspecto. |
| 2026-10-25 | Facing | Ataque, daño y muerte se espejan horizontalmente para mirar a la derecha. |
| 2026-10-25 | Baseline | Pies anclados en `y = 60` dentro de la celda `64×64`; torso centrado por frame con offset compartido. |
| 2026-10-25 | Empaquetado | Grid `8×5`, 40 celdas, celdas 30–31 vacías. Salida PNG-32 alpha recto. |
| 2026-10-25 | Mapa de clips | Se fuerza `8/8/8/6/8` con holds y reutilización documentados en `frames.json`. |
| 2026-10-25 | Previews | Contact sheet 3×, hoja papel/tinta/gris y mock de contexto `800×600` a 1:1. |
| 2026-10-25 | QA | Reporte propio + auditor genérico + auditor Sumi-e (diagnóstico de estilo). |

### Descartado a propósito

- **Cuantización a 8 y 12 colores:** probada y rechazada. Destruye rostro, armadura y tajo.
  El candidato se conserva a color completo.
- **Recorte del VFX de tajo:** está fusionado al cuerpo en las poses de ataque; recortarlo
  cortaría la silueta. Se deja tal cual y se documenta el fallo de safe area.
- **Retoque de sangre:** la sangre está horneada en daño/muerte. No se ha repintado.

---

## Verificación

- [x] `512 × 320`, grid `8 × 5`, celda `64 × 64`, 40 frames.
- [x] Frame map `idle 0–7 / walk 8–15 / attack 16–23 / hurt 24–29 / empty 30–31 / death 32–39`.
- [x] Anchor `(0.5, 0.94)`, pies en `y = 60`, celdas 30–31 vacías.
- [x] PNG-32, alpha recto, sin fondo horneado.
- [x] Mapa fuente→celda completo, incluidos holds, duplicados y 12 segmentos sin uso.
- [x] Build determinista (misma fuente + mismo script ⇒ mismos bytes).
- [x] QA genérico de tamaño y alpha.
- [ ] Paleta ≤ 8 swatches (falla: 17 427 opacos / 21 863 RGB).
- [ ] Sin negro/blanco puros (falla: 2 403 px puros).
- [ ] Safe area 2 px (falla en celdas 18–21 por el VFX).
- [ ] Presupuesto ≤ 120 KB (falla: 139 337 B).
- [ ] Revisión in-engine (Canvas 800×600 y Skia).
- [ ] Licencia y autoría resueltas.
- [ ] Aprobación del usuario.

## Hashes

| Artefacto | SHA-256 |
| --- | --- |
| Fuente `assets/sprites/samurai1.png` | `58a7c377d299e198f80d50eeeb763867036bed796f9af2aecfdcb76eff422804` |
| Atlas `samurai-painted.png` | `59b6c841c71a7530368f7b47882416d0ac0795ae81e5ecf3cc7bca10183ca267` |

## Puertas antes de `approved`

1. Confirmar derechos de uso de la hoja de entrada.
2. Decidir el tema (variante fantasy pintada o tema nuevo; **no Sumi-e**).
3. Aceptar o rehacer holds, reutilización entre clips, sangre y VFX fusionado.
4. Resolver el presupuesto de archivo o aprobar la excepción.
5. Revisar a 64 px en Canvas y Skia, sobre papel y sobre tinta.
6. Aprobación visual del usuario y actualización de `manifest.json` a `approved`.
