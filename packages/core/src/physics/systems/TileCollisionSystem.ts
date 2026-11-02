import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import {
  CoreComponentRegistry,
  TilemapComponent,
  TileDefinition,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  ColliderComponent,
  PlatformerGroundStateComponent,
  PhysicsContact,
  PhysicsContactStateComponent,
  HealthComponent
} from "../../ecs/CoreComponents";
import { TagComponent } from "../../ecs/TagComponent";
import { Entity } from "../../ecs/Entity";
import { ShapeType } from "../shapes/Shapes";

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
 * Iterates over solid/active tile definitions within specified matrix grid bounds.
 * Returning true from callback breaks early out of iteration.
 * @public
 */
export function forEachSolidTileInRange(
  tilemapData: number[][],
  tileDefinitions: Record<number, TileDefinition>,
  minTileX: number,
  maxTileX: number,
  minTileY: number,
  maxTileY: number,
  callback: (tx: number, ty: number, tileDef: TileDefinition) => boolean | void
): void {
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    const row = tilemapData[ty];
    if (!row) continue;
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const tileId = row[tx];
      if (tileId === undefined || tileId === 0) continue;

      const tileDef = tileDefinitions[tileId];
      if (!tileDef) continue;

      if (callback(tx, ty, tileDef) === true) {
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
    const contactStateType = "PhysicsContactState" as Extract<keyof TRegistry, string>;
    const contactEntities = world.query(contactStateType);
    for (let i = 0; i < contactEntities.length; i++) {
      const state = world.getMutableComponent(contactEntities[i], contactStateType) as PhysicsContactStateComponent | undefined;
      if (state) {
        // PlatformCarrySystem resolves moving supports in Simulation before this
        // collision phase. Retain only live platform contacts across the reset.
        state.contacts = state.contacts.filter((contact) =>
          world.hasEntity(contact.entity) && world.hasComponent(contact.entity, "MovingPlatform")
        );
        state.groundContact = state.contacts.find((contact) => contact.normal.y < -0.5);
        state.isGrounded = state.groundContact !== undefined;
      }
    }

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
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;

    // Tile collision accepts both collider contracts used by Platformer and Echo Runner.
    const entities = world.query(transformType, velocityType);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const hasTileColliderTag = this.hasTileColliderTag(world, entity);
      if (!hasTileColliderTag) continue;

      const collider2D = world.getComponent(entity, collider2DType) as Collider2DComponent | undefined;
      const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
      let halfW: number;
      let halfH: number;
      let offsetX: number;
      let offsetY: number;

      if (collider2D && collider2D.enabled && !collider2D.isTrigger && collider2D.shape.type === "aabb") {
        halfW = collider2D.shape.halfWidth;
        halfH = collider2D.shape.halfHeight;
        offsetX = collider2D.offsetX;
        offsetY = collider2D.offsetY;
      } else if (collider && collider.enabled && !collider.isTrigger && collider.shape.type === ShapeType.Box) {
        halfW = collider.shape.width / 2;
        halfH = collider.shape.height / 2;
        offsetX = collider.offsetX ?? 0;
        offsetY = collider.offsetY ?? 0;
      } else {
        continue;
      }

      const vel = world.getMutableComponent(entity, velocityType) as VelocityComponent | undefined;
      const trans = world.getMutableComponent(entity, transformType) as TransformComponent | undefined;
      if (!vel || !trans) continue;

      const prevX = trans.x - vel.vx * deltaTime;
      const prevY = trans.y - vel.vy * deltaTime;

      const previousContactState = world.getComponent(entity, contactStateType) as PhysicsContactStateComponent | undefined;
      const platformContacts = previousContactState?.contacts.filter((contact) =>
        world.hasEntity(contact.entity) && world.hasComponent(contact.entity, "MovingPlatform")
      ) ?? [];
      const platformGroundContact = platformContacts.find((contact) => contact.normal.y < -0.5);
      let isGrounded = platformGroundContact !== undefined;
      let onIce = false;
      const contacts: PhysicsContact[] = platformContacts.slice();

      // --- Resolve X axis ---
      let currentX = trans.x;
      let currentY = prevY;

      let playerMinX = currentX + offsetX - halfW;
      let playerMaxX = currentX + offsetX + halfW;
      let playerMinY = currentY + offsetY - halfH;
      let playerMaxY = currentY + offsetY + halfH;

      const EPSILON = 0.001;
      let minTileX = Math.floor((playerMinX - tilemapX) / tileSize);
      let maxTileX = Math.floor((playerMaxX - tilemapX - EPSILON) / tileSize);
      let minTileY = Math.floor((playerMinY - tilemapY) / tileSize);
      let maxTileY = Math.floor((playerMaxY - tilemapY - EPSILON) / tileSize);

      forEachSolidTileInRange(
        tilemap.data,
        tileDefinitions,
        minTileX,
        maxTileX,
        minTileY,
        maxTileY,
        (tx, ty, tileDef) => {
          if (!tileDef.solid || tileDef.oneWay || tileDef.slope) return;

          const tileLeft = tilemapX + tx * tileSize;
          const tileRight = tileLeft + tileSize;

          if (vel.vx > 0) {
            contacts.push(this.createContact(tilemapEntity, tilemap, tx, ty, tileDef,
              { x: tileLeft, y: currentY + offsetY }, { x: -1, y: 0 }));
            trans.x = tileLeft - halfW - offsetX;
            trans.dirty = true;
            vel.vx = 0;
            currentX = trans.x;
            return true;
          } else if (vel.vx < 0) {
            contacts.push(this.createContact(tilemapEntity, tilemap, tx, ty, tileDef,
              { x: tileRight, y: currentY + offsetY }, { x: 1, y: 0 }));
            trans.x = tileRight + halfW - offsetX;
            trans.dirty = true;
            vel.vx = 0;
            currentX = trans.x;
            return true;
          }
        }
      );

      // --- Resolve Y axis ---
      currentY = trans.y;
      playerMinX = currentX + offsetX - halfW;
      playerMaxX = currentX + offsetX + halfW;
      playerMinY = currentY + offsetY - halfH;
      playerMaxY = currentY + offsetY + halfH;

      minTileX = Math.floor((playerMinX - tilemapX) / tileSize);
      maxTileX = Math.floor((playerMaxX - tilemapX - EPSILON) / tileSize);
      minTileY = Math.floor((playerMinY - tilemapY) / tileSize);
      maxTileY = Math.floor((playerMaxY - tilemapY - EPSILON) / tileSize);

      const oldVy = vel.vy;

      forEachSolidTileInRange(
        tilemap.data,
        tileDefinitions,
        minTileX,
        maxTileX,
        minTileY,
        maxTileY,
        (_tx, ty, tileDef) => {
          const tileTop = tilemapY + ty * tileSize;
          const tileBottom = tileTop + tileSize;

          if (tileDef.solid) {
            if (tileDef.slope) {
              const prevPlayerTop = prevY + offsetY - halfH;
              if (oldVy < 0 && !tileDef.oneWay && prevPlayerTop >= tileBottom - 1.0) {
                contacts.push(this.createContact(tilemapEntity, tilemap, _tx, ty, tileDef,
                  { x: currentX + offsetX, y: tileBottom }, { x: 0, y: 1 }));
                trans.y = tileBottom + halfH - offsetY;
                trans.dirty = true;
                vel.vy = 0;
                return true;
              }
              return;
            }
            if (tileDef.oneWay) {
              const prevPlayerBottom = prevY + offsetY + halfH;
              const isDescending = oldVy >= 0;
              const wasAbove = prevPlayerBottom <= tileTop + 1.0;

              if (isDescending && wasAbove) {
                const landing = this.applyLandingOnTile(world, entity, trans, vel, tileTop, halfH, offsetY, oldVy, tileDef);
                const contact = this.createContact(tilemapEntity, tilemap, _tx, ty, tileDef,
                  { x: currentX + offsetX, y: tileTop }, { x: 0, y: -1 });
                contacts.push(contact);
                isGrounded = landing.isGrounded;
                if (contact.material && contact.material.restitution > 0) {
                  vel.vy = -Math.max(0, oldVy) * Math.min(1, Math.max(0, contact.material.restitution));
                  isGrounded = false;
                }
                if (landing.onIce) onIce = true;
                return true;
              }
            } else {
              if (oldVy > 0) {
                const landing = this.applyLandingOnTile(world, entity, trans, vel, tileTop, halfH, offsetY, oldVy, tileDef);
                const contact = this.createContact(tilemapEntity, tilemap, _tx, ty, tileDef,
                  { x: currentX + offsetX, y: tileTop }, { x: 0, y: -1 });
                contacts.push(contact);
                isGrounded = landing.isGrounded;
                if (contact.material && contact.material.restitution > 0) {
                  vel.vy = -Math.max(0, oldVy) * Math.min(1, Math.max(0, contact.material.restitution));
                  isGrounded = false;
                }
                if (landing.onIce) onIce = true;
                return true;
              } else if (oldVy < 0) {
                contacts.push(this.createContact(tilemapEntity, tilemap, _tx, ty, tileDef,
                  { x: currentX + offsetX, y: tileBottom }, { x: 0, y: 1 }));
                trans.y = tileBottom + halfH - offsetY;
                trans.dirty = true;
                vel.vy = 0;
                if (tileDef.kind === "spike") {
                  this.handleSpikeCollision(world, entity);
                }
                return true;
              }
            }
          } else {
            const res = this.applyTileKindEffect(world, entity, vel, oldVy, tileDef);
            if (res.isGrounded !== undefined) isGrounded = res.isGrounded;
          }
        }
      );

      // --- Resolve authored slope surfaces ---
      // Resolve the AABB support point against a line segment. This prevents the
      // full rectangular collider from penetrating the ramp at its downhill edge.
      let slopeGroundContact: PhysicsContact | undefined;
      forEachSolidTileInRange(
        tilemap.data,
        tileDefinitions,
        minTileX,
        maxTileX,
        minTileY,
        maxTileY,
        (tx, ty, tileDef) => {
          const slope = tileDef.slope;
          if (!tileDef.solid || !slope) return;
          if (tileDef.oneWay && oldVy < 0) return;
          if (![slope.start.x, slope.start.y, slope.end.x, slope.end.y].every(Number.isFinite)) return;
          const dx = slope.end.x - slope.start.x;
          const dy = slope.end.y - slope.start.y;
          if (dx <= EPSILON || slope.start.x < 0 || slope.end.x > tileSize
            || slope.start.y < 0 || slope.start.y > tileSize
            || slope.end.y < 0 || slope.end.y > tileSize) return;

          const tileLeft = tilemapX + tx * tileSize;
          const tileTop = tilemapY + ty * tileSize;
          const localCenterX = currentX + offsetX - tileLeft;
          if (localCenterX < slope.start.x || localCenterX > slope.end.x) return;

          const t = (localCenterX - slope.start.x) / dx;
          const surfaceY = tileTop + slope.start.y + dy * t;
          const tangentLength = Math.sqrt(dx * dx + dy * dy);
          if (tangentLength <= EPSILON) return;
          const tangentX = dx / tangentLength;
          const tangentY = dy / tangentLength;
          const normalX = dy / tangentLength;
          const normalY = -dx / tangentLength;
          const angleDegrees = Math.acos(Math.min(1, Math.max(-1, -normalY))) * (180 / Math.PI);
          const configuredMaxAngle = slope.maxWalkableAngleDegrees !== undefined && Number.isFinite(slope.maxWalkableAngleDegrees)
            ? slope.maxWalkableAngleDegrees
            : 50;
          const maxWalkableAngle = Math.max(0, Math.min(89.9, configuredMaxAngle));
          const walkable = angleDegrees <= maxWalkableAngle;

          const supportRadius = halfW * Math.abs(normalX) + halfH * Math.abs(normalY);
          const snapDistance = slope.snapDistance !== undefined && Number.isFinite(slope.snapDistance)
            ? Math.max(0, slope.snapDistance)
            : 8;
          const previousLocalX = prevX + offsetX - tileLeft;
          let previousSeparation = supportRadius + snapDistance;
          if (previousLocalX >= slope.start.x && previousLocalX <= slope.end.x) {
            const previousT = (previousLocalX - slope.start.x) / dx;
            const previousSurfaceY = tileTop + slope.start.y + dy * previousT;
            previousSeparation = (prevY + offsetY - previousSurfaceY) * normalY;
          }
          const currentSeparation = (trans.y + offsetY - surfaceY) * normalY;
          if (previousSeparation < supportRadius - snapDistance
            || currentSeparation > supportRadius + snapDistance) return;

          // A positive normal velocity means the character is jumping away from the surface.
          const normalVelocity = vel.vx * normalX + vel.vy * normalY;
          if (normalVelocity > 0.01 && currentSeparation >= supportRadius - snapDistance) return;

          const correction = supportRadius - currentSeparation;
          trans.x += normalX * correction;
          trans.y += normalY * correction;
          trans.dirty = true;
          currentX = trans.x;

          const tangentVelocity = vel.vx * tangentX + vel.vy * tangentY;
          const material = tileDef.materialId ? tilemap.physicsMaterials?.[tileDef.materialId] : undefined;
          const staticFriction = material?.staticFriction ?? 0.8;
          const dynamicFriction = material?.dynamicFriction ?? 0.6;
          const gravity = Math.max(0, (world.getComponent(entity, "PlatformerGravityConfig" as Extract<keyof TRegistry, string>) as { fallGravity?: number } | undefined)?.fallGravity ?? 980);
          const staticLimit = Math.max(0, staticFriction) * gravity * Math.abs(normalY) * Math.max(0, deltaTime);
          const dynamicLimit = Math.max(0, dynamicFriction) * gravity * Math.abs(normalY) * Math.max(0, deltaTime);
          const movementInput = world.getComponent(entity, "PlatformerInput" as Extract<keyof TRegistry, string>) as { moveDir?: number } | undefined;
          const hasDriveInput = (movementInput?.moveDir ?? 0) !== 0;
          const resolvedTangentVelocity = !hasDriveInput && Math.abs(tangentVelocity) <= staticLimit
            ? 0
            : hasDriveInput
              ? tangentVelocity
              : this.moveTowards(tangentVelocity, 0, dynamicLimit);
          vel.vx = resolvedTangentVelocity * tangentX;
          vel.vy = resolvedTangentVelocity * tangentY;

          const contactPoint = {
            x: trans.x + offsetX + (normalX > 0 ? -halfW : normalX < 0 ? halfW : 0),
            y: trans.y + offsetY + (normalY > 0 ? -halfH : normalY < 0 ? halfH : 0)
          };
          const contact = this.createContact(tilemapEntity, tilemap, tx, ty, tileDef,
            contactPoint, { x: normalX, y: normalY });
          contacts.push(contact);
          if (walkable) {
            isGrounded = true;
            slopeGroundContact = contact;
          }
          return true;
        }
      );


      if (world.hasComponent(entity, contactStateType)) {
        const mutableContacts = world.getMutableComponent(entity, contactStateType) as PhysicsContactStateComponent | undefined;
        if (mutableContacts) {
          mutableContacts.contacts = contacts;
          const tileGroundContact = contacts.find((contact) =>
            contact.normal.y < -0.5 && !world.hasComponent(contact.entity, "MovingPlatform")
          );
          mutableContacts.groundContact = isGrounded
            ? (slopeGroundContact ?? tileGroundContact ?? platformGroundContact)
            : undefined;
          mutableContacts.isGrounded = isGrounded && mutableContacts.groundContact !== undefined;
        }
      }

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

  private createContact(
    tilemapEntity: Entity,
    tilemap: TilemapComponent,
    _tx: number,
    _ty: number,
    tileDef: TileDefinition,
    point: { x: number; y: number },
    normal: { x: number; y: number }
  ): PhysicsContact {
    const materialId = tileDef.materialId;
    const material = materialId ? tilemap.physicsMaterials?.[materialId] : undefined;
    return {
      entity: tilemapEntity,
      point,
      normal,
      separation: 0,
      ...(materialId ? { materialId } : {}),
      surfaceVelocity: material?.conveyorVelocity
        ? { x: material.conveyorVelocity.x, y: material.conveyorVelocity.y }
        : { x: 0, y: 0 },
      ...(material ? { material } : {})
    };
  }

  private applyLandingOnTile(
    world: World<TRegistry>,
    entity: Entity,
    trans: TransformComponent,
    vel: VelocityComponent,
    tileTop: number,
    halfH: number,
    offsetY: number,
    oldVy: number,
    tileDef: TileDefinition
  ): { isGrounded: boolean; onIce: boolean } {
    trans.y = tileTop - halfH - offsetY;
    trans.dirty = true;
    vel.vy = 0;
    let isGrounded = true;
    let onIce = false;
    const res = this.applyTileKindEffect(world, entity, vel, oldVy, tileDef);
    if (res.onIce !== undefined) onIce = res.onIce;
    if (res.isGrounded !== undefined) isGrounded = res.isGrounded;
    return { isGrounded, onIce };
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

  private applyTileKindEffect(
    world: World<TRegistry>,
    entity: Entity,
    vel: VelocityComponent,
    oldVy: number,
    tileDef: { kind?: string; bounce?: number }
  ): { isGrounded?: boolean; onIce?: boolean } {
    if (!tileDef.kind) return {};
    const handler = this.tileKindHandlers[tileDef.kind];
    if (handler) {
      return handler({ world, entity, vel, oldVy, tileDef, system: this });
    }
    return {};
  }

  private tileKindHandlers: Record<
    string,
    (ctx: {
      world: World<TRegistry>;
      entity: Entity;
      vel: VelocityComponent;
      oldVy: number;
      tileDef: { kind?: string; bounce?: number };
      system: TileCollisionSystem<TRegistry>;
    }) => { isGrounded?: boolean; onIce?: boolean }
  > = {
    ice: () => ({ onIce: true }),
    bounce: ({ vel, oldVy, tileDef }) => {
      vel.vy = -oldVy * (tileDef.bounce ?? 0.8);
      return { isGrounded: false };
    },
    spike: ({ world, entity, system }) => {
      system.handleSpikeCollision(world, entity);
      return {};
    }
  };

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
