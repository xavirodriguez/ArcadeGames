import { World, BlueprintRegistry, CoreComponentRegistry, BlueprintDefinition, TransformComponent, RenderComponent, VelocityComponent } from "../src";

describe("Deferred Blueprint Spawning", () => {
  type TestComponents = CoreComponentRegistry;

  const createTestWorldAndRegistry = () => {
    const world = new World<TestComponents>();
    const registry = new BlueprintRegistry<TestComponents>();

    const shipBlueprint: BlueprintDefinition<TestComponents, any, { x: number; y: number; name?: string }> = {
      spawn: (w, entity, args) => {
        w.addComponent(entity, {
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
        } as TransformComponent);

        w.addComponent(entity, {
          type: "Render",
          shape: "ship",
          size: 10,
          color: "#ffffff",
          visible: true,
          opacity: 1,
          order: 1,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        } as RenderComponent);
      }
    };

    const bulletBlueprint: BlueprintDefinition<TestComponents, any, { vx: number; vy: number }> = {
      spawn: (w, entity, args) => {
        w.addComponent(entity, {
          type: "Velocity",
          vx: args.vx,
          vy: args.vy,
          angularVelocity: 0
        } as VelocityComponent);
      }
    };

    registry.register("ship", shipBlueprint);
    registry.register("bullet", bulletBlueprint);
    world.setResource("BlueprintRegistry", registry);

    return { world, registry };
  };

  it("1. Immediate Spawning (isUpdating = false)", () => {
    const { world, registry } = createTestWorldAndRegistry();

    const entity = world.createEntity();
    const blueprint = registry.get("ship");
    expect(blueprint).toBeDefined();
    blueprint!.spawn(world, entity, { x: 100, y: 200 });

    expect(world.isAlive(entity)).toBe(true);
    const transform = world.getComponent(entity, "Transform");
    const render = world.getComponent(entity, "Render");

    expect(transform).toBeDefined();
    expect(transform?.x).toBe(100);
    expect(transform?.y).toBe(200);
    expect(render).toBeDefined();
    expect(render?.shape).toBe("ship");
  });

  it("2. Deferred Spawning (isUpdating = true)", () => {
    const { world } = createTestWorldAndRegistry();

    world.isUpdating = true;

    const entityId = world.reserveEntityId();
    expect(world.isAlive(entityId)).toBe(false);

    world.commands.spawnFromBlueprintForEntity(entityId, "ship", { x: 150, y: 250 });

    // Components should NOT be added before flush
    expect(world.getComponent(entityId, "Transform")).toBeUndefined();

    world.isUpdating = false;
    world.flush();

    // After flush, entity should be activated and components added
    expect(world.isAlive(entityId)).toBe(true);
    const transform = world.getComponent(entityId, "Transform");
    const render = world.getComponent(entityId, "Render");

    expect(transform?.x).toBe(150);
    expect(transform?.y).toBe(250);
    expect(render?.shape).toBe("ship");
  });

  it("3. Blueprint Arguments check", () => {
    const { world } = createTestWorldAndRegistry();

    const entityId = world.reserveEntityId();
    world.commands.spawnFromBlueprintForEntity(entityId, "bullet", { vx: 50, vy: -100 });

    world.flush();

    const velocity = world.getComponent(entityId, "Velocity");
    expect(velocity).toBeDefined();
    expect(velocity?.vx).toBe(50);
    expect(velocity?.vy).toBe(-100);
  });

  it("4. Multiple Spawns in same update cycle", () => {
    const { world } = createTestWorldAndRegistry();

    world.isUpdating = true;

    const id1 = world.reserveEntityId();
    const id2 = world.reserveEntityId();
    const id3 = world.reserveEntityId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);

    world.commands.spawnFromBlueprintForEntity(id1, "ship", { x: 10, y: 20 });
    world.commands.spawnFromBlueprintForEntity(id2, "ship", { x: 30, y: 40 });
    world.commands.spawnFromBlueprintForEntity(id3, "bullet", { vx: 5, vy: 15 });

    world.isUpdating = false;
    world.flush();

    expect(world.isAlive(id1)).toBe(true);
    expect(world.isAlive(id2)).toBe(true);
    expect(world.isAlive(id3)).toBe(true);

    expect(world.getComponent(id1, "Transform")?.x).toBe(10);
    expect(world.getComponent(id2, "Transform")?.x).toBe(30);
    expect(world.getComponent(id3, "Velocity")?.vx).toBe(5);
  });

  it("5. Equivalence Test: Immediate vs Deferred produces identical components", () => {
    const { world: immediateWorld } = createTestWorldAndRegistry();
    const { world: deferredWorld } = createTestWorldAndRegistry();

    // Immediate
    const immediateId = immediateWorld.createEntity();
    const registry = immediateWorld.getResource<BlueprintRegistry<TestComponents>>("BlueprintRegistry");
    registry?.get("ship")?.spawn(immediateWorld, immediateId, { x: 42, y: 84 });

    // Deferred
    deferredWorld.isUpdating = true;
    const deferredId = deferredWorld.reserveEntityId();
    deferredWorld.commands.spawnFromBlueprintForEntity(deferredId, "ship", { x: 42, y: 84 });
    deferredWorld.isUpdating = false;
    deferredWorld.flush();

    expect(immediateWorld.getEntityComponentTypes(immediateId).sort()).toEqual(
      deferredWorld.getEntityComponentTypes(deferredId).sort()
    );

    expect(immediateWorld.getComponent(immediateId, "Transform")).toEqual(
      deferredWorld.getComponent(deferredId, "Transform")
    );
    expect(immediateWorld.getComponent(immediateId, "Render")).toEqual(
      deferredWorld.getComponent(deferredId, "Render")
    );
  });

  it("6. Missing blueprint handles gracefully without crashing", () => {
    const { world } = createTestWorldAndRegistry();

    const entityId = world.reserveEntityId();
    world.commands.spawnFromBlueprintForEntity(entityId, "non_existent" as any, {});

    expect(() => world.flush()).not.toThrow();
    // Entity is activated but no components added
    expect(world.isAlive(entityId)).toBe(true);
    expect(world.getEntityComponentTypes(entityId).length).toBe(0);
  });
});
