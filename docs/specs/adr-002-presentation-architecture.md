# ADR-002: arquitectura de presentación sustituible

- Estado: aceptado para la primera implementación; migración en curso.
- Fecha: 2026-10-29.
- Ámbito: ArcadeGames, sistema visual transversal.
- Objetivo: permitir que cualquier juego cambie su presentación completa sin cambiar reglas, sistemas ECS ni el resultado de la simulación.

## Contexto

El repositorio tiene varias soluciones parciales: Theme en el core, HitRunTheme y ThemeRegistry específicos de Hit & Run, AestheticThemeConfig, DrawAdapter, los renderizadores Canvas/Skia, visual-composition y GameThemeProvider. La auditoría detallada queda registrada en docs/audit/2026-10-29-presentation-phase1-inventory.md.

El problema no se resuelve unificando solamente las paletas. Se necesita una frontera para snapshots, tokens, dibujo, selección de temas y recursos de presentación que abarque el mundo de juego y la UI React.

## Decisiones

### 1. Separar simulación, adaptador de juego, tema y backend

1. Los sistemas ECS y gameplay no importan temas, pintores, componentes React ni tipos concretos de Canvas/Skia.
2. Cada juego adapta el estado a snapshots tipados de solo lectura. El tema no recibe World ni modifica componentes.
3. El tema consume snapshots y operaciones de PresentationPainter, no APIs nativas de Canvas o Skia.
4. Los adaptadores Canvas y Skia implementan la misma semántica de dibujo.
5. Los componentes React reciben una proyección de la misma definición y tokens semánticos; no mantienen una selección visual paralela.

### 2. Mantener separados los contratos de motor y presentación

Theme en @tiny-aster/core seguirá siendo un contrato de compatibilidad. Sus mapas y perfiles se adaptarán a la nueva configuración; el recurso no absorberá composición de escenas, gestión de imágenes ni dependencias de UI.

AestheticThemeConfig y las paletas históricas de Sumi-e se conservarán mientras haya consumidores que dependan de sus campos actuales. Los adaptadores normalizarán esos valores; la migración no debe cambiar colores visibles de forma accidental.

### 3. Snapshots comunes con extensiones tipadas

PresentationFrame define viewport, cámara, reloj de presentación, tick de referencia y preferencias de accesibilidad. PresentationEntitySnapshot, PresentationSceneSnapshot, PresentationFeedbackEventSnapshot, PresentationHudSnapshot y PresentationBannerSnapshot ofrecen estructuras semánticas compartidas. Los juegos pueden ampliar esos modelos con campos tipados; no se fuerza una entidad universal llena de campos irrelevantes.

### 4. Tokens normalizados y tokens específicos del tema

PresentationThemeTokens define roles comunes de color, tipografía y layout para los consumidores React y el renderer. Su campo custom conserva el modelo específico de una estética, incluyendo los grupos semánticos tipados de Sumi-e. Los adaptadores de compatibilidad traducen paletas antiguas a los roles comunes. No se elimina ningún token histórico hasta migrar y probar sus consumidores.

### 5. Contrato de dibujo backend-neutral

PresentationPainter cubre rutas y curvas, transformaciones, recortes, formas, degradados, texto y dibujo de assets precargados por clave semántica. Las fuentes de imágenes y los objetos nativos permanecen dentro de los adaptadores de recursos/backend.

El contrato se amplía según las necesidades reales de los temas existentes. No sustituye CanvasRenderer ni SkiaRenderer, que siguen recorriendo la escena ECS y ejecutando los drawers registrados.

### 6. Temas tipados por juego

Cada registro tiene tipos concretos de snapshots para ese juego. Los temas exponen descriptor y capacidades. Si se declara una capacidad de renderizado, la operación correspondiente debe existir; la creación valida que metadatos y métodos coincidan.

### 7. Separar catálogo e instancia por sesión

El registro guarda definiciones y tokens; no mantiene una instancia global activa. createSession() devuelve una unidad que contiene definición resuelta, descriptor, tokens, instancia, metadatos de fallback y ciclo de vida. La UI y el renderer deben consumir esa misma unidad. Cada sesión crea y posee una instancia propia. Una resolución de tema desconocido devuelve el fallback de forma explícita con usedFallback; si el fallback no existe, la resolución falla. dispose() es idempotente y libera únicamente la instancia que posee la sesión.

### 8. Aleatoriedad cosmética inyectada

Los temas reciben un generador cosmético por sesión. La variación visual no consume el RNG determinista de gameplay ni depende de Math.random(). La semilla y el generador están explícitos en el contexto de creación.

### 9. Mantener separados tema, assets, composición y gameplay

- Tokens describen valores semánticos.
- Manifiestos identifican assets por clave, sin exponer tipos nativos.
- Composición determina orden y comportamiento de capas.
- Adaptadores de juego producen snapshots.
- Mods que cambian reglas permanecen en gameplay; solo sus representaciones pertenecen a presentación.

### 10. Ubicación y extracción de paquete

El contrato inicial vive en src/games/shared/presentation/. No se creará todavía packages/presentation-kit: antes hay que demostrar el contrato con Hit & Run y un segundo género. Después se evaluará una extracción con límites y dependencias públicas explícitos.

## Contratos iniciales en código

- PresentationContracts.ts: snapshots, tokens, painter, manifiestos semánticos, contexto de creación y tema tipado.
- PresentationThemeRegistry.ts: catálogo tipado, tokens normalizados, fallback explícito, validación de capacidades y createSession() con propiedad del ciclo de vida.
- PresentationThemeRegistry.test.ts: pruebas de aislamiento, fallback, duplicados, tokens y capacidades.
- docs/audit/2026-10-29-presentation-phase1-inventory.md: inventario de módulos, riesgos y decisiones de migración.

## Fase 1: salida requerida

- Inventario de dependencias completo para Theme, temas de Hit & Run, registros, DrawAdapter, renderizadores, contexto React y sistemas visuales compartidos.
- Contrato de presentación, selección, tokens, snapshots, recursos y ciclo de vida documentado.
- Pruebas de aislamiento y coherencia de capacidades en verde.
- Baseline visual y determinista de Hit & Run antes de sustituir el renderer.
- Matriz de migración con adaptadores de compatibilidad identificados.

## Fase 2: piloto Sumi-e en Hit & Run

1. Adaptar HitRunTheme al nuevo contrato conservando una fachada temporal.
2. Implementar CanvasThemePainter y SkiaThemePainter y probar las primitivas utilizadas realmente.
3. Migrar el registro a instancias por sesión; mantener compatible activateHitAndRunTheme mientras tenga consumidores.
4. Separar manifiestos de atlas de personajes y manifiestos ambientales; reutilizar AssetLoader y definir coordenadas de mundo/pantalla/parallax.
5. Migrar paisaje, sprites, animaciones, proyectiles, feedback, HUD y banners a la presentación compartida.
6. Alimentar tokens React desde la misma definición resuelta.
7. Verificar backends, lifecycle de assets, accesibilidad, resoluciones y paridad de simulación.

## Criterios de aceptación final

- Cambiar tema no modifica los sistemas de gameplay ni los componentes ECS.
- La misma semilla e inputs conservan el mismo estado de simulación por tick.
- Dos sesiones pueden usar temas diferentes simultáneamente.
- Canvas y Skia consumen el mismo contrato semántico y producen la misma composición lógica.
- UI React y renderer resuelven la misma selección de tema.
- Los módulos compartidos no dependen del código interno de Hit & Run.
- La compatibilidad se retira solo después de demostrar que no quedan consumidores.

## Riesgos aún por cerrar

- Decidir qué parte de visual-composition se reutiliza para evitar un segundo compositor.
- Terminar el contrato de carga/caché de assets tras auditar el lifecycle de AssetLoader en ambos backends.
- Establecer la política de accesibilidad comprometida; hasta entonces, la conformidad global no se declarará evaluada.
- Validar el contrato mediante un segundo juego antes de extraer un paquete independiente.


## Ajuste del contrato de sesión

La selección de tokens admite ahora resolución por sesión mediante PresentationThemeDefinition.resolveTokens(context). Esto permite que opciones de paisaje o paleta modifiquen los tokens de una instancia sin cambiar los valores por defecto del catálogo.

PresentationThemeSession agrupa descriptor, tokens resueltos, instancia y metadatos del fallback. UI React y renderer deben consumir la misma sesión. El propietario llama dispose(); la operación es idempotente y afecta exclusivamente a su instancia.

src/games/shared/presentation/adapters/AestheticThemeTokens.ts adapta AestheticThemeConfig al conjunto común de roles. Para Sumi-e utiliza los tokens semánticos canónicos; cosmic/neon conservan sus colores legacy. El objeto de configuración original permanece en custom durante la migración.

La implementación aún no conecta este adaptador con HitRunTheme ni con los pintores de Canvas/Skia.
