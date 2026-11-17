# PixelFX VFX — ledger de calidad visual

Última actualización: 2026-11-17  
Base auditada: `master` @ `e38e42a71da10aa3cb4327558f1ac6991638600c`  
Fuente local recibida: `PixelFxProceduralVFX.ts`, SHA-1 Git blob `bb2caec43bea56436e5d935ab314941ff7cb9393` (coincide con el blob de `src/games/shared/rendering/PixelFxProceduralVFX.ts` en master).

## Estado

| Unidad | Estado | PR | Fecha | Nota |
|---|---|---|---|---|
| Fase 0 — auditoría y golden preliminar | done | #1189 | 2026-11-17 | Auditoría estática más recorder externo; golden provisional conservado como fixture y ahora consumido por Jest. |
| U1 — Infra sin cambio visual | done | #1189 | 2026-11-17 | Golden Jest (354 muestras), determinismo, variación seeded, presupuesto y caché Canvas/Skia verificados. jscpd baja 251 líneas; baseline actualizado. No se observan fallos nuevos frente a master. |
| U2 — Paleta semántica y núcleo | pending | — | — | Reutilizar tokens/perfiles existentes en `VFXEffectIR.ts`; no crear otro catálogo de perfiles. |
| U3 — Envolvente por capas | pending | — | — | Mantener el alpha TTL como opacidad de salida; introducir samplers únicamente tras U1. |
| U4 — Microdetalles | pending | — | — | Helpers deterministas y presupuesto medido; no añadir arrays/objetos por llamada. |
| U5 — Estelas | pending | — | — | Muestreo cerrado en progreso; no reutilizar el trail histórico Canvas/stateful. |
| U6 — Silueta procedural | pending | — | — | Variación por entidad solo en pilotos y con streams reservados. |
| U7 — Cierre | pending | — | — | Informe, documentación de VFX y deuda. |

## Hallazgos de Fase 0

### Identidad y alcance de la fuente

| Comando / comprobación | Resultado | Evidencia |
|---|---|---|
| `wc -l /mnt/data/PixelFxProceduralVFX.ts` | 1544 líneas | Fuente adjunta; coincide byte a byte a nivel de Git blob con `src/games/shared/rendering/PixelFxProceduralVFX.ts` en master (SHA `bb2caec43bea56436e5d935ab314941ff7cb9393`). |
| GitHub Code Search `PixelFxProceduralVFX` en `xavirodriguez/ArcadeGames` | Archivo canónico localizado en `src/games/shared/rendering/PixelFxProceduralVFX.ts`; ledger específico inexistente (404 al buscarlo). | Registro y drawers en `PixelFxProceduralVFX.ts:1472-1544`; ledger general existente: `docs/agents/vfx-ledger.md`. |
| Revisión del registro `registerPixelFxProceduralVFX` | 59 pares nombre/drawer registrados. | `PixelFxProceduralVFX.ts:1472-1544`; lista tipada en `JuiceOrchestrator.ts:10-78`. |
| Búsqueda local `grep -nE '\\b(withEffect|strokeW|rand|EffectPalette|VFXPalette|vfxPalette)\\b' /mnt/data/PixelFxProceduralVFX.ts` | Sin coincidencias. | `PixelFxProceduralVFX.ts`: el archivo adjunto completo (1544 líneas). |
| GitHub Code Search `vfxPalette` | Sin resultados. | Búsqueda de código del repo en master. |

### Contrato de entrada y ciclo de vida

- `readEffectState` consulta `Render`, `TTL` y `Transform`; rechaza entidades sin Render/TTL o TTL agotado. Calcula elapsed desde `timeLeft - remaining`, admite `Render.vfxAnimDuration` positivo como duración visual y deriva el progreso normalizado. Evidencia: `PixelFxProceduralVFX.ts:31-58`.
- El color actual del estado es un único `render.color ?? colors.white`; tamaño deriva de `render.size` y `Transform.scaleX`; rotación deriva de `Transform.rotation`. Evidencia: `PixelFxProceduralVFX.ts:45-57`.
- Alpha global = `clamp(ttl.remaining / ttl.timeLeft, 0, 1) * render.opacity`. Muchos drawers multiplican luego ese alpha por fades locales. Evidencia: `PixelFxProceduralVFX.ts:45-57` y, como muestras, `PixelFxProceduralVFX.ts:78-81`, `151-164`, `197-215`.
- `JuiceOrchestrator.spawn` es un creador canónico confirmado: fija `ttlSeconds`, `Render.shape`, `Render.size`, `Render.color`, `Render.opacity`, `Render.vfxAnimDuration`, `TTL.remaining` y `TTL.timeLeft`. Evidencia: `JuiceOrchestrator.ts:205-335`.
- La inspección de `JuiceOrchestrator` verifica el contrato del camino canónico, pero no equivale a un `grep -rn "pixelfx_"` exhaustivo de todos los productores de todos los juegos. El checkout local completo no está disponible en esta sesión; la matriz de todos los call sites de gameplay queda **parcial** y no se inventa.

### Utilidades compartidas existentes

| Recurso | Hallazgo verificado | Evidencia |
|---|---|---|
| `deriveSeed` | Firma `deriveSeed(seed:number, stream:number):number`; valida seed finita y stream entero seguro no negativo; devuelve hash unsigned de 32 bits. No existe tabla central de streams reservados para drawers. | `vfx-core.ts:108-118`. |
| `createVFXTimelineSampler` | Compila/snapshotea fases una vez al crear el sampler; muestreo sin asignaciones. | `vfx-timeline.ts:79-84`. |
| Easings | `linear`, `smoothstep`, `ease-in`, `ease-out`, `ease-in-out`. | `vfx-timeline.ts:10-12`, `37-47`. |
| `resolveVFXPhase` | Resuelve fase semántica y progreso local; devuelve un objeto por llamada. | `vfx-timeline.ts:111-145`. |
| `sampleVFXRecoil` | Movimiento cerrado en progreso y seed; la variación sale de `deriveSeed`. | `vfx-motion.ts:8-15`. |
| `ballistic` | Posición balística cerrada con gravedad y drag lineal opcional. | `vfx-geometry.ts:90-105`. |
| `IDrawAdapter` | 11 métodos: save, restore, setBlendMode, fillCircle, strokeCircle, fillRect, strokeRect, drawLine, drawArc, drawText, drawGlow. | `DrawAdapter.ts:15-27`. |
| Canvas / Skia | Ambas clases implementan el mismo contrato; Canvas usa operaciones 2D y Skia mapea operaciones a Paint/Path. Skia mantiene además una pila propia de blend mode. | `DrawAdapter.ts:45-154` (Canvas), `160-310` (Skia); `__tests__/DrawAdapter.test.ts`. |
| Tests de adapter | Ya existen pruebas de blend mode y glow en Canvas y Skia. | `__tests__/DrawAdapter.test.ts`. |

**Riesgo de asignaciones detectado:** `readEffectState` crea un objeto `EffectState` en cada invocación y `resolveVFXPhase` devuelve otro objeto. Evidencia: `PixelFxProceduralVFX.ts:51-58` y `vfx-timeline.ts:111-145`. Por tanto, no basta con que los nuevos helpers eviten arrays; U1 debe diseñar una API sin scratch global mutable ni aliasing/reentrancia y abordar estas asignaciones de forma explícita.

### Reutilización y solapamientos

- Ya hay perfiles semánticos `arcade-neon` y `sumi-e`, con tokens `primary/secondary/accent/neutral/warning/energy/reward`; y resolución por familia. Reutilizar/extender, no duplicar. Evidencia: `VFXEffectIR.ts:62-101`, `VFXEffectIR.ts:122-141`.
- El Visual Lab ya consume los perfiles y los efectos registrados. Evidencia: `VFXVisualLabModel.ts` (catálogo y presets) y `src/app/vfx-lab/index.tsx`.
- GitHub Code Search `drawMotionTrail`: sin resultados.
- Búsqueda `afterimage`: `drawPixelFxPhaseDash` usa rectángulos offset fijos; Pong tiene `CanvasMotionTrail` histórico/estadoful y ligado a Canvas. Ninguna de estas opciones cumple directamente el trail puro, cerrado en p y compartido por IDrawAdapter requerido aquí. Evidencia: `PixelFxProceduralVFX.ts:458-482`; `src/games/pong/rendering/PongCanvasVisuals.ts`.
- Búsquedas `trail|afterimage|palette|spark` detectan utilidades y usos locales en otros subsistemas, pero no un helper de microdetalles/trails que pueda incorporarse directamente a este contrato sin cambiar su semántica.

### Inventario medido por efecto

Orden de columnas de llamadas: p = `[0, 0.1, 0.25, 0.5, 0.75, 0.9]`. Los valores son llamadas a primitivas de dibujo (fill/stroke/line/arc/text/glow); excluyen `save` y `restore`. `T` = usa sampler compilado; `HD` = se resuelve en `drawHighDynamics` con fórmulas inline; `seed` = la geometría cambia con entity para el estado fijo medido.

| Efecto | T | HD | Seed | Primitivas por p |
|---|---:|---:|---:|---|
| pixelfx_impact | — | — | sí | 29/29/29/29/29/29 |
| pixelfx_hitstun | — | — | — | 8/8/8/8/8/8 |
| pixelfx_stagger | — | — | — | 7/7/7/7/7/7 |
| pixelfx_slash | — | — | — | 7/7/7/7/7/7 |
| pixelfx_explosion | sí | — | sí | 21/21/21/21/21/21 |
| pixelfx_dust | — | — | — | 15/15/15/15/15/15 |
| pixelfx_pickup | — | — | — | 9/9/9/9/9/9 |
| pixelfx_muzzle | — | — | — | 9/9/9/9/9/9 |
| pixelfx_shield_crack | — | — | — | 15/15/15/15/15/15 |
| pixelfx_ink_burst | — | — | — | 20/20/20/20/20/20 |
| pixelfx_paddle_impact | — | — | — | 6/6/6/6/6/6 |
| pixelfx_brick_shatter | — | — | — | 28/28/28/28/28/28 |
| pixelfx_flap_gust | — | — | — | 6/6/6/6/6/6 |
| pixelfx_hop | — | — | — | 6/6/6/6/6/6 |
| pixelfx_phase_dash | — | — | — | 19/19/19/19/19/19 |
| pixelfx_ricochet | sí | — | — | 10/10/10/10/10/10 |
| pixelfx_charge | sí | — | — | 9/9/9/9/9/9 |
| pixelfx_shield_pulse | sí | — | — | 10/10/10/11/11/10 |
| pixelfx_parry | sí | — | — | 12/12/12/12/12/12 |
| pixelfx_perfect_block | sí | — | — | 10/10/10/10/10/10 |
| pixelfx_critical_hit | sí | — | — | 12/12/12/12/12/12 |
| pixelfx_projectile_deflection | sí | — | — | 15/15/15/15/15/15 |
| pixelfx_guard_break | sí | — | — | 6/8/16/18/18/18 |
| pixelfx_armor_break | sí | — | — | 32/32/32/32/32/32 |
| pixelfx_combo_finisher | sí | — | — | 12/12/12/12/12/12 |
| pixelfx_target_warning | — | — | — | 11/11/11/11/11/11 |
| pixelfx_teleport | — | — | — | 11/11/11/11/11/11 |
| pixelfx_surface_skid | — | — | — | 19/19/19/19/19/19 |
| pixelfx_mechanical_motion | — | — | — | 20/20/20/20/20/20 |
| pixelfx_heal | — | — | — | 11/11/11/11/11/11 |
| pixelfx_poison | — | — | — | 14/14/14/14/14/14 |
| pixelfx_burn | — | — | — | 9/9/9/9/9/9 |
| pixelfx_frost | — | — | — | 25/25/25/25/25/25 |
| pixelfx_electric | — | — | — | 7/7/7/7/7/7 |
| pixelfx_bleed | — | — | — | 10/10/10/10/10/10 |
| pixelfx_buff | — | — | — | 8/8/8/8/8/8 |
| pixelfx_debuff | — | — | — | 7/7/7/7/7/7 |
| pixelfx_spawn | — | — | — | 11/11/11/11/11/11 |
| pixelfx_death | — | — | — | 11/11/11/11/11/11 |
| pixelfx_nova | — | sí | — | 14/14/14/14/14/14 |
| pixelfx_vortex | — | sí | — | 25/25/25/25/25/25 |
| pixelfx_meteor | — | sí | — | 8/8/8/8/9/9 |
| pixelfx_rift | — | sí | — | 10/10/10/10/10/10 |
| pixelfx_arc_chain | — | sí | — | 12/12/12/12/12/12 |
| pixelfx_gravity_well | — | sí | — | 20/20/20/20/20/20 |
| pixelfx_blade_dance | — | sí | — | 6/6/6/6/6/6 |
| pixelfx_seismic_wave | — | sí | — | 10/10/10/10/10/10 |
| pixelfx_soul_reap | — | sí | — | 7/7/7/7/7/7 |
| pixelfx_time_warp | — | sí | — | 5/5/5/5/5/5 |
| pixelfx_prism_burst | — | sí | — | 17/17/17/17/17/17 |
| pixelfx_sonic_boom | — | sí | — | 5/5/5/5/5/5 |
| pixelfx_magnetic_surge | — | sí | — | 11/11/11/11/11/11 |
| pixelfx_plasma_orbit | — | sí | — | 7/7/7/7/7/7 |
| pixelfx_solar_flare | — | sí | — | 13/13/13/13/13/13 |
| pixelfx_crystal_bloom | — | sí | — | 13/13/13/13/13/13 |
| pixelfx_pulse_lance | — | sí | — | 3/3/3/3/3/3 |
| pixelfx_echo_shatter | — | sí | — | 10/10/10/10/10/10 |
| pixelfx_tidal_wave | — | sí | — | 8/8/8/8/8/8 |
| pixelfx_phase_collapse | — | sí | — | 6/6/6/6/6/6 |

### Golden preliminar y límites de la medición

- Fixture: `docs/agents/fixtures/pixelfx-vfx-golden.jsonl`, 59 filas (una por drawer), seis muestras por fila; incluye conteos de primitivas y SHA-256 truncado a 64 bits por log.
- Parámetros: entity = 104729; Render size = 32, color = `#FFFFFF`, opacity = 1, vfxAnimDuration = 0.4; TTL timeLeft = 0.4 y remaining = 0.4 × (1-p); Transform rotation = 0.25 y scaleX = 1.
- Recorder: transpiló la fuente adjunta exacta con TypeScript y ejecutó los drawers contra un IDrawAdapter grabador; se sustituyeron las utilidades de módulo por implementaciones fuente-equivalentes leídas del repo. No es un test de Jest integrado y aún debe reproducirse desde el código de test del repositorio antes de usarlo como guardrail obligatorio.
- SHA-256 del fixture JSONL: `99c610bd177b29330fdc15d44fe4705c1c4406e91751523aa03202de7002b117`.
- Repetir el catálogo con el mismo entity/progreso produjo logs idénticos (resumen de salida: `b82ffe135e4adb6f4a4f2e527e659b0d27e12490c916db6f6dfb4ebfddc76870`). En p=0.5 y mismo estado de componentes, comparar entity 104729 con 130363 cambió solo Impact y Explosion: son los únicos que actualmente usan variación por entity (Impact vía `sampleVFXRecoil`; Explosion vía `deriveSeed`).
- Conteos: mínimo 3 primitivas, máximo 32; máximo observado en `pixelfx_armor_break`. Impact = 29 primitivas / 31 llamadas incluyendo save+restore; Explosion = 21 / 23; Parry = 12 / 14; CriticalHit = 12 / 14. Todos los pilotos quedan debajo de 60 primitivas en las seis muestras.

### Tests, runner y línea base

- Runner del repositorio: Jest; el script `test:ci` usa `jest --runInBand`, y el script `ci` ejecuta build de core, build de gameplay-kit, guardrails, docs-check y typecheck app. Evidencia: `package.json` (`scripts.test:ci`, `scripts.ci`, `scripts.check:duplication`).
- Tests específicos: `src/games/shared/rendering/__tests__/PixelFxProceduralVFX.test.ts` (683 líneas); adapter mock local en líneas 69–82. Hay pruebas de geometría/semillas para Impact y Explosion, y paridad de registro por nombre; no hay adapter recorder genérico que conserve la secuencia ordenada completa. Evidencia: `__tests__/PixelFxProceduralVFX.test.ts:69-82`, y casos de Impact/Explosion en líneas 101–169.
- También existen `PixelFxCombatVFX.test.ts`, `DrawAdapter.test.ts` y `vfx-procedural-core.test.ts`; la última cubre `deriveSeed` y samplers. Evidencia: archivos indicados y `vfx-core.ts:108-118`, `vfx-timeline.ts:79-90`.
- Baseline jscpd antes de U1: 1801 duplicatedLines, 225 clones, 1.22%, 147867 totalLines. La medición aislada confirmó 251 líneas duplicadas menos; `pnpm run duplication:update-baseline` actualizó `scripts/duplication-baseline.json` a 1550 líneas, 191 clones, 1.03%, 149927 totalLines.
- **No se ejecutó** `pnpm run ci` localmente: el repositorio no está clonado en el entorno de ejecución; solo se recibió la fuente adjunta y se consultó master remotamente.
- CI remota de master: workflow run `44065834867` inició con push a HEAD `e38e42a...`; en la consulta el run seguía `in_progress`, pero el paso `Run tests through Turborepo` ya había fallado. Log: `tests/CombatRollbackResimulation.test.ts`, caso “Case 2 & 4… normal hash == resimulated hash”; esperado `1ec1c6ef`, recibido `afafd683`, assert en línea 180. Build, lint y typecheck de Turborepo aparecían completados con éxito en el job. No se atribuye la causa del hash al trabajo PixelFX.

## Veredictos de hipótesis

### Resumen de veredictos H1–H7 (evidencia del baseline master)

- **H1 — CONFIRMADA CON AJUSTE:** los drawers consumían un solo `render.color` vía `EffectState` (`PixelFxProceduralVFX.ts:31-58`); existen tokens semánticos reutilizables (`VFXEffectIR.ts:62-101`). U2 debe mapear roles desde esos perfiles.
- **H2 — CONFIRMADA CON AJUSTE:** alpha global = `clamp(ttl.remaining / ttl.timeLeft, 0, 1) * opacity` (`PixelFxProceduralVFX.ts:45-48`); fades locales adicionales aparecen, por ejemplo, en `PixelFxProceduralVFX.ts:78-81` y `:151-164`. No se generaliza a todas las capas.
- **H3 — CONFIRMADA CON AJUSTE:** 11 drawers usan 28 samplers compilados; 20 dispatches de High Dynamics usan curvas inline (`PixelFxProceduralVFX.ts:1355-1470`). Los otros 28 sin sampler no son todos curvas inline.
- **H4 — CONFIRMADA:** solo Impact (`sampleVFXRecoil`, `PixelFxProceduralVFX.ts:74`; `vfx-motion.ts:8-15`) y Explosion (`deriveSeed`, `PixelFxProceduralVFX.ts:170-174`) variaron por entity en el recorder de baseline.
- **H5 — CONFIRMADA:** PhaseDash dibuja rectángulos offset fijos y líneas; no muestrea una trayectoria anterior (`PixelFxProceduralVFX.ts:458-482`).
- **H6 — CONFIRMADA:** Impact produjo 29 primitivas en cada una de las seis muestras (31 operaciones contando save/restore); el test existente verificaba 24 `drawLine` (`PixelFxProceduralVFX.test.ts:101-108`).
- **H7 — CONFIRMADA CON MATIZ:** el baseline tenía 40 lecturas de estado y 40 pares save/restore repetidos; tras extraer el wrapper, jscpd bajó de 1.22% (1801 líneas, 225 clones) a 1.03% (1550 líneas, 191 clones). La reducción medida fue de 251 líneas duplicadas y 34 clones.

| Hipótesis | Veredicto | Evidencia y ajuste |
|---|---|---|
| H1 — un único render.color; sin roles de color | CONFIRMADA CON AJUSTE | El drawer solo recibía un `color` en EffectState (`PixelFxProceduralVFX.ts:51-57`). Sí existen roles semánticos en VFXEffectIR (`VFXEffectIR.ts:62-101`); se reutilizan en U2. |
| H2 — alpha TTL global y otro fade inline | CONFIRMADA CON AJUSTE | Fórmula global exacta en `PixelFxProceduralVFX.ts:45-48`; fades locales en múltiples drawers, p. ej. líneas 78-81 y 151-164. Es un patrón frecuente, no afirmo que toda capa retardada lo use. |
| H3 — solo ~11 drawers usan sampler; 20 HD usan inline | CONFIRMADA CON AJUSTE | 11 drawers usan 28 constantes sampler; 20 drawers se despachan en `drawHighDynamics` sin sampler (`PixelFxProceduralVFX.ts:1355-1470`). Los otros 28 sin sampler no se etiquetan todos como “curvas inline”: hay fórmulas directas y geometría estática. |
| H4 — solo Explosion y sampleVFXRecoil varían por entidad | CONFIRMADA | `deriveSeed` se usa para los fragmentos de Explosion (`PixelFxProceduralVFX.ts:170-174`); Impact llama a `sampleVFXRecoil(p, entity)` (`PixelFxProceduralVFX.ts:74`; `vfx-motion.ts:8-15`). Recorder: solo estos dos logs cambian entre IDs con estado fijo. |
| H5 — PhaseDash usa afterimages fijos, no trail muestreado | CONFIRMADA | Dibuja tres rectángulos desplazados y líneas de velocidad; no muestrea trayectoria anterior (`PixelFxProceduralVFX.ts:458-482`). |
| H6 — Impact ~29 llamadas | CONFIRMADA | Recorder: 29 primitivas en seis progresos; 31 incluyendo save/restore. Test actual ya espera 24 drawLine (`PixelFxProceduralVFX.test.ts:101-108`). |
| H7 — boilerplate alto / riesgo jscpd | CONFIRMADA CON MATIZ | 40 lecturas de estado y 40 pares save/restore encontrados. Tras U1, jscpd baja de 1.22% a 1.03% y de 225 a 191 clones. |

## Decisiones

| ID | Decisión | Alternativa descartada | Evidencia | Unidad |
|---|---|---|---|---|
| D-1 | Reutilizar `VFX_VISUAL_PROFILES` / `VFXSemanticTokens` y mapear roles de capa desde ellos. | Crear otra paleta global paralela. | `VFXEffectIR.ts:62-101`. | U2 |
| D-2 | El trail nuevo será una función pura muestreada desde p y curvas deterministas. | Reutilizar `CanvasMotionTrail` con historial mutable. | `PongCanvasVisuals.ts` usa estado/historial; no cumple el contrato PixelFX. | U5 |
| D-3 | Reservar streams de manera central y mantener inalterados los flujos existentes de Explosion/Recoil. | Renumerar los índices ya usados en Explosion. | `PixelFxProceduralVFX.ts:170-174`; `vfx-motion.ts:8-15`. | U1/U6 |
| D-4 | No tocar runtime en esta PR; convertir el baseline recorder en test de repo antes de migrar wrappers. | Implementar wrapper a ciegas sin poder comparar CI. | CI base con fallo en RollbackResimulation; sin checkout para ejecutar `pnpm run ci`. | U1 |

## Inventario de migración

| Efecto | wrapper | paleta | envolvente | microdetalles | trail | silueta |
|---|---|---|---|---|---|---|
| Los 59 drawers | done | pending | pending | pending | pending | pending |

## Métricas resumidas

| Métrica | Baseline Fase 0 | Después |
|---|---:|---:|
| Drawers registrados | 59 | — |
| Drawers con sampler compilado | 11 | — |
| Samplers compilados declarados | 28 | — |
| Drawers bajo drawHighDynamics sin sampler | 20 | — |
| Primitivas Impact | 29 | — |
| Primitivas Explosion | 21 | — |
| Primitivas Parry | 12 | — |
| Primitivas CriticalHit | 12 | — |
| Máximo de primitivas del catálogo | 32 (`pixelfx_armor_break`) | — |
| jscpd | 1.22% · 1801 líneas · 225 clones | 1.03% · 1550 líneas · 191 clones (-251 líneas, -34 clones) |

## U1 — Infra sin cambio visual (implementación en PR #1189)

- **Wrappers:** los 39 drawers directos y el dispatcher compartido de High Dynamics usan `withEffect`; los 59 nombres registrados y sus firmas públicas se conservan. El dispatcher único sirve a los 20 wrappers High Dynamics.
- **Asignaciones del estado:** `readEffectState` y el objeto devuelto por `resolveVFXPhase` se han eliminado del camino de dibujo. `withEffect` calcula progress/alpha/size/color/rotation y fase en escalares, usa callbacks declarados a nivel de módulo y garantiza `restore` mediante `finally`.
- **Helpers:** `strokeW(size, coefficient, minimum)`; `rand(entity, stream)`; `PIXEL_FX_RANDOM_STREAMS` reserva los streams existentes de Explosion (angle base 0, speed base 16) y mantiene identificadores separados para Impact, CriticalHit y Parry.
- **Tipos:** `PixelFxPaletteRole`, `PixelFxPalette` y `PixelFxLayer` quedan declarados para las siguientes unidades; no alteran el render en U1.
- **Asignaciones locales eliminadas:** la tabla de vértices de GuardBreak y los puntos de Electric pasan a constantes de módulo; Electric ya no crea closure ni objetos de coordenadas por muestra. Se eliminó `rotatePoint`, que no tenía llamadas.
- **Adaptadores:** Canvas y Skia se cachean por contexto mediante `WeakMap`; `CanvasDrawAdapter`/`SkiaDrawAdapter` solo se construyen al primer uso de cada contexto. Un test llama dos veces con el mismo contexto y comprueba identidad del adaptador.
- **Tests:** `PixelFxProceduralVFX.test.ts` lee el JSONL con `node:fs`, graba las 11 operaciones de `IDrawAdapter`, compara los SHA-256 truncados y los conteos para 59 × 6 = 354 muestras, comprueba repetición por entity, variación seeded en `p=0.5` y presupuesto ≤60. En la primera integración, `pixelfx_impact` en `p=0` ya reprodujo 29 primitivas y su digest exacto; la prueba inicial reveló correctamente que el recoil no varía en `p=0`, y el assert se acotó a `p=0.5`.
- **Registro:** el test anterior esperaba 49 nombres aunque el renderer registraba 59; se actualizó a los 59 nombres derivados del catálogo importado. Esta discrepancia ya fallaba en master y queda corregida en esta unidad.
- **Fixture:** Documentation CI pasó con el fixture en `docs/agents/fixtures/pixelfx-vfx-golden.jsonl` (runs #44075094228 y #44078385540); no ha interferido y no se mueve.
- **Duplicación:** `pnpm run check:duplication` pasó en el branch aislado de verificación (#44079625552). Al bajar 251 líneas, se ejecutó `pnpm run duplication:update-baseline` (#44080437373); nuevo baseline: 1550 líneas, 191 clones, 1.03%, 149927 líneas totales. El archivo se copió a esta PR. No se actualizó el baseline hasta comprobar la reducción.
- **Guardrails restantes:** `pnpm run check:agent-guardrails` pasó los tres boundary checks, pero falla en el guardrail de typecasts por `src/games/vertical-shmup/juice/ShmupJuiceHelpers.ts:48` (`as unknown=1`, baseline 0). El archivo es idéntico en master y PR (blob `2d1fe202438ac047d0cb2483d90a330414ce2ff5`), por tanto no es regresión PixelFX.
- **CI:** el commit `d65819c` está en la ejecución #44079089005. Build/lint/typecheck pasan; PixelFX golden pasa en la salida de Jest y los 10 test suites fallidos observados son subconjunto de los 33 fallidos en master, sin suites nuevas. El core conserva el fallo de master en `CombatRollbackResimulation.test.ts:180`. E2E en master y PR falla en los mismos tres casos Hit & Run. Documentation CI pasó (#44078385540). No se ejecutó `pnpm run ci` localmente.

### Criterio de comparación con master

La ejecución de master #44065834867 falla en `tests/CombatRollbackResimulation.test.ts:180`: el hash normal y el de resimulación no coinciden (en esa ejecución, esperado `1ec1c6ef`, recibido `afafd683`). La ejecución de la PR #1189 también falla en la misma aserción (en una ejecución, esperado `532c4602`, recibido `a794d616`), por lo que se trata como fallo preexistente; no se toca aquí. Incidencia separada: [#1190](https://github.com/xavirodriguez/ArcadeGames/issues/1190).

## Deuda y bloqueos

1. La CI debe confirmar que los 354 digests del recorder Jest coinciden con el fixture; la grabación es a nivel IDrawAdapter y no sustituye una prueba de raster parity Canvas/Skia.
2. Falta auditar exhaustivamente los productores `pixelfx_*` en todos los juegos desde el checkout completo; se verificó el contrato canónico JuiceOrchestrator, no todos los spawn directos.
3. U1 elimina la asignación de `EffectState` y del objeto de fase en los 59 drawers; la revisión futura debe conservar callbacks estáticos y no introducir scratch mutable compartido.
4. La CI de master mostró un fallo de hash en `CombatRollbackResimulation.test.ts:180`; hasta tener baseline verde y test PixelFX reproducible, no se debe afirmar que `pnpm run ci` pasa.
5. La verificación de duplicación pasó y el baseline ya se actualizó por la reducción demostrada. El guardrail agregado sigue bloqueado por el typecast preexistente de `ShmupJuiceHelpers.ts:48`.

## Siguiente unidad

**U1 — done.** La siguiente unidad es **U2 — paleta semántica y núcleo**, reutilizando `VFX_VISUAL_PROFILES`, derivando roles desde `render.color` y manteniendo fallback al color original. No se cambia la salida visual hasta comparar el golden de nuevo.
