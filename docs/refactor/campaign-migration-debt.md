# Deuda Técnica y Plan de Migración: CampaignScreen a ArcadeOrchestrator

Este documento registra la deuda técnica identificada en `components/CampaignScreen.tsx` (Fase 2 de refactorización) y establece el marco de preparación para su futura migración a la canalización estandarizada de `ArcadeOrchestrator` y `ArcadeGameAdapter`.

---

## 1. Contexto y Brecha Arquitectónica Actual

Actualmente, `CampaignScreen.tsx` actúa como un orquestador híbrido de React Native que gestiona directamente:
1. La resolución e instanciación de juegos mediante `GameDefinitionRegistry.resolve().createSimulation(seed)`.
2. El ciclo de vida de la simulación activa `BaseGame` y su renderizado mediante `CanvasRenderer`.
3. La evaluación manual de reglas de encuentro (`OutcomeRuleEngine.evaluate`) y la aplicación de efectos (`StoryEffectApplier.applyEffects`).
4. La persistencia de partidas (`CampaignSaveManager`) y metaprogresión (`MetaProgressionService`).

A diferencia del flujo de producción ideado para minijuegos acoplados al motor (como `MultiGameStoryProofOfConcept.ts`), `CampaignScreen` no utiliza la abstracción `ArcadeOrchestrator` ni la envoltura `ArcadeGameAdapter`.

---

## 2. Puntos de Deuda Técnica Identificados

### 2.1. Instanciación directa de `BaseGame` sin `ArcadeGameAdapter`
- **Problema:** `switchGame` en `CampaignScreen` crea y destruye instancias de `BaseGame` directamente (`setActiveGame(newGame)`), en lugar de delegar el ciclo de vida y adaptadores a `ArcadeOrchestrator`.
- **Riesgo:** Duplicación de lógica de transición de estados de `ArcadeKernel` (`BOOT -> LOADING -> MENU -> PLAYING`) e incoherencias si un minijuego requiere un adaptador específico para netcode o replays.

### 2.2. Evaluación de reglas de encuentro fuera del Orchestrator
- **Problema:** En el handler de `game:over` (`CampaignScreen.tsx`), la selección del encuentro (`encounter.outcomeRules`) y su evaluación se realiza mediante condicionales `if/else` directos por `gameId`.
- **Riesgo:** Dificulta la adición de nuevos minijuegos o variantes de encuentros, violando el principio Open/Closed.

### 2.3. Doble responsabilidad de UI y Orquestación Narrativa
- **Problema:** El componente de React administra simultáneamente el estado visual (diálogos, botones, overlay de reintento) y las llamadas de I/O de persistencia (`handleSave`, `handleLoad`).
- **Riesgo:** Complejidad de pruebas unitarias al requerir mocks extensos del entorno de React Native.

---

## 3. Hoja de Ruta para Migración Futura (Fase 3 / Futuras Iteraciones)

Para realizar la migración completa sin introducir regresiones en el modo campaña:

1. **Paso 1 — Encapsulamiento del Controlador:**
   - Mover la lógica de orquestación de `CampaignScreen` a una clase controladora/servicio desacoplada (ej. `CampaignFlowController`) que posea instancias de `ArcadeOrchestrator`, `StoryRuntime` y `MetaProgressionService`.

2. **Paso 2 — Integración con `ArcadeGameAdapter`:**
   - Refactorizar `switchGame` para utilizar `orchestrator.startRun(encounter, snapshot, nodeId)`, permitiendo que `ArcadeOrchestrator` administre las transiciones de escena y adaptadores.

3. **Paso 3 — Simplificación de `CampaignScreen` como Vista Pura:**
   - Reducir `CampaignScreen.tsx` a una vista de React puramente declarativa consumiendo hooks reactivos (`useStoryRuntime`, `useCampaignController`).

4. **Paso 4 — Pruebas de Integración End-to-End:**
   - Validar que las transiciones entre minijuegos, la aplicación de mutadores (`EndingRewards`) y la persistencia mantengan paridad funcional con la suite de pruebas existente.
