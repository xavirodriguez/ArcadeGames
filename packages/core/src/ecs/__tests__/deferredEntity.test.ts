import { World } from "../World";
import { beginEntity, spawnViaBlueprint } from "../deferredEntity";
import { BlueprintRegistry } from "../BlueprintRegistry";
import { TransformComponent, VelocityComponent, CoreComponentRegistry } from "../CoreComponents";

describe("deferredEntity utils", () => {
  let world: World<CoreComponentRegistry, Record<string, never>, Record<string, never>>;

  beforeEach(() => {
    world = new World();
  });

  describe("beginEntity", () => {
    it("creates entity immediately when world is not updating", () => {
      const { entity, add } = beginEntity(world);

      expect(world.isAlive(entity)).toBe(true);

      const transform: TransformComponent = {
        type: "Transform",
        x: 10,
        y: 20,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 10,
        worldY: 20,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      };
      add(transform);

      expect(world.hasComponent(entity, "Transform")).toBe(true);
      expect(world.getComponent(entity, "Transform")).toEqual(transform);
    });

    it("defers entity creation and component attachment when world.isUpdating is true", () => {
      world.isUpdating = true;

      const { entity, add } = beginEntity(world);

      expect(world.isAlive(entity)).toBe(false);

      const transform: TransformComponent = {
        type: "Transform",
        x: 30,
        y: 40,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 30,
        worldY: 40,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      };
      add(transform);
      expect(world.hasComponent(entity, "Transform")).toBe(false);

      world.isUpdating = false;
      world.flush();

      expect(world.isAlive(entity)).toBe(true);
      expect(world.hasComponent(entity, "Transform")).toBe(true);
      expect(world.getComponent(entity, "Transform")).toEqual(transform);
    });

    it("handles pre-reserved entity ID explicitly passed in", () => {
      const entityId = world.reserveEntityId();
      expect(world.isAlive(entityId)).toBe(false);

      const { entity, add } = beginEntity(world, false, entityId);
      expect(entity).toBe(entityId);
      expect(world.isAlive(entityId)).toBe(true);

      const velocity: VelocityComponent = {
        type: "Velocity",
        vx: 5,
        vy: -5,
        angularVelocity: 0
      };
      add(velocity);
      expect(world.getComponent(entityId, "Velocity")).toEqual(velocity);
    });
  });

  describe("spawnViaBlueprint", () => {
    beforeEach(() => {
      const registry = new BlueprintRegistry<CoreComponentRegistry, Record<string, never>, Record<string, never>>();
      registry.register("test_bp" as never, {
        spawn: (w: World<CoreComponentRegistry, Record<string, never>, Record<string, never>>, ent: number, args: { x: number; y: number }) => {
          const transform: TransformComponent = {
            type: "Transform",
            x: args.x,
            y: args.y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            worldX: args.x,
            worldY: args.y,
            worldRotation: 0,
            worldScaleX: 1,
            worldScaleY: 1,
            dirty: false
          };
          w.addComponent(ent, transform);
        }
      } as never);
      world.setResource("BlueprintRegistry", registry);
    });

    it("spawns blueprint immediately when world is not updating", () => {
      const entity = spawnViaBlueprint(world, "test_bp" as never, { x: 100, y: 200 });

      expect(world.isAlive(entity)).toBe(true);
      expect(world.getComponent(entity, "Transform")?.x).toBe(100);
    });

    it("defers blueprint spawning when world.isUpdating is true", () => {
      world.isUpdating = true;

      const entity = spawnViaBlueprint(world, "test_bp" as never, { x: 500, y: 600 });
      expect(world.isAlive(entity)).toBe(false);
      expect(world.hasComponent(entity, "Transform")).toBe(false);

      world.isUpdating = false;
      world.flush();

      expect(world.isAlive(entity)).toBe(true);
      expect(world.hasComponent(entity, "Transform")).toBe(true);
      expect(world.getComponent(entity, "Transform")?.x).toBe(500);
    });
  });
});
