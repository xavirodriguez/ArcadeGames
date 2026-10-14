import { World, BaseConfigSchema } from "@tiny-aster/core";
import { EntityBlueprintDefSchema, spawnFromBlueprint, evaluateExpression, evaluateCondition } from "../../index";

describe("BlueprintInterpreter", () => {
  let world: World<any, any>;

  beforeEach(() => {
    world = new World();
    world.gameplayRandom.unlock();
    world.setResource("GameConfig", BaseConfigSchema.parse({}));
    const gsEntity = world.createEntity();
    world.addComponent(gsEntity, { type: "GameState", mode: "story", score: 0 });
  });

  it("should validate blueprint definitions via Zod schema", () => {
    const validDef = EntityBlueprintDefSchema.parse({
      id: "test_bullet",
      tags: ["bullet", "projectile"],
      components: [
        { type: "Transform", props: { x: "$args.x", y: "$args.y" } },
        { type: "Velocity", props: { vx: 0, vy: -500 } }
      ],
      onSpawn: [{ event: "bullet:spawned", payload: { x: "$args.x" } }]
    });

    expect(validDef.id).toBe("test_bullet");
    expect(validDef.components).toHaveLength(2);
  });

  it("should evaluate expressions correctly ($args, $config, $random)", () => {
    world.setResource("GameConfig", { SPEED: 300 });

    expect(evaluateExpression("$args.x", world, { x: 150 })).toBe(150);
    expect(evaluateExpression("$config.SPEED", world, {})).toBe(300);

    const randVal = evaluateExpression("$random(10, 20)", world, {});
    expect(randVal).toBeGreaterThanOrEqual(10);
    expect(randVal).toBeLessThanOrEqual(20);
  });

  it("should evaluate conditional when statements", () => {
    expect(evaluateCondition("mode === 'story'", world, {})).toBe(true);
    expect(evaluateCondition("mode === 'arcade'", world, {})).toBe(false);
    expect(evaluateCondition("args.enabled", world, { enabled: true })).toBe(true);
  });

  it("should spawn entity from blueprint definition with tags and components", () => {
    const def = EntityBlueprintDefSchema.parse({
      id: "powerup_shield",
      tags: ["powerup"],
      components: [
        { type: "Transform", props: { x: "$args.x", y: "$args.y" } },
        { type: "PowerUp", when: "mode === 'story'", props: { kind: "shield" } },
        { type: "PowerUp", when: "mode === 'arcade'", props: { kind: "score" } }
      ]
    });

    const entity = spawnFromBlueprint(world, def, { x: 50, y: 100 });
    expect(world.hasComponent(entity, "Transform")).toBe(true);
    const transform = world.getComponent(entity, "Transform");
    expect(transform).toEqual({ type: "Transform", x: 50, y: 100 });

    const powerup = world.getComponent(entity, "PowerUp");
    expect(powerup).toEqual({ type: "PowerUp", kind: "shield" });

    const tag = world.getComponent(entity, "Tag");
    expect(tag?.tags).toContain("powerup");
  });
});
