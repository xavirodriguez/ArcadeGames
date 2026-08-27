import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";
import { KineticAccumulatorSystem } from "../systems/KineticAccumulatorSystem";
import { KineticAccumulatorComponent } from "../components/KineticAccumulatorComponent";
import { TransformComponent, VelocityComponent } from "../ecs/CoreComponents";
import { FactionComponent } from "../ai/FactionComponent";

describe("KineticAccumulatorSystem", () => {
  let world: World<any>;
  let system: KineticAccumulatorSystem;

  beforeEach(() => {
    world = new World();
    world.setResource("EventBus", new EventBus());
    system = new KineticAccumulatorSystem();
  });

  test("should accumulate energy based on movement speed", () => {
    const player = world.createEntity();
    const accComp: KineticAccumulatorComponent = {
      type: "KineticAccumulator",
      storedEnergy: 0,
      maxEnergy: 100,
      chargeOnMoveRate: 20,
      grazeRadius: 50,
      grazeChargeAmount: 25,
      burstRadius: 150,
      isBurstReady: false,
      isBurstActive: false,
    };
    const transformComp: TransformComponent = {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    };
    const velocityComp: VelocityComponent = { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 };

    world.addComponent(player, accComp);
    world.addComponent(player, transformComp);
    world.addComponent(player, velocityComp);

    system.update(world, 1.0);

    const updatedAcc = world.getComponent(player, "KineticAccumulator");
    expect(updatedAcc.storedEnergy).toBe(20);
    expect(updatedAcc.isBurstReady).toBe(false);
  });

  test("should charge energy upon graze / near-miss with hostile entities", () => {
    const player = world.createEntity();
    const playerAcc: KineticAccumulatorComponent = {
      type: "KineticAccumulator",
      storedEnergy: 0,
      maxEnergy: 100,
      chargeOnMoveRate: 0,
      grazeRadius: 50,
      grazeChargeAmount: 30,
      burstRadius: 150,
      isBurstReady: false,
      isBurstActive: false,
    };
    world.addComponent(player, playerAcc);
    world.addComponent(player, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(player, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
    world.addComponent(player, { type: "Faction", value: "player" } as FactionComponent);

    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Transform",
      x: 30,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 30,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(enemy, { type: "Faction", value: "enemy" } as FactionComponent);

    let grazeEventFired = false;
    world.getEventBus()?.on("kinetic:graze" as never, () => {
      grazeEventFired = true;
    });

    system.update(world, 0.1);

    const updatedAcc = world.getComponent(player, "KineticAccumulator");
    expect(updatedAcc?.storedEnergy).toBe(30);
    expect(grazeEventFired).toBe(true);

    // Second update should not duplicate graze charge for the same entity pair
    system.update(world, 0.1);
    expect(updatedAcc?.storedEnergy).toBe(30);
  });

  test("should cap stored energy at maxEnergy and set isBurstReady to true", () => {
    const player = world.createEntity();
    const playerAcc: KineticAccumulatorComponent = {
      type: "KineticAccumulator",
      storedEnergy: 90,
      maxEnergy: 100,
      chargeOnMoveRate: 50,
      grazeRadius: 0,
      grazeChargeAmount: 0,
      burstRadius: 150,
      isBurstReady: false,
      isBurstActive: false,
    };
    world.addComponent(player, playerAcc);
    world.addComponent(player, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(player, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });

    system.update(world, 1.0);

    const updatedAcc = world.getComponent(player, "KineticAccumulator");
    expect(updatedAcc?.storedEnergy).toBe(100);
    expect(updatedAcc?.isBurstReady).toBe(true);
  });

  test("should fire kinetic:burst event and reset energy when burst is activated", () => {
    const player = world.createEntity();
    const playerAcc: KineticAccumulatorComponent = {
      type: "KineticAccumulator",
      storedEnergy: 100,
      maxEnergy: 100,
      chargeOnMoveRate: 0,
      grazeRadius: 0,
      grazeChargeAmount: 0,
      burstRadius: 200,
      isBurstReady: true,
      isBurstActive: true,
    };
    world.addComponent(player, playerAcc);
    world.addComponent(player, {
      type: "Transform",
      x: 50,
      y: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 50,
      worldY: 50,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(player, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });

    let burstPayload: any = null;
    world.getEventBus()?.on("kinetic:burst" as never, (data: unknown) => {
      burstPayload = data;
    });

    system.update(world, 0.1);

    const updatedAcc = world.getComponent(player, "KineticAccumulator");
    expect(updatedAcc?.storedEnergy).toBe(0);
    expect(updatedAcc?.isBurstReady).toBe(false);
    expect(updatedAcc?.isBurstActive).toBe(false);
    expect(burstPayload).not.toBeNull();
    expect(burstPayload.x).toBe(50);
    expect(burstPayload.y).toBe(50);
    expect(burstPayload.radius).toBe(200);
  });

  test("should respect IsPaused resource", () => {
    world.setResource("IsPaused", true);
    const player = world.createEntity();
    const playerAcc: KineticAccumulatorComponent = {
      type: "KineticAccumulator",
      storedEnergy: 0,
      maxEnergy: 100,
      chargeOnMoveRate: 50,
      grazeRadius: 0,
      grazeChargeAmount: 0,
      burstRadius: 100,
      isBurstReady: false,
      isBurstActive: false,
    };
    world.addComponent(player, playerAcc);
    world.addComponent(player, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(player, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });

    system.update(world, 1.0);

    const updatedAcc = world.getComponent(player, "KineticAccumulator");
    expect(updatedAcc?.storedEnergy).toBe(0);
  });
});
