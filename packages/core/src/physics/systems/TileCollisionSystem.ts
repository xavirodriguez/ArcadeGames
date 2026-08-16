import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

/**
 * System that handles tile-based collisions for entities with a Collider2D (AABB) and tag "TileCollider".
 * Resolves horizontal and vertical axes separately against a Tilemap entity.
 * @public
 */
export class TileCollisionSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    const tilemapEntities = world.query("Tilemap" as Extract<keyof TRegistry, string>);
    if (tilemapEntities.length === 0) return;

    const tilemapEntity = tilemapEntities[0];
    const tilemap = world.getComponent(tilemapEntity, "Tilemap" as Extract<keyof TRegistry, string>) as any;
    const tilemapTransform = world.getComponent(tilemapEntity, "Transform" as Extract<keyof TRegistry, string>) as any;
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

    for (const entity of entities) {
      const hasTileColliderTag = this.hasTileColliderTag(world, entity);
      if (!hasTileColliderTag) continue;

      const collider = world.getComponent(entity, collider2DType) as any;
      if (!collider || !collider.enabled || collider.isTrigger) continue;
      if (collider.shape.type !== "aabb") continue;

      // Fetch mutable references for velocity and transform as they are modified by this system
      const vel = world.getMutableComponent(entity, velocityType) as any;
      const trans = world.getMutableComponent(entity, transformType) as any;
      if (!vel || !trans) continue;

      const halfW = collider.shape.halfWidth;
      const halfH = collider.shape.halfHeight;
      const offsetX = collider.offsetX;
      const offsetY = collider.offsetY;

      // Reconstruct previous positions
      const prevX = trans.x - vel.vx * deltaTime;
      const prevY = trans.y - vel.vy * deltaTime;

      // Initialize ground state defaults
      let isGrounded = false;
      let onIce = false;

      // --- Resolve X axis ---
      let currentX = trans.x;
      let currentY = prevY;

      // Player bounds on X axis (using prevY for height alignment)
      let playerMinX = currentX + offsetX - halfW;
      let playerMaxX = currentX + offsetX + halfW;
      let playerMinY = currentY + offsetY - halfH;
      let playerMaxY = currentY + offsetY + halfH;

      let minTileX = Math.floor((playerMinX - tilemapX) / tileSize);
      let maxTileX = Math.floor((playerMaxX - tilemapX) / tileSize);
      let minTileY = Math.floor((playerMinY - tilemapY) / tileSize);
      let maxTileY = Math.floor((playerMaxY - tilemapY) / tileSize);

      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tileId = tilemap.data[ty] && tilemap.data[ty][tx];
          if (tileId === undefined || tileId === 0) continue;

          const tileDef = tileDefinitions[tileId];
          if (!tileDef || !tileDef.solid || tileDef.oneWay) continue;

          const tileLeft = tilemapX + tx * tileSize;
          const tileRight = tileLeft + tileSize;

          if (vel.vx > 0) {
            trans.x = tileLeft - halfW - offsetX;
            vel.vx = 0;
            currentX = trans.x;
            break;
          } else if (vel.vx < 0) {
            trans.x = tileRight + halfW - offsetX;
            vel.vx = 0;
            currentX = trans.x;
            break;
          }
        }
      }

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

      const oldVy = vel.vy;

      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tileId = tilemap.data[ty] && tilemap.data[ty][tx];
          if (tileId === undefined || tileId === 0) continue;

          const tileDef = tileDefinitions[tileId];
          if (!tileDef) continue;

          const tileTop = tilemapY + ty * tileSize;
          const tileBottom = tileTop + tileSize;

          if (tileDef.solid) {
            if (tileDef.oneWay) {
              // Hito 9: One-way platform logic
              // Replicates standard platformer behavior: only collides when player
              // is descending (moving down vertically) and their previous Y position
              // was above the top edge of the tile.
              const prevPlayerBottom = prevY + offsetY + halfH;
              const isDescending = oldVy >= 0;
              const wasAbove = prevPlayerBottom <= tileTop + 1.0;

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
                break;
              }
            } else {
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
                break;
              } else if (oldVy < 0) {
                trans.y = tileBottom + halfH - offsetY;
                vel.vy = 0;
                if (tileDef.kind === "spike") {
                  this.handleSpikeCollision(world, entity);
                }
                break;
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
        }
      }

      // Write ground state
      if (world.hasComponent(entity, groundStateType)) {
        world.mutateComponent(entity, groundStateType, (g: any) => {
          g.isGrounded = isGrounded;
          g.iceMultiplier = onIce ? 0.2 : 1.0;
        });
      }
    }
  }

  private hasTileColliderTag(world: World<any>, entity: Entity): boolean {
    if (world.hasComponent(entity, "Tag")) {
      const tagComp = world.getComponent(entity, "Tag") as any;
      if (tagComp && tagComp.tags && tagComp.tags.includes("TileCollider")) {
        return true;
      }
    }
    return false;
  }

  private handleSpikeCollision(world: World<any>, entity: Entity): void {
    if (world.hasComponent(entity, "Health")) {
      world.mutateComponent(entity, "Health", (h: any) => {
        h.current = Math.max(0, h.current - 1);
      });
    }
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("spike:hit", { entity });
    }
  }
}
