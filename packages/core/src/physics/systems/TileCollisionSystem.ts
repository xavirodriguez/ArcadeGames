import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import {
  CoreComponentRegistry,
  TilemapComponent,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  PlatformerGroundStateComponent,
  HealthComponent
} from "../../ecs/CoreComponents";
import { TagComponent } from "../../ecs/TagComponent";
import { Entity } from "../../ecs/Entity";

/**
 * Iterates over tile coordinates within specified matrix grid bounds.
 * Returning true from callback breaks early out of iteration.
 * @public
 */
export function forEachTileInBounds(
  minTileX: number,
  minTileY: number,
  maxTileX: number,
  maxTileY: number,
  callback: (tx: number, ty: number) => boolean | void
): void {
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (callback(tx, ty) === true) {
        return;
      }
    }
  }
}

/**
 * System resolving tilemap grid collisions for platformer entities.
 *
 * @remarks
 * Performs separate axis resolution (X axis followed by Y axis) against a `Tilemap` grid.
 * Supports specialized tile behaviors including one-way platforms, ice friction modifiers,
 * bounce surfaces, and spike hazard damage.
 *
 * @public
 */
export class TileCollisionSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  /**
   * Resolves entity collisions against active tilemap grid boundaries and updates ground states.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Elapsed frame time in seconds.
   *
   * @sideEffect Mutates `Transform`, `Velocity`, `Health`, and `PlatformerGroundState` components.
   */
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const tilemapEntities = world.query("Tilemap" as Extract<keyof TRegistry, string>);
    if (tilemapEntities.length === 0) return;

    const tilemapEntity = tilemapEntities[0];
    const tilemap = world.getComponent(tilemapEntity, "Tilemap" as Extract<keyof TRegistry, string>) as TilemapComponent | undefined;
    const tilemapTransform = world.getComponent(tilemapEntity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
    if (!tilemap) return;

    const tilemapX = tilemapTransform ? tilemapTransform.x : 0;
    const tilemapY = tilemapTransform ? tilemapTransform.y : 0;
    const tileSize = tilemap.tileSize;
    const tileDefinitions = tilemap.tileDefinitions || {};

    const collider2DType = "Collider2D" as Extract<keyof TRegistry, string>;
    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;

    const entities = world.query(transformType, velocityType, collider2DType);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const hasTileColliderTag = this.hasTileColliderTag(world, entity);
      if (!hasTileColliderTag) continue;

      const collider = world.getComponent(entity, collider2DType) as Collider2DComponent | undefined;
      if (!collider || !collider.enabled || collider.isTrigger) continue;
      if (collider.shape.type !== "aabb") continue;

      const vel = world.getMutableComponent(entity, velocityType) as VelocityComponent | undefined;
      const trans = world.getMutableComponent(entity, transformType) as TransformComponent | undefined;
      if (!vel || !trans) continue;

      const halfW = collider.shape.halfWidth;
      const halfH = collider.shape.halfHeight;
      const offsetX = collider.offsetX;
      const offsetY = collider.offsetY;

      const prevX = trans.x - vel.vx * deltaTime;
      const prevY = trans.y - vel.vy * deltaTime;

      let isGrounded = false;
      let onIce = false;

      // --- Resolve X axis ---
      let currentX = trans.x;
      let currentY = prevY;

      let playerMinX = currentX + offsetX - halfW;
      let playerMaxX = currentX + offsetX + halfW;
      let playerMinY = currentY + offsetY - halfH;
      let playerMaxY = currentY + offsetY + halfH;

      let minTileX = Math.floor((playerMinX - tilemapX) / tileSize);
      let maxTileX = Math.floor((playerMaxX - tilemapX) / tileSize);
      let minTileY = Math.floor((playerMinY - tilemapY) / tileSize);
      // TODO(refactor): código duplicado detectado (bloque) con physics/systems/TileCollisionSystem.ts:143-150. Considerar extraer a función compartida. Ref: 07552814
      let maxTileY = Math.floor((playerMaxY - tilemapY) / tileSize);

      forEachTileInBounds(minTileX, minTileY, maxTileX, maxTileY, (tx, ty) => {
        const tileId = tilemap.data[ty] && tilemap.data[ty][tx];
        if (tileId === undefined || tileId === 0) return;

        const tileDef = tileDefinitions[tileId];
        if (!tileDef || !tileDef.solid || tileDef.oneWay) return;

        const tileLeft = tilemapX + tx * tileSize;
        const tileRight = tileLeft + tileSize;

        if (vel.vx > 0) {
          trans.x = tileLeft - halfW - offsetX;
          vel.vx = 0;
          currentX = trans.x;
          return true;
        } else if (vel.vx < 0) {
          trans.x = tileRight + halfW - offsetX;
          vel.vx = 0;
          currentX = trans.x;
          return true;
        }
      });

      // --- Resolve Y axis ---
      currentY = trans.y;
      playerMinX = currentX + offsetX - halfW;
      playerMaxX = currentX + offsetX + halfW;
      playerMinY = currentY + offsetY - halfH;
      playerMaxY = currentY + offsetY + halfH;

      minTileX = Math.floor((playerMinX - tilemapX) / tileSize);
      maxTileX = Math.floor((playerMaxX - tilemapX) / tileSize);
      minTileY = Math.floor((playerMinY - tilemapY) / tileSize);
      maxTileY = Math.floor((playerMaxY - tilemapY) / tileSize);

      // TODO(refactor): código duplicado detectado (bloque) con physics/systems/TileCollisionSystem.ts:107-114. Considerar extraer a función compartida. Ref: eeeb3706
      const oldVy = vel.vy;

      forEachTileInBounds(minTileX, minTileY, maxTileX, maxTileY, (tx, ty) => {
        const tileId = tilemap.data[ty] && tilemap.data[ty][tx];
        if (tileId === undefined || tileId === 0) return;

        const tileDef = tileDefinitions[tileId];
        if (!tileDef) return;

        const tileTop = tilemapY + ty * tileSize;
        const tileBottom = tileTop + tileSize;

        if (tileDef.solid) {
          if (tileDef.oneWay) {
            const prevPlayerBottom = prevY + offsetY + halfH;
            const isDescending = oldVy >= 0;
            const wasAbove = prevPlayerBottom <= tileTop + 1.0;

            // TODO(refactor): código duplicado detectado (bloque) con physics/systems/TileCollisionSystem.ts:176-189. Considerar extraer a función compartida. Ref: d056ddc2
            if (isDescending && wasAbove) {
              trans.y = tileTop - halfH - offsetY;
              vel.vy = 0;
              isGrounded = true;
              if (tileDef.kind === "ice") {
                onIce = true;
              } else if (tileDef.kind === "bounce") {
                vel.vy = -oldVy * (tileDef.bounce ?? 0.8);
                isGrounded = false;
              } else if (tileDef.kind === "spike") {
                this.handleSpikeCollision(world, entity);
              }
              return true;
            }
          } else {
            // TODO(refactor): código duplicado detectado (bloque) con physics/systems/TileCollisionSystem.ts:163-176. Considerar extraer a función compartida. Ref: a710136f
            if (oldVy > 0) {
              trans.y = tileTop - halfH - offsetY;
              vel.vy = 0;
              isGrounded = true;
              if (tileDef.kind === "ice") {
                onIce = true;
              } else if (tileDef.kind === "bounce") {
                vel.vy = -oldVy * (tileDef.bounce ?? 0.8);
                isGrounded = false;
              } else if (tileDef.kind === "spike") {
                this.handleSpikeCollision(world, entity);
              }
              return true;
            } else if (oldVy < 0) {
              trans.y = tileBottom + halfH - offsetY;
              vel.vy = 0;
              if (tileDef.kind === "spike") {
                this.handleSpikeCollision(world, entity);
              }
              return true;
            }
          }
        } else {
          if (tileDef.kind === "spike") {
            this.handleSpikeCollision(world, entity);
          } else if (tileDef.kind === "bounce") {
            vel.vy = -oldVy * (tileDef.bounce ?? 0.8);
            isGrounded = false;
          }
        }
      });

      if (world.hasComponent(entity, groundStateType)) {
        const targetIceMultiplier = onIce ? 0.2 : 1.0;
        const currentGround = world.getComponent(entity, groundStateType) as PlatformerGroundStateComponent | undefined;
        if (!currentGround || currentGround.isGrounded !== isGrounded || currentGround.iceMultiplier !== targetIceMultiplier) {
          const mutableGround = world.getMutableComponent(entity, groundStateType) as PlatformerGroundStateComponent | undefined;
          if (mutableGround) {
            mutableGround.isGrounded = isGrounded;
            mutableGround.iceMultiplier = targetIceMultiplier;
          }
        }
      }
    }
  }

  private hasTileColliderTag(world: World<TRegistry>, entity: Entity): boolean {
    const tagKey = "Tag" as Extract<keyof TRegistry, string>;
    if (world.hasComponent(entity, tagKey)) {
      const tagComp = world.getComponent(entity, tagKey) as TagComponent | undefined;
      if (tagComp && tagComp.tags && tagComp.tags.includes("TileCollider")) {
        return true;
      }
    }
    return false;
  }

  private handleSpikeCollision(world: World<TRegistry>, entity: Entity): void {
    const healthKey = "Health" as Extract<keyof TRegistry, string>;
    if (world.hasComponent(entity, healthKey)) {
      const h = world.getMutableComponent(entity, healthKey) as HealthComponent | undefined;
      if (h) {
        h.current = Math.max(0, h.current - 1);
      }
    }
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("spike:hit", { entity });
    }
  }
}
