# Hit&Run — Aesthetic Guidelines
**Neo-Retro Military Pop | Pseudo-3D Belt-Scroll**

Documento de referencia estética y de implementación visual.  
Versión 1.0 — Octubre 2026

---

## 1. Visión General

Hit&Run es una reimaginación moderna de los clásicos run-and-gun / belt-scroll (Metal Slug como referencia principal).  
No es un remaster pixel-art ni un realismo fotográfico. Es **Neo-Retro Military Pop**:

- Preserva el ADN cartoon-militar exagerado, el humor y la legibilidad instantánea.
- Traduce ese ADN a un lenguaje visual contemporáneo (2025+): limpio, con peso, contraste fuerte e identidad de marca poderosa.

**Objetivo emocional:**  
El jugador debe sentir que está jugando un Metal Slug que podría haber salido en 2025: legible a cualquier resolución, con personalidad visual fuerte, humor intacto y una identidad gráfica reconocible a 10 metros de distancia (key art, store thumbnails, posters).

---

## 2. Principios Estéticos Fundamentales

Estos principios son **no negociables** y deben aplicarse en todas las fases de implementación:

1. **Siluetas ultra-claras**  
   Todo personaje, enemigo, vehículo y prop debe ser legible instantáneamente por su silueta, incluso a escala pequeña o en movimiento rápido.

2. **Pies anclados al suelo**  
   `Transform.y` = línea de pies. Nunca se dibuja el sprite centrado en Y. El origen visual siempre son los pies.

3. **Sombra de suelo obligatoria**  
   Toda entidad con elevación tiene una sombra elíptica en el plano del suelo. La sombra se separa, se reduce y se aclara con la altura.

4. **Escala por profundidad**  
   Personajes más pequeños al fondo, más grandes al frente. Rango recomendado: `lerp(0.72, 1.18, depthT)`.

5. **Contraste personaje / entorno**  
   Personajes con colores vivos y saturados. Entornos más controlados, desaturados o con niebla atmosférica.

6. **Peso visual**  
   Todo debe sentirse sólido: metales, telas, explosiones, impactos. Evitar sensación de “sprites flotantes” o “paper cutouts”.

7. **Legibilidad > Detalle**  
   Priorizar lectura clara sobre cantidad de detalle. El detalle se concentra en primer plano y en momentos de máximo impacto.

---

## 3. Dirección de Arte

### 3.1 Estilo de Render
- Ilustración digital semi-realista 2.5D / high-definition.
- Volumen claro con sombras duras (no cel-shading plano ni realismo sucio).
- Contornos expresivos y gruesos en personajes (estilo “inked” moderno). Los contornos pueden desaparecer o suavizarse en el fondo.
- Texturas táctiles: metal cepillado, tela militar gastada, polvo, sangre cartoon, explosiones con partículas densas y legibles.
- Animación: alta frame-rate + squash & stretch exagerado + motion blur selectivo.

### 3.2 Influencias Visuales
- Ilustración de personajes de *Hades*
- Peso y feedback de *Doom Eternal*
- Humor visual y exageración de *Cuphead* (actualizado)
- Diseño industrial limpio de vehículos contemporáneos
- Color scripting y energía de *Spider-Verse* / Studio Trigger modernizado

### 3.3 Proporciones de Personajes
- Atlético-heroicas: hombros anchos, cintura estrecha, piernas potentes.
- Expresiones faciales exageradas y legibles (ojos grandes, bocas expresivas).
- Mantener el humor cartoon aunque el render sea de alta definición.

---

## 4. Paleta de Color

### 4.1 Base (anclaje militar)
- Verde oliva oscuro
- Grises antracita
- Beige desierto / arena

### 4.2 Acentos agresivos
- Naranja quemado
- Rojo sangre cartoon
- Amarillo neón
- Cian eléctrico (explosiones, ojos, detalles de vehículos, UI)

### 4.3 Reglas de uso
- Personajes: colores vivos y saturados.
- Entornos: más desaturados o con niebla atmosférica controlada.
- Color scripting por misión:
  - Desierto → cálido
  - Ciudad nocturna → frío
  - Base subterránea → verde tóxica / cian

---

## 5. Sistema de Profundidad y Render (Roadmap Técnico + Estética)

El render actual no aprovecha la profundidad. El siguiente roadmap debe implementarse **en este orden de prioridad**.

### Fase 0 — Modelo de profundidad (Fundación)
**Objetivo:** Separar posición en el suelo de altura real.

- `Transform.y` = línea de pies (suelo).
- Crear/usar `BeltDepth` → `depthT = (y - depthMin) / (depthMax - depthMin)` (0 = fondo, 1 = frente).
- Añadir `BeltElevationComponent` (`z` = altura sobre el suelo).
- Hop / knockback afectan solo a `elevation.z`, nunca a `Transform.y`.

### Fase 1 — Y-Sorting (máximo impacto inmediato)
**Objetivo:** Entidades más abajo en pantalla se dibujan delante.

- Modificar sort en `CanvasRenderer.renderWorld`:
  ```ts
  return (renderA.order - renderB.order) || (transformA.y - transformB.y);
  ```
- Preferible: flag `depthSort: boolean` en `RenderComponent` (opt-in).
- Alternativa: `HitRunDepthSortSystem` que actualice `Render.order = base + floor(y)`.

### Fase 2 — Pies anclados + Sombra de suelo
**Objetivo:** Eliminar la sensación de “flotar”.

Reglas obligatorias para **todos** los drawers (`drawHitRunPlayer` y los 5 drawers de enemigos):

- Origen del sprite = pies (`y = 0`).
- Cabeza/torso se dibujan hacia arriba (`y` negativo).
- Sombra elíptica se dibuja **primero** en el suelo (sin offset de elevación).
- Luego `ctx.translate(0, -elevation.z)` solo al cuerpo.
- Sombra se escala y aclara: `scale = 1 - clamp(elevation.z / maxZ, 0, 0.7)`.
- La sombra debe sentirse sólida y legible (no blob difuso).

### Fase 3 — Escala por profundidad
**Objetivo:** Perspectiva real.

- `BeltDepthScaleSystem` escribe `VisualOffset.scaleX/scaleY`:
  ```ts
  scale = lerp(0.72, 1.18, depthT);
  ```
- No tocar drawers (el renderer ya soporta scale).
- Colliders: reducir altura a franja de pies (`halfHeight ≈ size * 0.12–0.18`).

### Fase 4 — Suelo del belt con lectura de perspectiva
**Objetivo:** Que el área de juego se lea como un plano, no como un vacío.

En `HitRunBackdropCanvas` añadir `drawBeltFloor`:

- Gradiente vertical (más claro/saturado abajo, más oscuro/desaturado arriba).
- Textura de suelo (tablones, adoquines o placas metálicas) con líneas convergentes hacia el fondo.
- Borde superior claro que separa fondo del plano de juego.
- Revisar `drawPlayfieldMask` para que delimite sin oscurecer el suelo.
- El suelo scrollea a 1.0× cámara.

### Fase 5 — Combate en profundidad
- Hitboxes melee: además de overlap en X, exigir `|dy| < threshold` (~22-28 px).
- Spawns de waves distribuidos en todo el rango `depthMin–depthMax`.
- AI: enemigos primero alinean su `y` con el jugador (caminan en “lane”) y luego se acercan.
- Verificar clamp de cámara y gates.

### Fase 6 — Pulido estético final
- Salto / knockback: sombra se separa, cuerpo sube, squash al aterrizar.
- Facing vertical: `vy < 0` → espalda / ¾ trasero; `vy > 0` → cara.
- Props y obstáculos con el mismo y-sorting (oclusión real).
- Niebla / atenuación suave cerca de `depthMin`.
- Screen-shake y feedback de impacto generoso pero controlado.
- Explosiones y partículas con volumen y peso.

---

## 6. Orden de Ejecución Recomendado

| Prioridad | Fase                    | Por qué primero                                      |
|-----------|-------------------------|------------------------------------------------------|
| 1         | Fase 1 (Y-Sorting)      | Cambio mínimo, efecto visual inmediato               |
| 2         | Fase 2 (Pies + Sombra)  | Elimina el “flotar”                                  |
| 3         | Fase 0 (Elevation)      | Necesario para sombra y salto correctos              |
| 4         | Fase 4 (Suelo)          | Sin suelo, el y-sort no se “lee”                     |
| 5         | Fase 3 (Escala)         | Refuerza perspectiva una vez hay suelo               |
| 6         | Fases 5–6               | Gameplay + pulido final                              |

---

## 7. UI / HUD

- Minimalista y táctico.
- Tipografía geométrica bold.
- Iconos claros y legibles.
- Barras de vida / munición con diseño de panel militar moderno.
- Menús con sensación de “interfaz de misión” (mapas tácticos, siluetas de personajes).
- Feedback visual inmediato y generoso (hit-stop, screen shake controlado, particle bursts legibles).

---

## 8. Checklist de Calidad Visual (Definition of Done)

Antes de considerar una fase terminada, verificar:

- [ ] Siluetas legibles a cualquier escala y profundidad
- [ ] Pies perfectamente anclados al suelo
- [ ] Sombra de suelo correcta (posición, escala, opacidad)
- [ ] Y-sorting correcto (entidades más abajo se dibujan delante)
- [ ] Escala por profundidad aplicada
- [ ] Suelo con lectura clara de perspectiva
- [ ] Contraste personaje / entorno respetado
- [ ] Ningún sprite se siente “flotante”
- [ ] Feedback de impacto y explosiones tiene peso
- [ ] El conjunto se siente moderno, sólido y con personalidad

---

## 9. Notas Finales

Este documento es la fuente de verdad estética del proyecto.  
Cualquier decisión de arte, animación o rendering debe alinearse con estos principios.

Si surge conflicto entre detalle técnico y legibilidad / peso visual, **priorizar siempre legibilidad y peso**.

---

*Documento generado para el equipo de Hit&Run — Neo-Retro Military Pop*
