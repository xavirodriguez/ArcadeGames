# 📜 Biblia Maestra de Dirección Artística: Mitos de Tinta (Sumi-e & Shan Shui)

**Aplicación:** ArcadeGames (Especialmente adaptado para *Hit & Run* y otros arcades de la suite)
**Versión:** 1.0.0
**Propósito:** Documento de diseño definitivo y contexto maestro para la generación de recursos visuales, sprites, UI, efectos visuales (VFX) e implementación técnica en TypeScript estricto.

> **Documento maestro cross-game.** Los briefs por juego (p. ej. `docs/hitandrun/sumi-e/ART_DIRECTION_BRIEF.md`)
> son el contrato de ejecución por juego. Ver la sección 8 para la conciliación de tokens y las reglas de precedencia.

---

## 1. Filosofía y Premisa Artística General

El universo visual se inspira en el arte tradicional japonés *Sumi-e*, *Shan Shui* y *Yuki-e*.

* **Tinta como Materia del Mundo:** El entorno y los enemigos están hechos de tinta y papel. Los impactos dejan grietas permanentes, los enemigos se deshacen en salpicaduras y las vidas se representan como tinteros tradicionales.
* **El Color como Información Pura:** El gris y el negro monocromos construyen el paisaje y la neutralidad. El color se reserva exclusivamente para transmitir información crítica al jugador:
  * 🔴 **Rojo / Bermellón:** Amenaza, proyectiles enemigos, jefes y sellos hanko decorativos.
  * 🔵 **Azul Espíritu:** El jugador, sus disparos, estelas de movimiento y zonas seguras de agua.
  * 🟡 **Oro Talismán:** Recompensas, monedas, checkpoints e iconos de interfaz clave.
* **Vacío con Intención (Ma):** La niebla y el espacio negativo separan los planos de profundidad, manteniendo el centro de la pantalla despejado para la jugabilidad (*gameplay first*).

---

## 2. Paleta de Tokens Cromáticos y Semántica del Color

| Token Semántico | Código Hex | Uso Principal |
| :--- | :--- | :--- |
| **Papel (Washi)** | `#E7DFCB` | Fondo base y textura de pergamino claro |
| **Papel Claro** | `#F1EBDD` | Fondos limpios con alto espacio negativo |
| **Sumi Black** | `#151515` | Contornos, siluetas principales, texto y enemigos de tinta |
| **Tinta Gris** | `#5F6466` | Lavados oscuros, rocas, árboles y elementos lejanos |
| **Niebla (Bruma)** | `#C9D1D2` | Nubes, niebla atmosférica y separación de planos |
| **Montaña Azulada** | `#8FA3B3` | Cordilleras lejanas (*Shan Shui*) y pagodas |
| **Bermellón** | `#D7473F` | Sol plano, sellos hanko y acentos de diseño |
| **Sello Oscuro** | `#A8281F` | Sombras internas de sellos y detalles de relieve |
| **Rojo Oni** | `#B3261E` | Enemigos robustos y banderas de asedio |
| **Brillo de Amenaza** | `#FF3B30` | Proyectiles enemigos y ojos críticos |
| **Azul Espíritu** | `#4DA3FF` | Proyectiles del jugador, estelas y escudos |
| **Azul Oni / Ropa** | `#3E6FAE` | Unidades especiales y vestimentas aliadas |
| **Oro Talismán** | `#E3A92F` | Monedas, ofuda, checkpoints y marcos UI |
| **Marco Ornamental** | `#B9A272` | Orlas de pergamino y bordes de interfaz |

*Regla de Proporción:* La gran pantalla es papel, tinta y lavados (aprox. 80-85%). Los acentos de color ocupan zonas medias y los brillos (*glow*) son extremadamente escasos, limitados únicamente a proyectiles y recompensas.

---

## 3. Prompts Maestros para Generadores de IA (Midjourney / Imagen / DALL-E)

### Para Fondos y Paisajes (Shan Shui & Yuki-e)

> **Prompt:** `traditional Japanese sumi-e ink wash painting as video game background, aged washi paper texture, black ink brush strokes with dry-brush edges and ink splatters, muted gray-blue mountain washes and layered mist, flat red sun disc, small gold highlights, hand-painted, atmospheric depth, no photorealism --ar 16:9`

### Para Sprites de Personajes y Enemigos (Ukiyo-e & Yokai)

> **Prompt:** `2D video game sprite sheet of [insert character, e.g., Ronin warrior / Oni demon] on solid white background, traditional ukiyo-e and sumi-e ink art style, black ink outlines, flat color pigments with vermilion red accents, detailed traditional armor and brush textures, clean silhouette, no photorealism, game asset`

### Prompt Negativo Estricto (Para cualquier generador)

> `photorealistic, 3D render, glossy, neon, gradients, smooth vector, flat cartoon, modern UI, lens flare, extra limbs, blurry, garbled text, fake kanji, watermark, photographic lighting`

---

## 4. Guía de Interfaz (HUD), Sellos Hanko y Tipografía

* **Sellos Hanko (Inshō):** Contenedores UI cuadrados o rectangulares en rojo bermellón (`#D7473F`), con rotaciones sutiles (de `-1°` a `-8°`), bordes gruesos e irregularidades de tinta estampada a mano. Contienen kanjis funcionales (ej: `人生` para vidas, `正義` para justicia).
* **Tipografía:**
  * Títulos principales y kanjis ornamentales: *Yuji Boku*, *Noto Serif JP* o fuentes caligráficas tradicionales.
  * Estadísticas y textos occidentales: *Cinzel* (serif de alta autoridad histórica).
* **Contadores de Vida:** Tinteros tradicionales (`水墨` / `墨`) que se llenan de tinta roja o negra y se vacían a gris al recibir daño.

---

## 5. Procedimientos Gráficos y VFX en TypeScript Estricto

### A. Generador de Salpicaduras de Tinta (`createInkSplatter`)

```typescript
export function createInkSplatter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number = 15,
    color: string = '#151515',
    count: number = 16
): void {
    ctx.save();
    ctx.fillStyle = color;

    // Núcleo central
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();

    // Gotas satélites radiales
    for (let i = 0; i < count; i++) {
        const ang: number = Math.random() * Math.PI * 2;
        const dist: number = Math.random() * size * 2.5;
        const dropX: number = x + Math.cos(ang) * dist;
        const dropY: number = y + Math.sin(ang) * dist;
        const r: number = Math.random() * (size * 0.25) + 1;

        ctx.beginPath();
        ctx.arc(dropX, dropY, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
```

> **Nota de integración con el monorepo:** este helper usa `Math.random()`, lo cual es válido
> **solo para efectos de presentación** (VFX). Cualquier decisión de gameplay determinista
> debe usar `world.gameplayRandom`; los VFX pueden usar `world.renderRandom` si deben
> reproducirse de forma estable durante un rollback. Ver `AGENTS.md` § "Determinism".

### B. Cordilleras con Paralaje Shan Shui (`drawMountainRange`)

```typescript
export interface Point { x: number; y: number; }
export interface MountainRange { points: Point[]; color: string; }

export function drawMountainRange(
    ctx: CanvasRenderingContext2D,
    range: MountainRange,
    parallaxOffset: number,
    opacity: number,
    width: number,
    height: number
): void {
    ctx.save();
    ctx.fillStyle = range.color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.moveTo(-100, height);

    const pts: Point[] = range.points;
    for (let i = 0; i < pts.length - 1; i++) {
        const p1: Point = pts[i];
        const p2: Point = pts[i + 1];
        const cx: number = (p1.x + p2.x) / 2 - (parallaxOffset % width);
        const cy: number = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x - (parallaxOffset % width), p1.y, cx, cy);
    }
    ctx.lineTo(width + 100, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
```

### C. Kanji Cinético Flotante (`FloatingKanji`)

```typescript
export class FloatingKanji {
    private x: number;
    private y: number;
    private text: string;
    private alpha: number;
    private scale: number;

    constructor(x: number, y: number, text: string) {
        this.x = x;
        this.y = y;
        this.text = text; // e.g., '斬' (Corte), '爆' (Estallido)
        this.alpha = 1.0;
        this.scale = 1.5;
    }

    public update(): void {
        this.y -= 1.2;
        this.alpha -= 0.02;
        if (this.scale > 1.0) this.scale -= 0.03;
    }

    public draw(ctx: CanvasRenderingContext2D, cameraX: number): void {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = '#D7473F';
        ctx.font = `bold ${Math.round(28 * this.scale)}px 'Yuji Boku', serif`;
        ctx.fillText(this.text, this.x - cameraX, this.y);
        ctx.restore();
    }

    public isDead(): boolean {
        return this.alpha <= 0;
    }
}
```

---

## 6. Arquitectura de Temas Desacoplada (`GameTheme`)

Para garantizar que cualquier juego de la suite pueda alternar entre el estilo clásico y el estilo Sumi-e sin alterar sus físicas, se implementa el contrato de inyección:

```typescript
export interface ThemePalette {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
}

export interface GameTheme {
    readonly id: string;
    readonly name: string;
    readonly palette: ThemePalette;

    renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX?: number): void;
    renderImpactEffect(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void;
    renderExplosion(ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number): void;
}
```

---

## 7. Qué Evitar Absolutamente (Ojo Crítico)

* ❌ Fotorrealismo, renderizados 3D plásticos y texturas con brillos especulares modernos.
* ❌ Colores saturados fuera de los acentos semánticos (ningún fondo o interfaz con colores planos fluorescentes).
* ❌ Uso de texto generado por IA con deformaciones ortográficas o kanjis inventados sin sentido lógico.
* ❌ Gradientes lisos digitales sin la textura de grano y fibras del papel *Washi*.

---

## 8. Conciliación con la Suite del Monorepo (TinyAster / Hit & Run)

Esta Biblia es el **documento maestro cross-game**. Los briefs por juego son el **contrato de
ejecución** para cada título y tienen precedencia en sus ámbitos. Resolución de conflictos:

1. **Por juego:** gana el brief del juego (p. ej. `docs/hitandrun/sumi-e/ART_DIRECTION_BRIEF.md` para Hit & Run).
2. **Cross-game / nuevos juegos:** gana esta Biblia (paleta, semántica de color, prompts, tipografía).
3. **Engine obliga a ambos:** las restricciones del motor (`CanvasSpriteDrawer`, atlas `64×64`,
   viewport lógico `800×600`) no se negocian a nivel de arte; se documentan en el brief.

### 8.1 Mapa de tokens (Biblia ↔ Brief de Hit & Run)

El pipeline Sumi-e de Hit & Run ya está aprobado con su propio set de tokens. **No mezclar
valores dentro de un mismo juego**; usar la columna del brief en Hit & Run y la de la Biblia
en juegos nuevos, hasta que una revisión futura unifique el set.

| Concepto | Biblia (maestra) | Brief Hit & Run (aprobado) | Estado |
| --- | --- | --- | --- |
| Papel washi | `paper` `#E7DFCB` | `paper.base` `#E8E3D4` | ⚠️ divergente |
| Papel claro | `papel claro` `#F1EBDD` | `paper.highlight` `#F2EEE3` | ⚠️ divergente |
| Tinta principal | `Sumi Black` `#151515` | `ink.primary` `#171817` | ⚠️ divergente |
| Tinta secundaria | `Tinta Gris` `#5F6466` | `ink.muted` `#3A3A35` | ⚠️ divergente |
| Bermellón (sellos/peligro) | `#D7473F` | `accent.vermilion` `#C0392B` | ⚠️ divergente |
| Sello sombra | `Sello Oscuro` `#A8281F` | `accent.vermilionDark` `#8E2A20` | ⚠️ divergente |
| Oni azul | `Azul Oni` `#3E6FAE` | `oni.blue` `#3D6FA5` | ⚠️ divergente |
| Oni rojo | `Rojo Oni` `#B3261E` | `oni.red` `#B53A2A` | ⚠️ divergente |
| Oro | `Oro Talismán` `#E3A92F` | `accent.gold` `#B8963E` | ⚠️ divergente |
| Niebla | `#C9D1D2` | washes `rgba(23,24,23,α)` `0.08–0.32` | ⚠️ enfoque distinto (tinte vs. alpha de tinta) |

Los lavados de montaña del brief se definen como **alpha de tinta** (`rgba(23,24,23,α)`) en
cuatro planos (`wash.mountain/mid/near/foreground`); la Biblia usa tints de gris/azul.
Ambos son válidos; no modular un paisaje ya aprobado.

### 8.2 Reglas del motor que la Biblia debe respetar (procedentes del brief)

- **Atlas de personajes:** `8 × 5` grid, celdas `64 × 64`, PNG-32 alpha straight, ancla
  `(0.5, 0.94)`, frame map fijo (`idle/walk/attack/hurt/empty/death`). No proponer celdas
  de otro tamaño sin un renderer por asset.
- **Viewport lógico:** `800 × 600` (4:3); a `64 px`, detalles < 2 px desaparecen.
- **Prompts de sprites:** sin texto ni kanji dentro del sprite. La tipografía (Hanko, kanji
  cinético, `FloatingKanji`) se compone en runtime con fuentes web; nunca se hornea en el PNG.
- **Color-máx por personaje:** ≤ 8 colores (6 tintas + 2 acentos); prohibido `#000000` /
  `#FFFFFF` puros como relleno.
- **El sprite del samurai se carga con clave única** (`hitrun_samurai_enemy`) y no pasa por el
  tema; cualquier adaptación Sumi-e de un sprite requiere clave por tema o `tint`/`assetKey`
  resuelto por tema.
- **HUD React + HUD canvas comparten tokens**; el HUD de neón actual (`rgba(10,10,20,0.75)`,
  `colors.cyan`) rompe la estética si no se puentean los tokens.

### 8.3 Procedimientos VFX (sección 5) en el contexto del monorepo

- `createInkSplatter` y `drawMountainRange` son **helpers de presentación** que viven en la
  capa de renderer (web = `@tiny-aster/renderer-canvas`); no deben mutar estado de gameplay ni
  almacenar estado en sistemas (ver `AGENTS.md` § Registering Systems).
- `FloatingKanji` debe instanciarse como entidades/efectos del mundo o del renderer por tema,
  no como estado de un `System`.
- El contrato `GameTheme` (sección 6) complementa el sistema de temas descrito en
  `docs/AESTHETIC_THEME_SYSTEM_ROADMAP.md`; alinearlo con ese roadmap antes de implementarlo.

### 8.4 Documentos hermanos

| Documento | Rol |
| --- | --- |
| `docs/hitandrun/sumi-e/ART_DIRECTION_BRIEF.md` | Contrato visual/técnico por juego (Hit & Run) |
| `docs/hitandrun/sumi-e/PROMPT_CARD.md` | Flujo de generación de assets y bloque de estilo |
| `docs/hitandrun/sumi-e/ASSET_AUDIT.md` | Auditoría de assets actuales vs. paleta |
| `docs/AESTHETIC_THEME_SYSTEM_ROADMAP.md` | Roadmap del sistema de temas desacoplado |
