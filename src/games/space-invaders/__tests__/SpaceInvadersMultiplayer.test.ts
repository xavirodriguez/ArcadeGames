import { SpaceInvadersGame } from "../SpaceInvadersGame";
import { GameLifecycleState, InputFrame } from "@tiny-aster/core";

describe("Space Invaders Authoritative Multiplayer", () => {
  it("should simulate independent movements and shooting for multiple player entities on the server", async () => {
    // 1. Initialize server-side headless game simulation
    const game = new SpaceInvadersGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    const world = game.getWorld();
    // Enable network inputs resource to allow input systems to process players on the server
    world.setResource("UseNetworkInputs", true);

    // 2. Spawn Player A and Player B entities
    const playerA = world.createEntity();
    const playerB = world.createEntity();

    const playerBlueprint = game.blueprints.get("player");
    expect(playerBlueprint).toBeDefined();

    // Spawn them with different starting x coordinates
    playerBlueprint!.spawn(world, playerA, { x: 300, y: 500 });
    playerBlueprint!.spawn(world, playerB, { x: 500, y: 500 });

    // Verify initial positions
    const posA = world.getComponent(playerA, "Transform")!;
    const posB = world.getComponent(playerB, "Transform")!;
    expect(posA.x).toBe(300);
    expect(posB.x).toBe(500);

    // 3. Create independent network input frames
    // Player A moves right (moveX: 1)
    const frameA: InputFrame = {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: [],
      axes: { moveX: 1 }
    };

    // Player B moves left (moveX: -1) and shoots ("shoot")
    const frameB: InputFrame = {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: ["shoot"],
      axes: { moveX: -1 }
    };

    // 4. Inject inputs through game's NetworkController API
    game.applyInputToEntity(playerA, frameA);
    game.applyInputToEntity(playerB, frameB);

    // 5. Update the simulation foward by 1 tick (16.66ms)
    game.runSimulationStep(16.66 / 1000, false); // Input systems expect dt in seconds

    // 6. Assert Player A moved right (x > 300)
    const posAAfter = world.getComponent(playerA, "Transform")!;
    expect(posAAfter.x).toBeGreaterThan(300);

    // Assert Player B moved left (x < 500)
    const posBAfter = world.getComponent(playerB, "Transform")!;
    expect(posBAfter.x).toBeLessThan(500);

    // Assert Player B spawned a projectile bullet
    const bullets = world.query("PlayerBullet");
    expect(bullets.length).toBe(1);

    game.destroy();
  });

  it("should spawn network entities using full blueprints and materialize them immediately on updateFromServer", async () => {
    const game = new SpaceInvadersGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    const world = game.getWorld();

    const serverState = {
      tick: 10,
      score: 100,
      gameOver: false,
      players: {
        "p1": { x: 200, y: 500, alive: true }
      },
      invaders: {
        "inv1": { id: "inv1", x: 150, y: 80, alive: true }
      },
      bullets: {
        "b1": { x: 200, y: 480, ownerId: "player" },
        "b2": { x: 150, y: 100, ownerId: "enemy" }
      }
    };

    game.updateFromServer(serverState, "p1");

    // 1. Verify Player entity materialized with full blueprint components
    const players = world.query("Player");
    expect(players.length).toBe(1);
    const pEntity = players[0];
    expect(world.hasComponent(pEntity, "Transform")).toBe(true);
    expect(world.hasComponent(pEntity, "Render")).toBe(true);
    expect(world.hasComponent(pEntity, "Collider")).toBe(true);
    expect(world.hasComponent(pEntity, "Health")).toBe(true);
    expect(world.hasComponent(pEntity, "Faction")).toBe(true);
    expect(world.hasComponent(pEntity, "Boundary")).toBe(true);
    expect(world.hasComponent(pEntity, "LocalPlayer")).toBe(true);

    // 2. Verify Invader entity materialized with full blueprint components
    const invaders = world.query("Invader");
    expect(invaders.length).toBe(1);
    const invEntity = invaders[0];
    expect(world.hasComponent(invEntity, "Transform")).toBe(true);
    expect(world.hasComponent(invEntity, "Render")).toBe(true);
    expect(world.hasComponent(invEntity, "Collider")).toBe(true);
    expect(world.hasComponent(invEntity, "Health")).toBe(true);
    expect(world.hasComponent(invEntity, "Faction")).toBe(true);
    expect(world.hasComponent(invEntity, "LootTable")).toBe(true);

    // 3. Verify Bullets materialized with full blueprint components
    const playerBullets = world.query("PlayerBullet");
    expect(playerBullets.length).toBe(1);
    const pbEntity = playerBullets[0];
    expect(world.hasComponent(pbEntity, "Damage")).toBe(true);
    expect(world.hasComponent(pbEntity, "Collider")).toBe(true);

    const enemyBullets = world.query("EnemyBullet");
    expect(enemyBullets.length).toBe(1);
    const ebEntity = enemyBullets[0];
    expect(world.hasComponent(ebEntity, "Damage")).toBe(true);
    expect(world.hasComponent(ebEntity, "Collider")).toBe(true);

    game.destroy();
  });
});
