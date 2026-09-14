import { ComponentRegistry } from "../ecs/Component";
import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, Camera2DComponent, TransformComponent } from "../ecs/CoreComponents";
import { TagComponent } from "../ecs/TagComponent";
import { Entity } from "../ecs/Entity";

/**
 * System that optimizes performance in high entity density scenarios
 * by culling entities outside of the active viewport.
 *
 * @remarks
 * This system filters entities with a `Transform` component to determine if they reside
 * within the active viewport bounds (defined by the main `Camera2D` if available, or the
 * `ScreenConfig` world resource), plus a configurable buffer margin.
 *
 * The filtered candidate list of active entity IDs is stored in the world resource
 * `"SpatialCullingCandidates"`. Downstream systems like `MovementSystem`, `FrictionSystem`,
 * and `CollisionSystem2D` can then use this pre-filtered list to bypass checking/updating
 * entities that are far off-screen.
 *
 * To prevent crucial gameplay objects from being culled (e.g., player ships), entities
 * with components like `"LocalPlayer"` or `"Player"` are always preserved as candidates regardless
 * of their screen coordinates.
 *
 * @precondition Las entidades deben poseer el componente `Transform` para ser evaluadas en el culling. Las entidades jugador (`LocalPlayer` / `Player`) se excluyen dinámicamente del culling.
 * @invariant El recurso de candidatos `"SpatialCullingCandidates"` siempre almacena un conjunto coherente de IDs de entidades válidas que intersecan con el viewport ampliado.
 * @conceptualRisk [GC_PRESSURE] Retornar arrays filtrados constantemente en paths calientes puede elevar la recolección de basura. Por ende, se guarda el resultado como un recurso reutilizable en el World.
 * @public
 */
export class SpatialCullingSystem extends System<CoreComponentRegistry> {
  private margin: number;
  private enabled: boolean;
  // Safe for determinism/rollback. Internal array reused across ticks to avoid allocating a new array per frame when storing candidate entities.
  private candidateBuffer: Entity[] = [];

  /**
   * Returns the viewport bounding box based on Camera2D or screen configuration.
   *
   * @precondition El World de la simulación debe estar inicializado y poseer opcionalmente un recurso `ScreenConfig`.
   * @postcondition Retorna un objeto con las coordenadas del viewport `minX`, `minY`, `maxX`, `maxY`.
   */
  public static getViewport<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig");
    const screenWidth = screen?.width ?? 800;
    const screenHeight = screen?.height ?? 600;

    const cameraType = "Camera2D" as Extract<keyof TRegistry, string>;
    const cameras = world.query(cameraType);
    let viewX = 0;
    let viewY = 0;
    let zoom = 1;
    for (const camEntity of cameras) {
      const cam = world.getComponent(camEntity, cameraType) as Camera2DComponent | undefined;
      if (cam?.isMain) {
        viewX = cam.x;
        viewY = cam.y;
        zoom = cam.zoom ?? 1;
        break;
      }
    }

    return {
      minX: viewX,
      minY: viewY,
      maxX: viewX + screenWidth / zoom,
      maxY: viewY + screenHeight / zoom,
    };
  }

  /**
   * Computes an expanded viewport bounding box including buffer margin.
   */
  public static getExpandedViewport<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    margin: number = 100
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    const viewport = this.getViewport(world);
    return {
      minX: viewport.minX - margin,
      minY: viewport.minY - margin,
      maxX: viewport.maxX + margin,
      maxY: viewport.maxY + margin,
    };
  }

  /**
   * Tests whether an entity's Transform falls within explicit bounding box coordinates.
   */
  public static isEntityInViewportBounds<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    entity: Entity,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const trans = world.getComponent(entity, transformType) as TransformComponent | undefined;
    if (!trans) return false;
    const x = trans.worldX ?? trans.x;
    const y = trans.worldY ?? trans.y;

    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  }

  /**
   * Checks if an entity is a player entity (has LocalPlayer/Player component or tag).
   *
   * @precondition El World de la simulación debe estar inicializado.
   * @postcondition Retorna true si la entidad posee componentes o tags de jugador.
   * @public
   */
  public static isPlayerEntity<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    entity: Entity
  ): boolean {
    const localPlayerType = "LocalPlayer" as Extract<keyof TRegistry, string>;
    const playerType = "Player" as Extract<keyof TRegistry, string>;
    const tagType = "Tag" as Extract<keyof TRegistry, string>;

    const isLocalPlayer = world.hasComponent(entity, localPlayerType) || world.hasComponent(entity, playerType);

    const tagComponent = world.getComponent(entity, tagType) as TagComponent | undefined;
    const isTagPlayer = Boolean(
      tagComponent && (
        (tagComponent.tags as string[] | undefined)?.includes("LocalPlayer") ||
        (tagComponent.tags as string[] | undefined)?.includes("Player")
      )
    );

    return isLocalPlayer || isTagPlayer;
  }

  /**
   * Checks if an entity is within the active viewport bounds plus a margin.
   *
   * @precondition La entidad provista debe ser válida en el World y poseer el componente `Transform` (salvo que sea jugador).
   * @postcondition Retorna true si la entidad está dentro del viewport con el margen aplicado, o si es un jugador.
   */
  public static isEntityInViewport<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    entity: Entity,
    margin: number = 100
  ): boolean {
    if (this.isPlayerEntity(world, entity)) {
      return true;
    }

    const bounds = this.getExpandedViewport(world, margin);
    return this.isEntityInViewportBounds(world, entity, bounds);
  }

  /**
   * Filters a list of entity IDs, returning only those that reside within the active viewport bounds plus a margin.
   *
   * @precondition `entities` debe ser un array de IDs de entidades válidas.
   * @postcondition Retorna un nuevo array filtrado con las entidades visibles.
   */
  public static filterInViewport<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    entities: ReadonlyArray<Entity>,
    margin: number = 100
  ): Entity[] {
    const bounds = this.getExpandedViewport(world, margin);

    return entities.filter((entity) => {
      if (this.isPlayerEntity(world, entity)) {
        return true;
      }
      return this.isEntityInViewportBounds(world, entity, bounds);
    });
  }

  /**
   * Creates a new SpatialCullingSystem.
   *
   * @param config - Configuration options for the culling system.
   */
  constructor(config: { margin?: number; enabled?: boolean } = {}) {
    super();
    this.margin = config.margin ?? 100;
    this.enabled = config.enabled ?? true;
  }

  /**
   * Sets the buffer margin in pixels.
   */
  public setMargin(margin: number): void {
    this.margin = margin;
  }

  /**
   * Enables or disables spatial culling.
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Returns whether the culling system is currently enabled.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Actualiza el recurso `"SpatialCullingCandidates"` filtrando las entidades con `Transform` según su posición relativa al viewport activo.
   *
   * @precondition El World debe estar inicializado y no estar en fase de re-simulación de rollback (`world.isReSimulating === false`).
   * @postcondition El recurso `"SpatialCullingCandidates"` se actualiza con los candidatos válidos o se elimina si el sistema está desactivado.
   * @invariant Las entidades jugador se mantienen siempre como candidatas para prevenir su desactivación física o visual.
   * @sideEffect Muta los recursos del World añadiendo o eliminando la lista `"SpatialCullingCandidates"`.
   */
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    // 1. If disabled or during rollback resimulation, bypass culling to guarantee absolute determinism!
    if (!this.enabled || world.isReSimulating) {
      world.deleteResource("SpatialCullingCandidates");
      return;
    }

    // 2. Compute active culling bounding box
    const bounds = SpatialCullingSystem.getExpandedViewport(world, this.margin);

    // 3. Filter entities into pre-allocated buffer
    const allEntities = world.query("Transform");
    this.candidateBuffer.length = 0;

    for (const entity of allEntities) {
      if (SpatialCullingSystem.isPlayerEntity(world, entity)) {
        this.candidateBuffer.push(entity);
        continue;
      }

      if (SpatialCullingSystem.isEntityInViewportBounds(world, entity, bounds)) {
        this.candidateBuffer.push(entity);
      }
    }

    // 6. Save the list of active simulation candidate entities
    // Safe for determinism/rollback. Reusing a pooled resource array prevents creating a new array allocation every tick.
    let candidatesResource = world.getResource<Entity[]>("SpatialCullingCandidates");
    if (!candidatesResource) {
      candidatesResource = [];
    }
    candidatesResource.length = 0;
    const bufferLen = this.candidateBuffer.length;
    for (let i = 0; i < bufferLen; i++) {
      candidatesResource.push(this.candidateBuffer[i]);
    }
    world.setResource("SpatialCullingCandidates", candidatesResource);
  }
}
