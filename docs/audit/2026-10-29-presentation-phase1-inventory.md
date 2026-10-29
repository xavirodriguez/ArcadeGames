# Auditoría inicial — contrato de presentación

**Fecha:** 2026-10-29  
**Referencia:** branch refactor/presentation-contract-phase1  
**Alcance:** inventario para cerrar la Fase 1 y preparar el piloto Sumi-e en Hit & Run.

Este documento registra el estado observado en el código fuente de la rama master tomada como base. Las decisiones de extracción aún no implican que los consumidores estén migrados.

## Matriz de módulos y decisiones

| Módulo | Responsabilidad actual observada | Riesgo / duplicidad | Decisión de migración |
|---|---|---|---|
| packages/core/src/theme/Theme.ts | Recurso ECS con colorMap, spriteMap, efectos, lore, perfil visual, visualTheme y conceptPack. | Une configuración temática con roles del motor, pero no define una composición visual completa. | Mantener como contrato de compatibilidad; adaptar sus mapas y perfiles, sin añadir APIs de Canvas/Skia o React al core. |
| src/games/hitandrun/rendering/theme/HitRunTheme.ts | API completa específica de Hit & Run para fondo, sombra, entidad, proyectil, feedback, HUD, banner, resize y dispose. | Los métodos principales requieren CanvasRenderingContext2D; solo backdrop tiene una contraparte Skia opcional. | Crear una fachada temporal que traduzca snapshots y operaciones al contrato común. Retirar métodos legacy solo cuando no tengan consumidores. |
| src/games/hitandrun/rendering/theme/ThemeRegistry.ts | Catálogo de fábricas con una única instancia activa global. setActiveTheme dispone la anterior. | Instancias de partidas distintas pueden compartir estado global; previsualizar/cargar en paralelo no es seguro. | Mantener catálogo y fallback; crear una instancia nueva por sesión y mover la propiedad/disposición al propietario de esa sesión. |
| src/games/hitandrun/mods/types.ts y mods/registry.ts | Fachada de módulos fantasy y sumi-e que también resuelve selección del tema. | Doble capa de metadatos/selección respecto a ThemeRegistry. | Convertir en adaptador de compatibilidad y eliminar la duplicación una vez migrados todos los puntos de entrada. |
| src/games/shared/rendering/DrawAdapter.ts | Primitivas compartidas de formas simples y texto para Canvas/Skia. | No tiene curva Bézier, elipse, API tipográfica rica, contrato de assets ni recorte uniforme en la interfaz actual. | Reutilizar la intención y adaptar las primitivas necesarias a PresentationPainter. No sustituir los renderizadores ECS existentes. |
| packages/renderer-canvas y packages/renderer-skia | Renderizadores ECS que procesan el plan de render y delegan en shape/background drawers. | El contrato de theme está por encima de estos drawers y aún no está conectado uniformemente a ambos. | Implementar adaptadores de painter por backend; los temas no importan tipos concretos de los renderizadores. |
| src/games/shared/rendering/visual-composition | Resolución y dibujo de escenas visuales compartidas. | Puede solaparse con una futura capa de composición. | Auditar y reutilizar resolver, draw plan y transforms antes de construir un segundo compositor. |
| src/games/shared/rendering/sumi-e/InkWashParallaxBackdrop.ts | Geometría y dibujo de paisajes de tinta con rutas Canvas/Skia. | Contiene funciones de bajo nivel que no deben confundirse con una composición completa de un juego. | Extraer/reutilizar primitivas de paisaje; mantener la ordenación de capas como configuración o composición del tema. |
| src/games/shared/rendering/sumi-e/AestheticTheme.ts | Presets de estética sumi-e, cosmic y neon, paleta histórica, capas y preferencias de efectos. | Configuración duplicada parcialmente con tokens semánticos y tema de Hit & Run. | Adaptar a los tokens y capacidades normalizados, preservando variantes antiguas durante la transición. |
| src/theme/sumi-e/SumiESemanticTokens.ts | Tokens semánticos tipados y validados para papel, texto, amenaza, jugador, recompensa, paisaje y UI. | Convive con paletas legacy, que no se migran automáticamente. | Reutilizar como custom tokens tipados y mapear roles comunes a la interfaz visual compartida. |
| src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts y SumiEVillageTheme.ts | Composición específica de Hit & Run con pergamino, paisaje, capa ambiental y ornamentos. | Incluye almacenamiento/caché de canvas offscreen y procedimientos específicos del juego. | Generalizar solo las primitivas y capas reutilizables; conservar la composición de aldea como configuración específica donde corresponda. |
| src/games/hitandrun/rendering/theme/sumi-e/SumiEAssetManifest.ts | Describe atlas de jugador y samurái y sus animaciones. | No describe objetos ambientales estáticos; reutilizarlo para edificios mezclaría responsabilidades. | Mantener manifiesto de atlas y crear manifiesto ambiental independiente basado en claves semánticas. |
| src/context/GameThemeContext.ts y GameThemeProvider.tsx | Tokens de UI, accent colors, selección estética opcional, alto contraste y movimiento reducido. | El tema React puede mantener una selección distinta de la instancia del renderer. | Resolver una única definición por sesión y proyectarla a React; preservar preferencias de accesibilidad como preferencias del usuario. |
| src/games/shared/rendering/SharedVFX.ts, ParallaxSystem.ts y LevelThemeSystem.ts | Efectos compartidos, parallax y presets de niveles; parte de la implementación actual está orientada al espacio. | Helpers de espacio pueden filtrar supuestos estéticos a otros temas. | Clasificar cada función en mecánica visual genérica, composición temática o contenido espacial; no migrar todos los VFX a Sumi-e por defecto. |

## Riesgos y pruebas existentes a conservar

- src/games/shared/__tests__/ThemeDecouplingParity.test.ts verifica resoluciones de color y overrides de Theme.
- src/games/shared/__tests__/GameModuleBoundaries.test.ts protege contra imports directos entre juegos.
- src/games/hitandrun/rendering/__tests__/HitRunThemeRegistry.test.ts cubre el cambio de tema actual; deberá reescribirse para las instancias por sesión.
- src/games/shared/rendering/sumi-e/SumiEAestheticIntegration.test.tsx cubre el contexto React y la compatibilidad de palettes legacy.
- docs/hitandrun/IMAGE_BACKGROUND_AUDIT_PLAN.md registra que carga de imágenes ambientales, coordenadas de cámara/parallax y lifecycle necesitan un contrato independiente.

El registro de temas no debe permitir que un fallback o una instancia de un juego se comparta silenciosamente con otra partida. Los tokens de la UI deben proceder de la misma definición resuelta que alimenta el renderer. La presentación cosmética debe usar un generador inyectado y no el RNG de gameplay.

## Fuera del alcance de esta entrega

Esta auditoría no migra los drawers actuales ni cambia la presentación visible de Hit & Run. Tampoco afirma paridad real del tema completo en Skia. La fase siguiente debe tomar una captura y un baseline determinista antes de sustituir el camino de renderizado, y luego migrar fondo, entidades, proyectiles, feedback, HUD y banners en entregas verificables.


## Ajuste posterior del contrato

La sesión de presentación debe resolver los tokens específicos de su configuración de variante, no reutilizar sin más los valores por defecto del catálogo. PresentationThemeDefinition.resolveTokens permite resolver tokens por sesión y PresentationThemeSession expone juntos los tokens resueltos, descriptor, instancia y ciclo de vida.

Se añade src/games/shared/presentation/adapters/AestheticThemeTokens.ts como puente inicial de tokens para la configuración estética existente: Sumi-e usa la paleta semántica canónica, mientras cosmic y neon conservan los colores legacy. Esto prepara el terreno para que el HUD React y el renderer consuman la misma selección; aún no es un cableado de producción.
