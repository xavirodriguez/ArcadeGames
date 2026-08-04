# Auditoría Técnica y Plan de Acción de Refactorización: Motor ECS TinyAster

Este documento presenta una auditoría técnica profunda y un plan de acción estratégico elaborado por un **Arquitecto Senior de Motores de Videojuegos y Experto en TypeScript**. El objetivo principal es identificar acoplamientos rígidos, fugas de abstracción y cuellos de botella en la arquitectura actual del motor, proponiendo soluciones elegantes, desacopladas y tipadas para garantizar la mantenibilidad, escalabilidad y rendimiento a nivel de producción.

---

## Índice de Contenidos
1. [Desacoplamiento Estricto del Ciclo de Vida del Juego](#1-desacoplamiento-estricto-del-ciclo-de-vida-del-juego)
2. [Extensibilidad del Registro Central](#2-extensibilidad-del-registro-central)
3. [Unificación de la Capa de Red](#3-unificación-de-la-capa-de-red)
4. [Abstracción de los Sistemas de Predicción e Interpolación](#4-abstracción-de-los-sistemas-de-predicción-e-interpolación)
5. [Canalización de Renderizado Desacoplada](#5-canalización-de-renderizado-desacoplada)
6. [Plan de Acción de Implementación](#6-plan-de-acción-de-implementación)

---

## 1. Desacoplamiento Estricto del Ciclo de Vida del Juego

### Diagnóstico de Riesgos de Diseño Actuales
1. **Fuga de Abstracción en Inputs:** `BaseGame` asume de forma directa la existencia e inicialización de `UnifiedInputSystem` como su sistema de entrada, forzando a los consumidores a depender de esta implementación concreta.
2. **Ausencia de Tipado Fuerte para Inputs:** La interfaz `IGame` expone `setInputState(input: Partial<any>): void`, lo cual destruye la seguridad en tiempo de compilación y expone el motor a errores silenciosos de tipado.
3. **Instanciación Directa (Hardcoding) de Subservicios:** En el constructor de `BaseGame`, subsistemas clave como `SceneManager` e `IAudioPlayer` se instancian de manera directa, imposibilitando la inyección de versiones simuladas (mocks) para pruebas unitarias o renderizadores alternativos (headless, servidor dedicado, etc.).
4. **Ciclo de Vida sin Contratos de Ganchos (Hooks):** Los métodos `onRegisterSystems` y `onInitializeEntities` son métodos protegidos y vacíos en `BaseGame`, en lugar de estar regidos por un contrato de ciclo de vida desacoplado o mediante ganchos que puedan ser inyectados externamente.

### Refactorización Propuesta (TypeScript)

Diseñamos una interfaz de entrada genérica y reestructuramos `IGame` y `BaseGame` utilizando inyección de dependencias para desacoplar completamente la lógica del juego de las implementaciones del framework:

```typescript
import { World, ComponentRegistry, BlueprintRegistryMap } from "../ecs/World";
import { EventRegistry, EventBus } from "../events/EventBus";
import { GameLoop } from "../loop/GameLoop";

/**
 * Contrato genérico para el sistema de entrada de un juego.
 * Permite que cada juego defina su propio esquema de inputs sin depender de UnifiedInputSystem.
 */
export interface IInputSystem<TInput extends Record<string, any>> {
  setOverride(action: keyof TInput, pressed: boolean): void;
  setInputState(input: Partial<TInput>): void;
  update(dt: number): void;
  dispose(): void;
}

/**
 * Interfaz de Ciclo de Vida estrictamente desacoplada y tipada.
 */
export interface IGame<
  TState = unknown,
  TInput extends Record<string, any> = Record<string, any>
> {
  getWorld(): World<any, any, any>;
  getEventBus(): EventBus<any>;
  getGameLoop(): GameLoop;
  getGameState(): TState;
  isGameOver(): boolean;
  getSeed(): number;
  init(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  restart(seed?: number): Promise<void>;
  subscribe(callback: (state: TState) => void): () => void;
  isPausedState(): boolean;
  getInputSystem(): IInputSystem<TInput>;
  setInputState(input: Partial<TInput>): void;
}

/**
 * Configuración genérica del juego mediante Inyección de Dependencias.
 */
export interface BaseGameConfig<
  TInput extends Record<string, any>,
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry
> {
  isMultiplayer?: boolean;
  gameOptions?: Record<string, unknown>;
  headless?: boolean;
  seed?: number;
  initTimeout?: number;

  // Inyección de dependencias de interfaces puras
  inputSystem?: IInputSystem<TInput>;
  audioPlayer?: any; // IAudioPlayer contract
  sceneManagerFactory?: (world: World<TComponents, TEvents, any>, eventBus: EventBus<TEvents>) => any;
}

/**
 * Clase base puramente agnóstica para el motor de juegos.
 */
export abstract class BaseGame<
  TState = unknown,
  TInput extends Record<string, any> = Record<string, any>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> implements IGame<TState, TInput> {
  public world: World<TComponents, TEvents, TBlueprints>;
  public eventBus: EventBus<TEvents>;
  protected loop: GameLoop;
  protected inputSystem: IInputSystem<TInput>;
  protected sceneManager: any;
  protected audio: any;
  protected _config: BaseGameConfig<TInput, TComponents, TEvents>;

  constructor(
    config: BaseGameConfig<TInput, TComponents, TEvents> & { schedule?: any }
  ) {
    this._config = config;
    this.world = new World<TComponents, TEvents, TBlueprints>(config.schedule);
    this.eventBus = new EventBus<TEvents>();
    this.loop = new GameLoop({
      step: 1 / 60,
      maxDelta: 0.25,
      manual: config.isMultiplayer
    });

    // Inyección obligatoria o fallback controlado (sin acoplamiento rígido)
    this.inputSystem = config.inputSystem || this.createDefaultInputSystem();
    this.audio = config.audioPlayer;
    this.sceneManager = config.sceneManagerFactory
      ? config.sceneManagerFactory(this.world, this.eventBus)
      : null;

    this.registerInternalResources();

    this.loop.subscribeUpdate((dt) => {
      if (this.getLifecycleState() === "RUNNING") {
        this.update(dt);
      }
    });
  }

  protected abstract createDefaultInputSystem(): IInputSystem<TInput>;
  protected abstract getLifecycleState(): string;

  public getWorld(): World<TComponents, TEvents, TBlueprints> {
    return this.world;
  }

  public getEventBus(): EventBus<TEvents> {
    return this.eventBus;
  }

  public getInputSystem(): IInputSystem<TInput> {
    return this.inputSystem;
  }

  public getGameLoop(): GameLoop {
    return this.loop;
  }

  public setInputState(input: Partial<TInput>): void {
    this.inputSystem.setInputState(input);
  }

  private registerInternalResources(): void {
    this.world.setResource("EventBus", this.eventBus);
    this.world.setResource("InputSystem", this.inputSystem);
  }

  public abstract init(): Promise<void>;
  public abstract start(): void;
  public abstract pause(): void;
  public abstract resume(): void;
  public abstract destroy(): void;
  public abstract restart(seed?: number): Promise<void>;
  public abstract subscribe(cb: (state: TState) => void): () => void;
  public abstract update(dt: number): void;
  public abstract getGameState(): TState;
  public abstract isGameOver(): boolean;
  public abstract isPausedState(): boolean;
  public abstract getSeed(): number;
}
```

---

## 2. Extensibilidad del Registro Central

### Diagnóstico de Riesgos de Diseño Actuales
1. **Registro Central Cerrado:** `CoreComponentRegistry` define de forma rígida los componentes estándar del motor. Un juego consumidor que desee inyectar componentes personalizados (como `PongComponents`, `SpaceInvadersComponents`) se ve forzado a modificar el código fuente de `@tiny-aster/core` o a realizar castings inseguros (`as any`) para saltarse el compilador de TypeScript.
2. **Incompatibilidad de la Firma de Tipos del World:** El `World` expone firmas fuertemente ligadas a `ComponentRegistry`. Sin un mecanismo de extensión genérico, los sistemas externos de juegos no pueden realizar llamadas de tipo seguro como `world.getComponent(entity, "CustomGameComponent")`.

### Refactorización Propuesta (TypeScript)

Aplicamos un patrón de **Extensibilidad Estática y Combinación de Mapeado de Tipos** en TypeScript, garantizando que el `World` de cada juego extienda de forma limpia el `CoreComponentRegistry` mediante genéricos e Interface Merging:

```typescript
import { Component, ComponentRegistry } from "./Component";

/**
 * Registro Base Core provisto por el motor de juego.
 */
export interface CoreComponentRegistry extends ComponentRegistry {
  Transform: { type: "Transform"; x: number; y: number; rotation: number };
  Velocity: { type: "Velocity"; vx: number; vy: number };
  // ...otros componentes core
}

/**
 * Utilidad de tipo para fusionar dinámicamente componentes custom con el CoreComponentRegistry.
 */
export type MergeRegistry<TCustom extends ComponentRegistry> = CoreComponentRegistry & TCustom;

/**
 * La clase World acepta de forma genérica el registro completo fusionado.
 */
export class World<
  TRegistry extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints = any
> {
  private componentMaps = new Map<keyof TRegistry, Map<number, any>>();

  /**
   * Obtiene un componente de manera 100% tipada, adaptándose al registro extendido del juego consumidor.
   */
  public getComponent<K extends keyof TRegistry>(
    entity: number,
    type: K
  ): TRegistry[K] | undefined {
    const map = this.componentMaps.get(type);
    return map ? (map.get(entity) as TRegistry[K]) : undefined;
  }

  /**
   * Agrega un componente tipado validando la correspondencia del registro.
   */
  public addComponent<K extends keyof TRegistry>(
    entity: number,
    component: TRegistry[K] & { type: K }
  ): void {
    const typeStr = component.type;
    let map = this.componentMaps.get(typeStr);
    if (!map) {
      map = new Map();
      this.componentMaps.set(typeStr, map);
    }
    map.set(entity, component);
  }
}

// ==========================================
// Ejemplo de Aplicación en Juego Consumidor:
// ==========================================

// 1. El juego define sus propios componentes específicos
export interface PlayerPowerUpComponent extends Component {
  type: "PlayerPowerUp";
  activeEffect: "shield" | "speed_boost";
  durationLeft: number;
}

export interface ScoreMultiplierComponent extends Component {
  type: "ScoreMultiplier";
  multiplier: number;
}

// 2. Fusionamos en una interfaz única para el juego consumidor
export interface SpaceInvadersRegistry extends CoreComponentRegistry {
  PlayerPowerUp: PlayerPowerUpComponent;
  ScoreMultiplier: ScoreMultiplierComponent;
}

// 3. Instanciamos el World parametrizado
const spaceWorld = new World<SpaceInvadersRegistry>();

// Verificación de compilación (Type Safety de Extremos):
// - Esto compila perfectamente y ofrece auto-completado inteligente:
spaceWorld.addComponent(1, {
  type: "PlayerPowerUp",
  activeEffect: "shield",
  durationLeft: 10.0
});

const powerup = spaceWorld.getComponent(1, "PlayerPowerUp"); // Retorna PlayerPowerUpComponent | undefined
```

---

## 3. Unificación de la Capa de Red

### Diagnóstico de Riesgos de Diseño Actuales
1. **Acoplamiento Directo al World en Replicator:** La clase `Replicator` asume que el objeto `world` pasado es mutable, posee firmas específicas (`createEntity`, `hasComponent`, `mutateComponent`) e interactúa directamente usando tipos genéricos e inseguros (`any`).
2. **Mezcla de Responsabilidades (SRP Violado):** El `NetworkManager` realiza de forma directa la reconstrucción del buffer SoA (`reconstructComponentData`) y delega la reconciliación a una instancia de `Replicator` acoplada, en lugar de actuar únicamente como un orquestador de paquetes y flujos.
3. **Ausencia de Abstracción para Resolución Remota:** No existe una capa de mapeo que separe la resolución lógica de ID remotos del mecanismo físico de sincronización de datos de red, dificultando la sincronización de identidades de red complejas (ej. persistencia entre transiciones de escenas).

### Refactorización Propuesta (TypeScript)

Diseñamos una arquitectura modular de red introduciendo las interfaces `IEntityResolver`, `ISynchronizer` y una estrategia unificada de replicación:

```typescript
import { WorldSnapshot } from "../snapshots/WorldSnapshot";

/**
 * Abstracción encargada de mapear identificadores del servidor (remotos) a entidades locales del cliente.
 */
export interface IEntityResolver {
  getLocalId(serverId: string): number | undefined;
  resolveEntity(serverId: string, world: INetworkableWorld): number;
  removeMapping(serverId: string): void;
  clear(): void;
}

/**
 * Subconjunto de World requerido exclusivamente para la sincronización de red.
 * Aisla al replicador de toda la complejidad lógica del World.
 */
export interface INetworkableWorld {
  createEntity(): number;
  hasComponent(entity: number, type: string): boolean;
  addComponent(entity: number, component: any): void;
  mutateComponent(entity: number, type: string, updater: (existing: any) => void): boolean;
}

/**
 * Contrato de Replicación de Estado.
 */
export interface IStateReplicator {
  reconcileServerSnapshot(
    world: INetworkableWorld,
    snapshot: WorldSnapshot,
    resolver: IEntityResolver
  ): void;
}

/**
 * Implementación desacoplada y robusta de Replicación.
 */
export class NetworkReplicator implements IStateReplicator {
  public reconcileServerSnapshot(
    world: INetworkableWorld,
    snapshot: WorldSnapshot,
    resolver: IEntityResolver
  ): void {
    if (!snapshot || !snapshot.entities) return;

    // Sincronización limpia usando contratos abstractos
    for (const serverIdNum of snapshot.entities) {
      const serverId = String(serverIdNum);
      const serverComponents = this.extractComponentsForEntity(snapshot, serverIdNum);

      const localEntity = resolver.resolveEntity(serverId, world);

      for (const [type, compData] of Object.entries(serverComponents)) {
        if (!compData) continue;
        const componentToApply = { ...compData, type };

        if (world.hasComponent(localEntity, type)) {
          world.mutateComponent(localEntity, type, (existing) => {
            Object.assign(existing, componentToApply);
          });
        } else {
          world.addComponent(localEntity, componentToApply);
        }
      }
    }
  }

  private extractComponentsForEntity(snapshot: WorldSnapshot, entityId: number): Record<string, any> {
    // Lógica pura de extracción sin acoplamiento a la ejecución del motor
    const components: Record<string, any> = {};
    if (snapshot.componentData) {
      for (const [type, entityMap] of Object.entries(snapshot.componentData)) {
        if (entityMap && (entityMap as any)[entityId] !== undefined) {
          components[type] = (entityMap as any)[entityId];
        }
      }
    }
    return components;
  }
}

/**
 * Orquestador Unificado de Red y Sincronización.
 */
export class NetworkManager<TServerEvents = any, TClientEvents = any> {
  private transport: any;
  private replicator: IStateReplicator;
  private resolver: IEntityResolver;

  constructor(dependencies: {
    transport: any;
    replicator?: IStateReplicator;
    resolver?: IEntityResolver;
  }) {
    this.transport = dependencies.transport;
    this.replicator = dependencies.replicator || new NetworkReplicator();
    this.resolver = dependencies.resolver || new DefaultEntityResolver();
  }

  public processIncomingUpdate(world: INetworkableWorld, snapshot: WorldSnapshot): void {
    this.replicator.reconcileServerSnapshot(world, snapshot, this.resolver);
  }
}

class DefaultEntityResolver implements IEntityResolver {
  private serverToLocal = new Map<string, number>();

  public getLocalId(serverId: string): number | undefined {
    return this.serverToLocal.get(serverId);
  }

  public resolveEntity(serverId: string, world: INetworkableWorld): number {
    let localId = this.serverToLocal.get(serverId);
    if (localId === undefined) {
      localId = world.createEntity();
      this.serverToLocal.set(serverId, localId);
    }
    return localId;
  }

  public removeMapping(serverId: string): void {
    this.serverToLocal.delete(serverId);
  }

  public clear(): void {
    this.serverToLocal.clear();
  }
}
```

---

## 4. Abstracción de los Sistemas de Predicción e Interpolación

### Diagnóstico de Riesgos de Diseño Actuales
1. **Acoplamiento Directo a Física Concreta en LocalPredictionSystem:**
   - La simulación de físicas e inputs de este sistema tiene queries rígidas a `"Transform"`, `"LocalPlayer"`, `"Velocity"`, `"Input"`.
   - Se asume directamente un modelo de movimiento donde `t.x += currentVelocity.vx * dt` y `t.y += currentVelocity.vy * dt`, forzando que el sistema no sirva para juegos en 3D, juegos basados en grids, o lógicas con aceleraciones no lineales (como Asteroids o Pong).
2. **Acoplamiento de Visual LERP en RemoteInterpolationSystem:**
   - Query rústica e inflexible sobre `"Transform"` y `"RemotePlayer"`.
   - Lógica de interpolación hardcoded: `1 - Math.pow(1 - 0.15, _deltaTime * 60)`. Impide configurar dinámicamente diferentes perfiles de interpolación (ej. amortiguación de cámara, interpolación hermítica, o compensación por pérdida de paquetes).

### Refactorización Propuesta (TypeScript)

Diseñamos una abstracción basada en el patrón de diseño **Estrategia (Strategy Pattern)** para aislar la lógica matemática de la simulación del sistema de predicción del motor:

```typescript
import { World } from "../ecs/World";
import { System } from "../ecs/System";

/**
 * Abstracción de un Modelo Físico/Simulación Predicible.
 */
export interface IPredictionModel<TComponents, TInput> {
  readonly queryComponents: string[];
  simulate(entity: number, world: World<TComponents>, input: TInput, dt: number): void;
  applyAuthoritativeState(entity: number, world: World<TComponents>, authState: any): void;
  interpolateState(entity: number, world: World<TComponents>, targetState: any, alpha: number): void;
}

/**
 * LocalPredictionSystem completamente genérico y agnóstico de lógicas físicas de juego específicas.
 */
export class LocalPredictionSystem<TComponents = any, TInput = any> extends System<TComponents> {
  private inputQueue: Array<{ tick: number; input: TInput; dt: number }> = [];
  private lastProcessedTick = 0;

  constructor(
    private predictionModel: IPredictionModel<TComponents, TInput>
  ) {
    super();
  }

  public update(world: World<TComponents>, deltaTime: number): void {
    const query = world.query(...(this.predictionModel.queryComponents as any));

    for (const entity of query) {
      const input = world.getComponent(entity, "Input" as any) as unknown as TInput;
      if (!input) continue;

      // Delegación pura de la regla física al modelo inyectado
      this.predictionModel.simulate(entity, world, input, deltaTime);

      this.inputQueue.push({
        tick: this.lastProcessedTick++,
        input: JSON.parse(JSON.stringify(input)), // Copia profunda o clonación segura
        dt: deltaTime
      });
    }
  }

  public reconcile(world: World<TComponents>, serverTick: number, serverState: any): void {
    this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

    const query = world.query(...(this.predictionModel.queryComponents as any));
    for (const entity of query) {
      // 1. Restaurar posición autoritativa del servidor
      this.predictionModel.applyAuthoritativeState(entity, world, serverState);

      // 2. Re-simular todos los inputs pendientes en el cliente
      for (const item of this.inputQueue) {
        this.predictionModel.simulate(entity, world, item.input, item.dt);
      }
    }
  }
}

// ==========================================
// Ejemplo de Modelo Físico Inyectable (Pong):
// ==========================================
export class PongPredictionModel implements IPredictionModel<any, { up: boolean, down: boolean }> {
  public queryComponents = ["Transform", "LocalPlayer", "Velocity"];

  public simulate(entity: number, world: World<any>, input: { up: boolean, down: boolean }, dt: number): void {
    const velocity = world.getMutableComponent(entity, "Velocity");
    const transform = world.getMutableComponent(entity, "Transform");
    if (!velocity || !transform) return;

    // Reglas de física personalizadas de Pong (ej. aceleración lineal y límites estrictos)
    const speed = 300; // px/s
    velocity.vy = 0;
    if (input.up) velocity.vy = -speed;
    if (input.down) velocity.vy = speed;

    transform.y += velocity.vy * dt;
    // Límites de pantalla específicos de Pong
    if (transform.y < 50) transform.y = 50;
    if (transform.y > 550) transform.y = 550;
  }

  public applyAuthoritativeState(entity: number, world: World<any>, authState: any): void {
    world.mutateComponent(entity, "Transform", (t) => {
      t.y = authState.y;
    });
    world.mutateComponent(entity, "Velocity", (v) => {
      v.vy = authState.vy;
    });
  }

  public interpolateState(entity: number, world: World<any>, targetState: any, alpha: number): void {
    world.mutateComponent(entity, "Transform", (t) => {
      t.y += (targetState.y - t.y) * alpha;
    });
  }
}
```

---

## 5. Canalización de Renderizado Desacoplada

### Diagnóstico de Riesgos de Diseño Actuales
1. **Paso de Instancias Complejas Directas:** `RenderCommandBufferImpl` expone una colección genérica `RenderCommand[]` con un campo `data: unknown`. Esto permite a los programadores pasar de manera descuidada referencias directas a entidades del ECS (`Entity`) o componentes lógicos completos.
2. **Dependencia Circular en Presentación:** Si la lógica visual del frontend depende del estado mutado de forma asíncrona de las entidades del ECS, se generan dependencias circulares complejas de depurar, problemas de hilos (si se portase a Web Workers/Native Threads) y parpadeos en los cuadros (flickering).
3. **Falta de Abstracción de Backend de Renderizado:** No hay un contrato claro que encapsule la traducción de "qué se debe dibujar" (Comandos de Dibujo lógicos) de "cómo se dibuja en pantalla" (Canvas2D vs React Native Skia).

### Refactorización Propuesta (TypeScript)

Implementamos un flujo de renderizado puramente **unidireccional y de doble buffer** utilizando comandos de dibujo primitivos de valor plano (Plain Old JavaScript Objects - POJO) totalmente desacoplados de los objetos del ECS:

```typescript
/**
 * Catálogo estricto y tipado de primitivas de renderizado permitidas.
 * Se prohíbe pasar referencias complejas o componentes directos del ECS.
 */
export enum RenderCommandType {
  DRAW_SPRITE = "DRAW_SPRITE",
  DRAW_RECTANGLE = "DRAW_RECTANGLE",
  DRAW_CIRCLE = "DRAW_CIRCLE",
  DRAW_PARTICLES = "DRAW_PARTICLES",
  APPLY_VIGNETTE = "APPLY_VIGNETTE"
}

export interface DrawSpritePayload {
  spriteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface DrawCirclePayload {
  x: number;
  y: number;
  radius: number;
  color: string;
  glowIntensity: number;
}

export interface RenderCommand {
  type: RenderCommandType;
  payload: DrawSpritePayload | DrawCirclePayload | any;
}

/**
 * Buffer de Comandos de Renderizado formalmente estructurado.
 */
export interface IRenderCommandBuffer {
  push(command: RenderCommand): void;
  clear(): void;
  getCommands(): ReadonlyArray<RenderCommand>;
}

export class RenderCommandBufferImpl implements IRenderCommandBuffer {
  private commands: RenderCommand[] = [];

  public push(command: RenderCommand): void {
    this.commands.push(command);
  }

  public clear(): void {
    this.commands = [];
  }

  public getCommands(): ReadonlyArray<RenderCommand> {
    return this.commands;
  }
}

/**
 * Abstracción del Renderizador Frontend (Canvas / Skia / WebGL).
 * Se encarga puramente de consumir la tubería de comandos planos generada por la lógica.
 */
export interface IFrontendRenderer {
  render(buffer: IRenderCommandBuffer): void;
}

/**
 * Pipeline de Renderizado Unidireccional.
 * Garantiza desacoplamiento absoluto de capas Lógica vs Visual.
 */
export class RenderPipeline {
  private activeBuffer = new RenderCommandBufferImpl();
  private backBuffer = new RenderCommandBufferImpl();

  public swapBuffers(): void {
    const temp = this.activeBuffer;
    this.activeBuffer = this.backBuffer;
    this.backBuffer = temp;
    this.backBuffer.clear();
  }

  public getActiveBuffer(): IRenderCommandBuffer {
    return this.activeBuffer;
  }

  public getBackBuffer(): IRenderCommandBuffer {
    return this.backBuffer;
  }
}
```

---

## 6. Plan de Acción de Implementación

Para llevar a cabo estas mejoras arquitectónicas sin desestabilizar el motor de producción actual, se sugiere un enfoque incremental por fases:

### Fase 1: Extensión Tipada del World & DI de Ciclo de Vida (Objetivos 1 y 2)
* **Paso 1.1:** Refactorizar la clase `World` para aceptar el parámetro genérico `TRegistry extends ComponentRegistry = CoreComponentRegistry`.
* **Paso 1.2:** Crear los tipos de mapeado utilitarios en `CoreComponents.ts` para permitir extensiones limpias de esquemas mediante *Interface Merging*.
* **Paso 1.3:** Agregar inyección opcional de interfaces `IAudioPlayer`, `IInputSystem` y `SceneManager` en `BaseGameConfig` y remover inicializadores rígidos internos.

### Fase 2: Modularización de la Capa de Red y Replicador (Objetivo 3)
* **Paso 2.1:** Implementar la interfaz `IEntityResolver` y el resolvedor por defecto `DefaultEntityResolver` para desacoplar el diccionario de mapeo ID remotos de la clase `World`.
* **Paso 2.2:** Extraer la lógica de sincronización y de aplicación de delta snapshots desde `NetworkManager` a una clase delegada de replicación (`NetworkReplicator`).

### Fase 3: Abstracción de Predicción e Interpolación por Estrategias (Objetivo 4)
* **Paso 3.1:** Diseñar la interfaz `IPredictionModel<TComponents, TInput>` que centraliza la simulación física e interpolación visual.
* **Paso 3.2:** Re-diseñar el `LocalPredictionSystem` e `RemoteInterpolationSystem` para que se inicialicen con un `IPredictionModel` concreto inyectado, eliminando código hardcoded de queries físicas en el core.

### Fase 4: Tubería Unidireccional y Serialización de RenderCommandBuffer (Objetivo 5)
* **Paso 4.1:** Formalizar el catálogo `RenderCommandType` y estructurar los payloads de los comandos de dibujo con datos planos no acoplados a clases.
* **Paso 4.2:** Modificar los renderizadores concretos (HTML5 Canvas y React Native Skia) para que actúen estrictamente como consumidores del `RenderCommandBuffer`, eliminando cualquier referencia a componentes lógicos del ECS durante el ciclo de renderizado directo.
