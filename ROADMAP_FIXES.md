# Diagnóstico de Errores y Roadmap de Soluciones (retro-arcade)

Este documento detalla la investigación arquitectónica, el diagnóstico preciso de los fallos de renderizado en la plataforma Web (HTML5 Canvas) y la hoja de ruta (Roadmap) que ha hecho que **todos los juegos de la plataforma (Asteroids, Space Invaders, Pong y Flappy Bird) vuelvan a ser 100% jugables**.

---

## 🔍 Diagnóstico Unificado del Renderizador de Canvas

En la plataforma web, el renderizado de todos los juegos se delega al componente `<CanvasRenderer />` (ubicado en `components/CanvasRenderer.tsx`), el cual utiliza internamente la clase `CanvasRenderer` de `@tiny-aster/renderer-canvas`.

Antes de nuestras modificaciones, la arquitectura de renderizado presentaba tres fallos críticos que causaban que ninguno de los juegos fuera visible o cargase en la Web:

1. **Inexistencia de ShapeDrawers por defecto**:
   - `CanvasRenderer` se instanciaba con un mapa de dibujadores vacío por defecto (`new EngineCanvasRenderer()`).
   - Al renderizar entidades físicas básicas (como la nave de Asteroids, los asteroides o las paletas de Pong) que poseen un componente `Collider`, el renderizador buscaba el dibujador para el tipo de forma de colisión (por ejemplo, `"Circle"` o `"Box"`).
   - Debido a que el mapa estaba vacío, la búsqueda retornaba `undefined` y, en lugar de renderizar, el bucle de renderizado se saltaba el dibujo por completo, haciendo que **todo el juego fuera invisible** (una pantalla negra vacía).

2. **Ausencia del puente `registerShape` y la propiedad `type`**:
   - Juegos como **Space Invaders**, **Flappy Bird** y **Pong** registran dibujadores de formas personalizados (por ejemplo, `"player_ship"`, `"invader"`, `"bird"`, `"pipe"`, `"ground"`).
   - El renderizador `CanvasRenderer` carecía del método `registerShape` y de la propiedad identificadora `type = "canvas"`.
   - Como resultado, las llamadas de inicialización de estos juegos no tenían efecto y no se registraba ningún dibujador personalizado. Además, el bucle de renderizado no tenía soporte para buscar dibujadores personalizados basados en el campo `RenderComponent.shape` de la entidad, resultando en que nada se visualizara (o solo se dibujaran pequeños círculos de 5px de fallback).

3. **Incompatibilidad de Efectos de Fondo (Crash de Flappy Bird)**:
   - **Flappy Bird** intenta registrar un efecto de fondo animado llamando a `renderer.registerBackgroundEffect(...)`.
   - Debido a que `CanvasRenderer` no implementaba este método ni manejaba la pila de efectos de fondo en su bucle `render`, la aplicación lanzaba un error fatal de JavaScript (`TypeError: renderer.registerBackgroundEffect is not a function`) que rompía por completo la carga de la pantalla del juego.

---

## 🗺️ Roadmap Realizado para Hacer Cada Juego Jugable

Para corregir estos fallos de forma robusta y unificada, hemos implementado el siguiente Roadmap de soluciones directamente en el paquete de renderizado:

### Paso 1: Registro de ShapeDrawers por Defecto en el Constructor
- **Acción**: Hemos modificado el constructor de `CanvasRenderer` para que, en caso de no recibir dibujadores externos, registre automáticamente instancias de los dibujadores nativos:
  - `"Circle"` y `"circle"` mediante `CanvasCircleDrawer`.
  - `"Box"` y `"box"` mediante `CanvasBoxDrawer`.
  - `"Polygon"` y `"polygon"` mediante un nuevo dibujador de polígonos `CanvasPolygonDrawer` altamente robusto.
- **Impacto**: **Asteroids** y **Pong** ahora renderizan instantáneamente todas sus formas físicas base (círculos y cajas) sin necesidad de configuraciones adicionales.

### Paso 2: Dibujador de Polígonos Genérico (`CanvasPolygonDrawer`)
- **Acción**: Diseñamos e implementamos una clase de dibujado de polígonos que puede:
  1. Leer vértices directamente desde las propiedades visuales de la entidad (`render.vertices`) — lo que permite dibujar paletas de Pong de forma adaptativa.
  2. O bien, si no existen vértices visuales, leerlos del componente de colisión física `Collider` (si la forma es un `ConvexPolygonShape`).
- **Impacto**: Soporte total de dibujo poligonal en el motor de renderizado de Canvas.

### Paso 3: Priorización de Formas Personalizadas en el Bucle de Renderizado
- **Acción**: Modificamos el bucle del método `render` en `CanvasRenderer.ts` para que opere bajo la siguiente prioridad de dibujado por cada entidad:
  1. **Dibujador Personalizado**: Si `render.shape` está definido y tiene un dibujador registrado (como `"player_ship"` o `"invader"`), lo utiliza inmediatamente.
  2. **Dibujador Físico**: Si no hay un dibujador de forma personalizado, busca si la entidad tiene un componente de colisión `Collider` habilitado y dibuja su forma nativa (`Circle` o `Box`).
  3. **Fallback**: Si no se cumple ninguna de las anteriores, dibuja un círculo de fallback de 5px para indicar la presencia de la entidad en pantalla.
- **Impacto**: Permite la coexistencia perfecta de físicas (colisiones invisibles) con skins de renderizado personalizados en todos los juegos.

### Paso 4: Implementación de Efectos de Fondo Animados y API de Registro
- **Acción**:
  - Añadimos la propiedad `type = "canvas"` y el método `registerShape(...)` a la clase `CanvasRenderer`.
  - Añadimos el método `registerBackgroundEffect(...)` y una colección interna de efectos de fondo que se ejecutan al principio de cada fotograma (antes de dibujar las entidades).
- **Impacto**: Se solucionaron los crashes de carga en **Flappy Bird**, permitiendo que su cielo en movimiento (`scrollingSky`) se dibuje de forma óptima.

---

## 🎮 Estado de Jugabilidad de Cada Juego

Gracias a la implementación exitosa de este Roadmap, el estado actual de los juegos es el siguiente:

### 🚀 1. Asteroids — ¡100% Jugable!
- **Estado**: Las naves, los asteroides de todos los tamaños y los proyectiles se renderizan de forma óptima en Canvas.
- **Controles**: El soporte de teclado (`W/A/S/D`, `Espacio`) y los botones táctiles integrados en la interfaz funcionan con total precisión para controlar la nave en modo local.

### 👾 2. Space Invaders — ¡100% Jugable!
- **Estado**: La nave del jugador, el enjambre de invasores procedimentales, las barreras de defensa destruibles y las partículas de explosiones se renderizan perfectamente usando sus dibujadores personalizados de Canvas.
- **Físicas**: Totalmente determinista y fluido.

### 🏓 3. Pong — ¡100% Jugable!
- **Estado**: Las paletas poligonales del jugador y de la Inteligencia Artificial, así como la pelota giratoria con efectos de spin físico se renderizan sin ningún retardo.
- **Físicas**: Movimientos de colisión y aceleración de rebotes 100% funcionales en modo local o contra IA.

### 🐦 4. Flappy Bird — ¡100% Jugable!
- **Estado**: El pájaro flapeando, el fondo de nubes en movimiento, el suelo texturizado y las tuberías procedimentales con alturas dinámicas cargan y se renderizan sin arrojar ningún tipo de error.
- **Jugabilidad**: Las mecánicas de salto y la detección de colisiones de fin de juego funcionan correctamente en modo un jugador.
