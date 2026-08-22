import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { CollisionManifold } from "./CollisionTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { ShapeType } from "../shapes/Shapes";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * Signature for a callback invoked when a physical collision occurs between two entities.
 *
 * @param world - The ECS world instance.
 * @param entityA - The first entity involved in the collision.
 * @param entityB - The second entity involved in the collision.
 * @param manifold - Detailed collision manifold describing contact normal, penetration depth, and contact points.
 * @public
 */
export type CollisionCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;

/**
 * Signature for a callback invoked when a trigger boundary is entered or exited between two entities.
 *
 * @param world - The ECS world instance.
 * @param entityA - The first entity involved in the trigger event.
 * @param entityB - The second entity involved in the trigger event.
 * @public
 */
export type TriggerCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity) => void;

/**
 * 2D Collision detection system managing physical collisions and trigger area events.
 *
 * @remarks
 * Uses a two-phase pipeline:
 * 1. BroadPhase: Sweep and Prune algorithm (1D bounding box sorting along the X-axis).
 * 2. NarrowPhase: Separating Axis Theorem (SAT) for precise convex polygon, box, and circle manifold calculation.
 *
 * Supports optional spatial culling candidate overrides to minimize comparison counts.
 * Emits events via registered callbacks and populates the `CollisionEvents` component on colliding entities.
 *
 * @precondition Entities must possess both `Transform` and `Collider` components to participate in collision detection.
 * @invariant Active collision pair tracking remains consistent frame-over-frame to correctly trigger enter/exit callbacks.
 * @public
 */
export class CollisionSystem2D<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private onCollisionCallbacks: CollisionCallback<TRegistry>[] = [];
  private onTriggerEnterCallbacks: TriggerCallback<TRegistry>[] = [];
  private onTriggerExitCallbacks: TriggerCallback<TRegistry>[] = [];
  private activePairs = new Set<string>();
  private currentFramePairs = new Set<string>();
  private candidateEntities: Entity[] | null = null;
  private tempQuery: Entity[] = [];

  /**
   * Registers a callback invoked whenever a physical collision is detected.
   *
   * @param callback - Function receiving the world, colliding entities, and collision manifold.
   * @returns Cleanup function to unregister the callback.
   *
   * @sideEffect Appends the callback to the internal listener list.
   */
  public onCollision(callback: CollisionCallback<TRegistry>): () => void {
    this.onCollisionCallbacks.push(callback);
    return () => {
      this.onCollisionCallbacks = this.onCollisionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Registers a callback invoked when an entity enters a trigger zone.
   *
   * @param callback - Function receiving the world and participating entities.
   * @returns Cleanup function to unregister the callback.
   *
   * @sideEffect Appends the callback to the internal trigger-enter listener list.
   */
  public onTriggerEnter(callback: TriggerCallback<TRegistry>): () => void {
    this.onTriggerEnterCallbacks.push(callback);
    return () => {
      this.onTriggerEnterCallbacks = this.onTriggerEnterCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Registers a callback invoked when an entity exits a trigger zone.
   *
   * @param callback - Function receiving the world and participating entities.
   * @returns Cleanup function to unregister the callback.
   *
   * @sideEffect Appends the callback to the internal trigger-exit listener list.
   */
  public onTriggerExit(callback: TriggerCallback<TRegistry>): () => void {
    this.onTriggerExitCallbacks.push(callback);
    return () => {
      this.onTriggerExitCallbacks = this.onTriggerExitCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Clears all registered collision and trigger callbacks and active collision pairs.
   *
   * @sideEffect Empties all callback arrays and clears active tracking sets.
   */
  public override dispose(): void {
    this.onCollisionCallbacks = [];
    this.onTriggerEnterCallbacks = [];
    this.onTriggerExitCallbacks = [];
    this.activePairs.clear();
  }

  /**
   * Manually sets a filtered subset of candidate entities for broadphase collision processing.
   *
   * @param entities - Array of entity IDs to consider for collision, or `null` to query all matching world entities.
   *
   * @sideEffect Updates internal `candidateEntities` reference.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Executes one tick of collision detection and resolution.
   *
   * @remarks
   * Performs broadphase Sweep & Prune, narrowphase SAT manifold checks, fires registered callbacks,
   * and populates the `CollisionEvents` component for participating entities.
   *
   * @param world - Simulation ECS world.
   * @param _deltaTime - Frame elapsed time in seconds.
   * @param candidatesOverride - Optional candidate entity list to override default spatial culling.
   *
   * @sideEffect Mutates `CollisionEvents` components on colliding entities and invokes registered callbacks.
   */
  public update(world: World<TRegistry>, _deltaTime: number, candidatesOverride?: Entity[]): void {
    if (world.getResource("IsPaused") === true) return;
    // Cast to access core components reliably while maintaining generic TRegistry if needed by subclasses
    const w = world as unknown as World<CoreComponentRegistry>;
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesInput = candidatesOverride !== undefined ? candidatesOverride : this.candidateEntities;
    let candidatesList: ReadonlyArray<Entity> | null = candidatesInput !== null ? candidatesInput : (resourceCandidates !== undefined ? resourceCandidates : null);

    if (candidatesList === null && world.getResource("SpatialCullingEnabled") === true) {
      const margin = world.getResource<number>("SpatialCullingMargin") ?? 100;
      const entities = w.query("Transform", "Collider");
      candidatesList = SpatialCullingSystem.filterInViewport(world, entities, margin);
    }

    let query: ReadonlyArray<Entity>;
    if (candidatesList !== null) {
      this.tempQuery.length = 0;
      const len = candidatesList.length;
      for (let i = 0; i < len; i++) {
        const entity = candidatesList[i];
        if (w.hasComponent(entity, "Transform") && w.hasComponent(entity, "Collider")) {
          this.tempQuery.push(entity);
        }
      }
      query = this.tempQuery;
    } else {
      query = w.query("Transform", "Collider");
    }
    // Safe for determinism/rollback. Reusing instance Set avoids per-tick heap allocations during physics updates.
    this.currentFramePairs.clear();

    const eventQuery = w.query("CollisionEvents");
    const eqLen = eventQuery.length;
    for (let i = 0; i < eqLen; i++) {
      const entity = eventQuery[i];
      const component = w.getComponent(entity, "CollisionEvents");

      // Safe for determinism/rollback. Only fetch the mutable component and increment stateVersion if there's actually data to clear. Bypassing getMutableComponent on resting empty entities prevents massive stateVersion & serialization overhead.
      if (component && (component.collisions.length > 0 || component.triggersEntered.length > 0 || component.triggersExited.length > 0)) {
        const mutable = w.getMutableComponent(entity, "CollisionEvents");
        if (mutable) {
          mutable.collisions.length = 0;
          mutable.triggersEntered.length = 0;
          mutable.triggersExited.length = 0;
        }
      }
    }

    const broadPhasePairs = BroadPhase.sweepAndPrune(query, w);

    const bpLen = broadPhasePairs.length;
    for (let i = 0; i < bpLen; i++) {
      const [entityA, entityB] = broadPhasePairs[i];
      const colA = w.getComponent(entityA, "Collider")!;
      const colB = w.getComponent(entityB, "Collider")!;

      if (!colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA.layer, colB.mask, colB.layer, colA.mask)) continue;

      const transA = w.getComponent(entityA, "Transform")!;
      const transB = w.getComponent(entityB, "Transform")!;

      const manifold = NarrowPhase.test(
        colA.shape,
        (transA.worldX ?? transA.x) + (colA.offsetX ?? 0),
        (transA.worldY ?? transA.y) + (colA.offsetY ?? 0),
        transA.worldRotation ?? transA.rotation,
        colB.shape,
        (transB.worldX ?? transB.x) + (colB.offsetX ?? 0),
        (transB.worldY ?? transB.y) + (colB.offsetY ?? 0),
        transB.worldRotation ?? transB.rotation
      );

      if (manifold.colliding) {
        const pairId = this.getPairId(entityA, entityB);
        this.currentFramePairs.add(pairId);

        if (colA.isTrigger || colB.isTrigger) {
          if (!this.activePairs.has(pairId)) {
            this.onTriggerEnterCallbacks.forEach(cb => cb(world, entityA, entityB));
            this.notifyTriggerEvent(w, entityA, entityB, "enter");
          }
        } else {
          this.onCollisionCallbacks.forEach(cb => cb(world, entityA, entityB, manifold));
          this.notifyCollisionEvent(w, entityA, entityB, manifold);
        }
      }
    }

    // Safe for determinism/rollback. Direct Set iteration avoids callback closure allocations.
    for (const pairId of this.activePairs) {
      if (!this.currentFramePairs.has(pairId)) {
        // Safe for determinism/rollback. Parsing substring numbers directly avoids string split and array map heap allocations on trigger exit events.
        const commaIdx = pairId.indexOf(",");
        const idA = Number(pairId.substring(0, commaIdx));
        const idB = Number(pairId.substring(commaIdx + 1));
        this.onTriggerExitCallbacks.forEach(cb => cb(world, idA, idB));
        this.notifyTriggerEvent(w, idA, idB, "exit");
      }
    }

    this.activePairs.clear();
    for (const pair of this.currentFramePairs) {
      this.activePairs.add(pair);
    }
  }

  /**
   * Evaluates bitwise layer and mask filtering to determine whether two entities should collide.
   *
   * @param layerA - Collision layer bitmask of entity A.
   * @param maskB - Collision mask bitmask of entity B.
   * @param layerB - Collision layer bitmask of entity B.
   * @param maskA - Collision mask bitmask of entity A.
   * @returns `true` if bitwise AND operation between layer and mask is non-zero in both directions.
   */
  private shouldCollide(layerA: number, maskB: number, layerB: number, maskA: number): boolean {
    return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
  }

  /**
   * Generates a deterministic, order-independent string identifier for a pair of entities.
   *
   * @param a - Entity ID A.
   * @param b - Entity ID B.
   * @returns String formatted as `'min(a,b),max(a,b)'`.
   */
  private getPairId(a: Entity, b: Entity): string {
    return a < b ? `${a},${b}` : `${b},${a}`;
  }

  /**
   * Adds collision details to the `CollisionEvents` component of both entities involved in a collision.
   *
   * @param world - Simulation world.
   * @param a - First entity.
   * @param b - Second entity.
   * @param manifold - Collision manifold.
   */
  private notifyCollisionEvent(world: World<CoreComponentRegistry>, a: Entity, b: Entity, manifold: CollisionManifold): void {
    this.addCollisionToComponent(world, a, b, manifold, false);
    this.addCollisionToComponent(world, b, a, manifold, true);
  }

  /**
   * Appends a collision entry to an entity's `CollisionEvents` component, optionally inverting normal vectors.
   *
   * @param world - Simulation world.
   * @param entity - Target entity whose component is mutated.
   * @param other - Corresponding entity in the collision pair.
   * @param manifold - Collision manifold.
   * @param flipNormal - Whether to invert collision normal directions for entity B.
   */
  private addCollisionToComponent(world: World<CoreComponentRegistry>, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    const eComp = world.getMutableComponent(entity, "CollisionEvents");
    if (eComp) {
      eComp.collisions.push({
        otherEntity: other,
        normalX: flipNormal ? -manifold.normalX : manifold.normalX,
        normalY: flipNormal ? -manifold.normalY : manifold.normalY,
        depth: manifold.depth,
        contactPoints: manifold.contactPoints
      });
    }
  }

  /**
   * Updates `CollisionEvents` trigger lists on both entities involved in a trigger event.
   *
   * @param world - Simulation world.
   * @param a - First entity.
   * @param b - Second entity.
   * @param phase - Trigger event phase (`"enter"` or `"exit"`).
   */
  private notifyTriggerEvent(world: World<CoreComponentRegistry>, a: Entity, b: Entity, phase: "enter" | "exit"): void {
    this.addTriggerToComponent(world, a, b, phase);
    this.addTriggerToComponent(world, b, a, phase);
  }

  /**
   * Mutates `triggersEntered`, `triggersExited`, or `activeTriggers` lists in an entity's `CollisionEvents` component.
   *
   * @param world - Simulation world.
   * @param entity - Target entity.
   * @param other - Corresponding trigger entity.
   * @param phase - Trigger event phase (`"enter"` or `"exit"`).
   */
  private addTriggerToComponent(world: World<CoreComponentRegistry>, entity: Entity, other: Entity, phase: "enter" | "exit"): void {
    const eComp = world.getMutableComponent(entity, "CollisionEvents");
    if (eComp) {
      if (phase === "enter") {
        eComp.triggersEntered.push(other);
        if (!eComp.activeTriggers.includes(other)) eComp.activeTriggers.push(other);
      } else {
        eComp.triggersExited.push(other);
        const idx = eComp.activeTriggers.indexOf(other);
        if (idx !== -1) {
          eComp.activeTriggers.splice(idx, 1);
        }
      }
    }
  }
}

/**
 * Continuous Collision Detection (CCD) system to prevent high-speed projectiles from tunneling through colliders.
 *
 * @remarks
 * Solves bullet tunneling by casting rays along projected entity trajectories (`position` to `position + velocity * deltaTime`).
 * Evaluates line segment intersections with circle and AABB box colliders.
 *
 * @precondition Fast-moving entities require `Transform`, `Velocity`, and `Collider` components.
 * @public
 */
export class CCDSystem<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private candidateEntities: Entity[] | null = null;
  private _cachedQueryArray: Entity[] = [];
  private _cachedCollidablesArray: Entity[] = [];

  /**
   * Sets a candidate entity filter for continuous collision detection checks.
   *
   * @param entities - Candidate entity IDs, or `null` to evaluate all matching world entities.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Evaluates continuous collision detection via raycasting for fast-moving entities.
   *
   * @param world - Simulation world.
   * @param deltaTime - Elapsed frame time in seconds.
   *
   * @sideEffect Appends collision events to `CollisionEvents` components when ray intersection occurs.
   */
  public update(world: World<TRegistry>, deltaTime: number): void {
    const w = world as unknown as World<CoreComponentRegistry>;
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    let query: ReadonlyArray<Entity>;
    let collidables: ReadonlyArray<Entity>;
    if (candidatesList !== null) {
      this._cachedQueryArray.length = 0;
      this._cachedCollidablesArray.length = 0;
      for (let i = 0; i < candidatesList.length; i++) {
        const entity = candidatesList[i];
        const hasTransform = w.hasComponent(entity, "Transform");
        const hasCollider = w.hasComponent(entity, "Collider");
        if (hasTransform && hasCollider) {
          this._cachedCollidablesArray.push(entity);
          if (w.hasComponent(entity, "Velocity")) {
            this._cachedQueryArray.push(entity);
          }
        }
      }
      query = this._cachedQueryArray;
      collidables = this._cachedCollidablesArray;
    } else {
      query = w.query("Transform", "Velocity", "Collider");
      collidables = w.query("Transform", "Collider");
    }

    const qLen = query.length;
    for (let i = 0; i < qLen; i++) {
      const entity = query[i];
      const trans = w.getComponent(entity, "Transform")!;
      const vel = w.getComponent(entity, "Velocity")!;
      const col = w.getComponent(entity, "Collider")!;

      if (!col.enabled || (vel.vx === 0 && vel.vy === 0)) continue;

      const p0x = (trans.worldX ?? trans.x);
      const p0y = (trans.worldY ?? trans.y);
      const p1x = p0x + vel.vx * deltaTime;
      const p1y = p0y + vel.vy * deltaTime;

      const cLen = collidables.length;
      for (let j = 0; j < cLen; j++) {
        const other = collidables[j];
        if (entity === other) continue;
        const otherCol = w.getComponent(other, "Collider")!;
        if (!otherCol.enabled || otherCol.isTrigger) continue;
        if (!this.shouldCollide(col.layer, otherCol.mask, otherCol.layer, col.mask)) continue;

        const otherTrans = w.getComponent(other, "Transform")!;
        const ox = (otherTrans.worldX ?? otherTrans.x);
        const oy = (otherTrans.worldY ?? otherTrans.y);

        if (otherCol.shape.type === ShapeType.Circle) {
          const radius = otherCol.shape.radius;
          if (this.rayIntersectsCircle(p0x, p0y, p1x, p1y, ox + (otherCol.offsetX ?? 0), oy + (otherCol.offsetY ?? 0), radius)) {
             this.notifyCollision(w, entity, other);
          }
        } else if (otherCol.shape.type === ShapeType.Box) {
          const { width, height } = otherCol.shape;
          if (this.rayIntersectsBox(p0x, p0y, p1x, p1y, ox + (otherCol.offsetX ?? 0), oy + (otherCol.offsetY ?? 0), width, height)) {
            this.notifyCollision(w, entity, other);
          }
        }
      }
    }
  }

  /**
   * Evaluates bitwise layer and mask filtering to determine whether two entities should collide.
   *
   * @param layerA - Layer bitmask of entity A.
   * @param maskB - Mask bitmask of entity B.
   * @param layerB - Layer bitmask of entity B.
   * @param maskA - Mask bitmask of entity A.
   * @returns `true` if collision is permitted in both directions.
   */
  private shouldCollide(layerA: number, maskB: number, layerB: number, maskA: number): boolean {
    return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
  }

  /**
   * Calculates ray segment intersection with a circle shape in 2D space.
   *
   * @param p0x - Ray start position X.
   * @param p0y - Ray start position Y.
   * @param p1x - Ray end position X.
   * @param p1y - Ray end position Y.
   * @param cx - Circle center X.
   * @param cy - Circle center Y.
   * @param radius - Circle radius.
   * @returns `true` if the ray segment intersects the circle.
   */
  private rayIntersectsCircle(p0x: number, p0y: number, p1x: number, p1y: number, cx: number, cy: number, radius: number): boolean {
    const dx = p1x - p0x;
    const dy = p1y - p0y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;
    const t = ((cx - p0x) * dx + (cy - p0y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));
    const closestX = p0x + clampedT * dx;
    const closestY = p0y + clampedT * dy;
    const distSq = (closestX - cx) ** 2 + (closestY - cy) ** 2;
    return distSq <= radius * radius;
  }

  /**
   * Calculates ray segment intersection with an Axis-Aligned Bounding Box (AABB) in 2D space.
   *
   * @param p0x - Ray start position X.
   * @param p0y - Ray start position Y.
   * @param p1x - Ray end position X.
   * @param p1y - Ray end position Y.
   * @param bx - Box center X.
   * @param by - Box center Y.
   * @param width - Box width.
   * @param height - Box height.
   * @returns `true` if the ray segment cuts through the box.
   */
  private rayIntersectsBox(p0x: number, p0y: number, p1x: number, p1y: number, bx: number, by: number, width: number, height: number): boolean {
    const halfW = width / 2;
    const halfH = height / 2;
    const minX = bx - halfW;
    const maxX = bx + halfW;
    const minY = by - halfH;
    const maxY = by + halfH;

    let tmin = -Infinity;
    let tmax = Infinity;

    if (p1x !== p0x) {
      const tx1 = (minX - p0x) / (p1x - p0x);
      const tx2 = (maxX - p0x) / (p1x - p0x);
      tmin = Math.max(tmin, Math.min(tx1, tx2));
      tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (p0x < minX || p0x > maxX) return false;

    if (p1y !== p0y) {
      const ty1 = (minY - p0y) / (p1y - p0y);
      const ty2 = (maxY - p0y) / (p1y - p0y);
      tmin = Math.max(tmin, Math.min(ty1, ty2));
      tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (p0y < minY || p0y > maxY) return false;

    return tmax >= tmin && tmax >= 0 && tmin <= 1;
  }

  /**
   * Appends CCD raycast collision entries to `CollisionEvents` components on both participating entities.
   *
   * @param world - Simulation world.
   * @param entityA - Fast-moving source entity.
   * @param entityB - Intersected entity.
   */
  private notifyCollision(world: World<CoreComponentRegistry>, entityA: Entity, entityB: Entity): void {
     const compA = world.getMutableComponent(entityA, "CollisionEvents");
     if (compA) {
        compA.collisions.push({ otherEntity: entityB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });
     }
     const compB = world.getMutableComponent(entityB, "CollisionEvents");
     if (compB) {
        compB.collisions.push({ otherEntity: entityA, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });
     }
  }
}
