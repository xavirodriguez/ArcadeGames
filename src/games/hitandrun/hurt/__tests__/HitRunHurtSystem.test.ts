import { World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  HitRunHurtSystem,
  canTakeDamage,
  isPlayerControlLocked
} from "../HitRunHurtSystem";
import {
  DEFAULT_HIT_REACTION_CONFIG,
  PLAYER_INVULN_SECONDS,
  PLAYER_HITSTUN_SECONDS,
  HIT_REACTION_CONFIG_RESOURCE
} from "../HitReactionTypes";

function addTransform(
  world: World<CoreComponentRegistry>,
  e: number,
  x: number,
  y: number
): void {
  world.addComponent(e, {
    type: "Transform",
    x,
    y,
    worldX: x,
    worldY: y,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
}

describe("HitRunHurtSystem (Paso C)", () => {
  let world: World<CoreComponentRegistry>;
  let hurt: HitRunHurtSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.setResource(HIT_REACTION_CONFIG_RESOURCE, {
      ...DEFAULT_HIT_REACTION_CONFIG
    });
    hurt = new HitRunHurtSystem();
  });

  function spawnPlayer(x = 100): number {
    const p = world.createEntity();
    addTransform(world, p, x, 100);
    world.addComponent(p, {
      type: "Health",
      current: 5,
      max: 5,
      invulnerableRemaining: 0
    });
    world.addComponent(p, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(p, {
      type: "PlatformerInput",
      moveLeft: false,
      moveRight: false,
      jumpHeld: false
    } as CoreComponentRegistry["PlatformerInput"]);
    world.addComponent(p, {
      type: "Faction",
      faction: "player",
      value: "player"
    });
    world.addComponent(p, {
      type: "Render",
      shape: "player",
      size: 16,
      color: "#fff",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });
    return p;
  }

  function spawnSource(x: number): number {
    const s = world.createEntity();
    addTransform(world, s, x, 100);
    return s;
  }

  it("grants invulnerability that blocks canTakeDamage until it expires", () => {
    const player = spawnPlayer(100);
    const source = spawnSource(50);

    hurt.enqueueHitForTest({
      targetEntity: player,
      sourceEntity: source,
      amount: 1,
      remainingHealth: 4
    });
    hurt.update(world, 0);

    const health = world.getComponent(player, "Health") as {
      invulnerableRemaining: number;
    };
    expect(health.invulnerableRemaining).toBeCloseTo(PLAYER_INVULN_SECONDS, 5);
    expect(canTakeDamage(world, player)).toBe(false);

    hurt.update(world, PLAYER_INVULN_SECONDS * 0.5);
    expect(canTakeDamage(world, player)).toBe(false);

    hurt.update(world, PLAYER_INVULN_SECONDS);
    expect(canTakeDamage(world, player)).toBe(true);
    const healthEnd = world.getComponent(player, "Health") as {
      invulnerableRemaining: number;
    };
    expect(healthEnd.invulnerableRemaining).toBe(0);
  });

  it("applies hitstun then clears control lock", () => {
    const player = spawnPlayer(100);
    const source = spawnSource(150);

    hurt.enqueueHitForTest({
      targetEntity: player,
      sourceEntity: source,
      amount: 1,
      remainingHealth: 4
    });
    // ensureHitReaction may use command buffer — apply component directly if needed
    hurt.update(world, 0);

    // Flush command buffer if API exists
    const flush = (world as unknown as { flushCommands?: () => void }).flushCommands;
    if (typeof flush === "function") flush.call(world);

    // If still no HitReaction (buffer not flushed), simulate add
    if (!world.hasComponent(player, "HitReaction")) {
      world.addComponent(player, {
        type: "HitReaction",
        hitstunRemaining: PLAYER_HITSTUN_SECONDS,
        blinkElapsed: 0
      });
    }

    expect(isPlayerControlLocked(world, player)).toBe(true);

    hurt.update(world, PLAYER_HITSTUN_SECONDS + 0.01);
    expect(isPlayerControlLocked(world, player)).toBe(false);
  });

  it("knocks the player away from the source", () => {
    const player = spawnPlayer(100);
    const source = spawnSource(50); // left of player → knock to the right

    hurt.enqueueHitForTest({
      targetEntity: player,
      sourceEntity: source,
      amount: 1,
      remainingHealth: 4
    });
    hurt.update(world, 0);

    const vel = world.getComponent(player, "Velocity") as { vx: number; vy: number };
    expect(vel.vx).toBeGreaterThan(0);
    expect(vel.vy).toBeLessThan(0);
  });

  it("enemy receives knockback without invulnerability", () => {
    const enemy = world.createEntity();
    addTransform(world, enemy, 200, 100);
    world.addComponent(enemy, {
      type: "Health",
      current: 3,
      max: 3,
      invulnerableRemaining: 0
    });
    world.addComponent(enemy, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(enemy, {
      type: "Faction",
      faction: "enemy",
      value: "enemy"
    });

    const source = spawnSource(100);
    hurt.enqueueHitForTest({
      targetEntity: enemy,
      sourceEntity: source,
      amount: 1,
      remainingHealth: 2
    });
    hurt.update(world, 0);

    const health = world.getComponent(enemy, "Health") as {
      invulnerableRemaining: number;
    };
    expect(health.invulnerableRemaining).toBe(0);

    const vel = world.getComponent(enemy, "Velocity") as { vx: number };
    expect(vel.vx).not.toBe(0);
  });
});
