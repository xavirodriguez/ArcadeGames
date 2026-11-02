import { World } from "../src/ecs/World";
import { CoreComponentRegistry, LocomotionProfileComponent } from "../src/ecs/CoreComponents";
import { PlatformerMovementSystem } from "../src/physics/systems/PlatformerMovementSystem";
import { LOCOMOTION_PROFILE_PRESETS } from "../src/physics/LocomotionProfiles";
import { hashAoS } from "../src/snapshots/SnapshotHash";

function createProfileWorld(options: {
  grounded?: boolean;
  vx?: number;
  moveDir?: number;
  brake?: boolean;
  steeringMultiplier?: number;
  groundAcceleration?: number;
} = {}) {
  const world = new World<CoreComponentRegistry>();
  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "Velocity",
    vx: options.vx ?? 0,
    vy: 0,
    angularVelocity: 0
  });
  world.addComponent(entity, {
    type: "PlatformerInput",
    moveDir: options.moveDir ?? 0,
    jumpPressed: false,
    jumpHeld: false,
    jumpReleased: false,
    brake: options.brake ?? false
  });
  world.addComponent(entity, {
    type: "PlatformerGroundState",
    isGrounded: options.grounded ?? true
  });
  const profile: LocomotionProfileComponent = {
    type: "LocomotionProfile",
    ground: {
      maxSpeed: 100,
      acceleration: options.groundAcceleration ?? 100,
      deceleration: 50,
      brakingAcceleration: 200,
      turnAcceleration: 50
    },
    air: {
      maxSpeed: 100,
      acceleration: 100,
      deceleration: 50,
      brakingAcceleration: 200,
      turnAcceleration: 50,
      steeringMultiplier: options.steeringMultiplier ?? 0.5
    },
    momentum: {
      groundDrag: 0,
      airDrag: 0,
      preserveMomentum: 1
    }
  };
  world.addComponent(entity, profile);
  return { world, entity };
}

describe("PlatformerMovementSystem locomotion profiles", () => {
  it("distinguishes passive deceleration, explicit braking and direction reversal", () => {
    const system = new PlatformerMovementSystem();
    const passive = createProfileWorld({ vx: 10 });
    system.update(passive.world, 0.1);
    expect(passive.world.getComponent(passive.entity, "Velocity")!.vx).toBe(5);

    const braking = createProfileWorld({ vx: 10, moveDir: 1, brake: true });
    system.update(braking.world, 0.1);
    expect(braking.world.getComponent(braking.entity, "Velocity")!.vx).toBe(0);

    const reversing = createProfileWorld({ vx: 10, moveDir: -1 });
    system.update(reversing.world, 0.1);
    expect(reversing.world.getComponent(reversing.entity, "Velocity")!.vx).toBe(5);
  });

  it("scales air steering acceleration without scaling existing velocity", () => {
    const { world, entity } = createProfileWorld({
      grounded: false,
      vx: 100,
      moveDir: -1,
      steeringMultiplier: 0.5
    });
    new PlatformerMovementSystem().update(world, 0.1);
    expect(world.getComponent(entity, "Velocity")!.vx).toBe(97.5);
  });

  it("allows profile replacement without changing the movement system", () => {
    const { world, entity } = createProfileWorld({ moveDir: 1 });
    const system = new PlatformerMovementSystem();
    system.update(world, 0.1);
    expect(world.getComponent(entity, "Velocity")!.vx).toBe(10);

    world.mutateComponent(entity, "LocomotionProfile", profile => {
      profile.ground.acceleration = 200;
    });
    world.mutateComponent(entity, "Velocity", velocity => {
      velocity.vx = 0;
    });
    system.update(world, 0.1);
    expect(world.getComponent(entity, "Velocity")!.vx).toBe(20);
  });

  it("produces the same snapshot hash for identical fixed-step input sequences", () => {
    const createSimulation = () => {
      const { world, entity } = createProfileWorld();
      const system = new PlatformerMovementSystem();
      for (let tick = 0; tick < 120; tick++) {
        const moveDir = tick < 40 ? 1 : tick < 75 ? -1 : 0;
        const brake = tick >= 100;
        world.mutateComponent(entity, "PlatformerInput", input => {
          input.moveDir = moveDir;
          input.brake = brake;
        });
        system.update(world, 1 / 60);
      }
      const velocity = world.getComponent(entity, "Velocity")!;
      const input = world.getComponent(entity, "PlatformerInput")!;
      const profile = world.getComponent(entity, "LocomotionProfile")!;
      return hashAoS({
        tick: 120,
        seed: 7,
        entities: [entity],
        componentData: {
          Velocity: { [entity]: velocity },
          PlatformerInput: { [entity]: input },
          LocomotionProfile: { [entity]: profile }
        }
      });
    };
    expect(createSimulation()).toBe(createSimulation());
  });

  it("exposes the three declarative built-in presets", () => {
    expect(Object.keys(LOCOMOTION_PROFILE_PRESETS)).toEqual(["responsive", "momentum", "heavy"]);
    expect(LOCOMOTION_PROFILE_PRESETS.momentum.momentum.preserveMomentum).toBe(1);
  });
});
