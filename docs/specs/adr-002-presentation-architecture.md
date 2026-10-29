# ADR-002: arquitectura de presentación sustituible

- Estado: aceptado para la primera implementación; migración en curso.
- Fecha: 2026-10-29.
- Ámbito: ArcadeGames, sistema visual transversal.
- Objetivo: permitir que cualquier juego cambie su presentación completa sin cambiar sus reglas, sistemas ECS ni el resultado de la simulación.

## Contexto observado

El repositorio ya tiene varios mecanismos de presentación:

- packages/core/src/theme/Theme.ts mantiene mapas de colores/sprites, efectos, perfiles visuales y configuración narrativa dentro del recurso Theme.
- src/games/hitandrun/rendering/theme/HitRunTheme.ts declara operaciones para fondos, sombras, entidades, proyectiles, feedback, HUD, banners y ciclo de vida.
- src/games/hitandrun/rendering/theme/ThemeRegistry.ts combina un catálogo con una instancia activa global; cambiar el tema destruye esa instancia.
- src/games/hitandrun/mods/registry.ts añade otra fachada sobre el registro de temas.
- src/games/shared/rendering/DrawAdapter.ts abstrae un subconjunto de dibujo, pero sus operaciones no cubren todas las necesidades de composición de Sumi-e.
- src/games/shared/rendering/sumi-e/AestheticTheme.ts ya configura las estéticas sumi-e, cosmic y neon.
- src/context/GameThemeContext.ts y GameThemeProvider.tsx alimentan los componentes React, pero ese contrato no es el mismo que emplea el renderizador.
- Canvas y Skia comparten parte del modelo ECS y tienen implementaciones nativas distintas. El contrato actual de Hit & Run combina un método Canvas obligatorio con un método Skia opcional para el fondo.
- src/games/shared/rendering/visual-composition/ contiene ya una abstracción de composición de escenas que debe evaluarse antes de crear otra.

El problema no se resuelve unificando solamente las paletas. Se necesita una frontera para snapshots, temas, dibujo, selección de temas y recursos de presentación que abarque el mundo de juego y la UI React.

## Decisión

### 1. Separar simulación, adaptador de juego, tema y backend

1. Los sistemas ECS y el gameplay no importan temas, pintores, componentes React ni tipos de Canvas/Skia.
2. Cada juego adapta su estado a snapshots tipados de solo lectura. El tema no recibe World ni modifica componentes.
3. El tema consume snapshots y operaciones de PresentationPainter, no APIs nativas de Canvas o Skia.
4. Los adaptadores Canvas y Skia implementan la misma semántica de dibujo.
5. Los componentes React reciben una proyección de los mismos ajustes de tema y tokens semánticos; no mantienen una selección visual paralela.

### 2. Mantener separados los contratos de motor y de presentación

Theme en @tiny-aster/core seguirá siendo un contrato de compatibilidad durante la migración. Sus mapas y perfiles existentes se adaptarán a la nueva configuración; el recurso no absorberá renderizado de escenas, gestión de imágenes ni dependencias de UI.

AestheticThemeConfig y las paletas históricas de Sumi-e también se conservarán mientras haya consumidores que dependan de sus campos actuales. Los adaptadores normalizarán esos valores; la migración no debe cambiar colores visibles de forma accidental.

### 3. Definir un contrato de dibujo backend-neutral

PresentationPainter cubrirá las primitivas necesarias para el sistema: rutas y curvas, transformaciones, recortes, formas, degradados, texto y dibujo de assets precargados por una clave semántica. Las fuentes de imágenes y los objetos nativos quedan dentro de los adaptadores de recursos/backend.

El contrato se ampliará según las necesidades reales de los temas existentes. No debe crecer con primitivas hipotéticas que ningún consumidor utilice.

### 4. Definir temas tipados por juego

Cada registro tiene un tipo de snapshots concreto para ese juego. No se fuerza una entidad universal llena de campos opcionales ni se utiliza any/unknown para borrar diferencias entre géneros.

Los temas exponen un descriptor con id, nombre y capacidades. Si un tema declara una capacidad de renderizado, debe implementar la operación correspondiente. El registro comprueba esta coherencia al crear la instancia.

### 5. Separar registro de instancia

El registro guarda definiciones/fábricas y no mantiene una instancia global activa. Cada sesión crea y posee su propia instancia de tema. Una resolución de tema desconocido devuelve el fallback y deja explícito usedFallback; si no existe el fallback configurado, la resolución falla con un error.

La instancia es responsable de liberar sus propios recursos mediante dispose(). El catálogo no libera instancias de sesiones ajenas ni reutiliza automáticamente instancias entre sesiones.

### 6. Inyectar la aleatoriedad cosmética

Los temas reciben un generador cosmético por sesión. La variación visual no consume el RNG determinista de gameplay ni depende de Math.random(). La semilla y el generador quedan explícitos en el contexto de creación del tema.

### 7. Mantener separados tema, assets, composición y gameplay

- Los tokens describen valores semánticos.
- Los manifiestos identifican assets por clave, sin exponer tipos nativos.
- Las composiciones determinan el orden y el comportamiento de capas.
- Los adaptadores de juego producen snapshots.
- Los mods que cambian reglas de juego permanecen en gameplay; solo sus representaciones visuales pertenecen a presentación.

### 8. Ubicación y extracción de paquete

El contrato inicial vive en src/games/shared/presentation/. No se creará todavía packages/presentation-kit: antes hay que demostrar el contrato con Hit & Run y un segundo género. Tras esa prueba se evaluará extraer el código común a un paquete independiente, con dependencias y límites públicos explícitos.

## Contratos iniciales en código

- src/games/shared/presentation/PresentationContracts.ts: capacidades, viewport/cámara/frame, painter, manifiestos semánticos de recursos, contexto de creación y tema tipado.
- src/games/shared/presentation/PresentationThemeRegistry.ts: catálogo por tipo de juego, fallback explícito, validación de capacidades e instancias separadas por sesión.
- src/games/shared/presentation/__tests__/PresentationThemeRegistry.test.ts: pruebas del registro, fallback, id duplicado, validación de capacidades y aislamiento de instancia.

Estos contratos son la primera frontera ejecutable. No reemplazan todavía a HitRunTheme, Theme, AestheticThemeConfig o GameThemeProvider; esos adaptadores forman parte del trabajo de migración.

## Fase 1: salida requerida

- Inventario de dependencias completado para Theme, temas de Hit & Run, registro, DrawAdapter, renderizadores, contexto React y sistemas visuales compartidos.
- Contrato de presentación, selección, snapshots, recursos y ciclo de vida documentado.
- Pruebas de aislamiento y coherencia de capacidades en verde.
- ADR y matriz de migración vinculados.
- Baseline visual y determinista de Hit & Run registrado antes del primer cambio de renderer.

## Fase 2: piloto Sumi-e en Hit & Run

1. Adaptar HitRunTheme a los contratos nuevos manteniendo una fachada temporal para sus consumidores.
2. Implementar CanvasThemePainter y SkiaThemePainter; probar las primitivas que usa realmente el tema.
3. Migrar registro y selección a instancias por sesión; mantener compatible activateHitAndRunTheme mientras haya consumidores.
4. Separar manifiestos de atlas de personajes y manifiestos de entornos estáticos. Reutilizar AssetLoader y definir coordenadas de mundo/pantalla/parallax.
5. Migrar paisaje, sprites, animaciones, proyectiles, feedback, HUD y banners a la presentación compartida.
6. Alimentar los tokens de React desde la misma configuración resuelta.
7. Verificar Canvas/Skia, ciclo de vida de assets, accesibilidad, resoluciones y paridad de simulación.

## Criterios de aceptación final

- Cambiar tema no modifica sistemas de gameplay ni los componentes ECS.
- La misma semilla e inputs conservan el mismo estado de simulación por tick.
- Dos sesiones pueden usar temas diferentes simultáneamente.
- Canvas y Skia consumen el mismo contrato semántico y producen la misma composición lógica.
- La UI React y el renderer resuelven la misma selección de tema.
- No quedan dependencias de presentación hacia código interno de Hit & Run en los módulos compartidos.
- La compatibilidad se retira únicamente tras comprobar que no quedan consumidores.

## Riesgos y decisiones pendientes antes de extraer un paquete

- Definir qué campos exactos de visual-composition se reutilizan, en lugar de duplicar un compositor.
- Completar el contrato de carga/caché de assets cuando se audite el ciclo de vida real de AssetLoader para Canvas y Skia.
- Documentar el nivel de accesibilidad comprometido; hasta entonces, los informes no deben declarar esa conformidad como evaluada.
- Añadir el segundo juego piloto antes de dar por validada la generalidad del contrato.
