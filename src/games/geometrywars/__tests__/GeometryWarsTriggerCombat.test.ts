import { GeometryWarsGame } from "../GeometryWarsGame";
import { GeometryWarsEntityFactory } from "../entities/GeometryWarsEntities";

describe("Geometry Wars Combat and Trigger Resolution Tests", () => {
  it("should resolve bullet-to-enemy trigger collisions, apply damage, and handle enemy death", async () => {
    // 1. Instantiate game and run initializers (headless)
    const game = new GeometryWarsGame({ headless: true });
    await (game as any).onRegisterSystems();
    await (game as any).onInitializeEntities();

    // Yield to let the async scene transition finish completely
    await new Promise(resolve => setTimeout(resolve, 10));

    const world = game.getWorld();

    // 2. Spawn a seeker enemy (health = 2) and a player bullet (damage = 1) at the exact same position (overlap)
    const enemy = GeometryWarsEntityFactory.createSeeker(world as any, 100, 100);
    const bullet1 = GeometryWarsEntityFactory.createBullet(world as any, 100, 100, 0, 0, 0);

    // Verify initial state
    expect(world.hasComponent(enemy, "Health")).toBe(true);
    expect(world.hasComponent(enemy, "Dead" as any)).toBe(false);
    expect(world.hasComponent(bullet1, "Damage" as any)).toBe(true);
    expect(world.getComponent(enemy, "Health")!.current).toBe(2);

    const initialScore = game.getGameState().score;

    // 3. Update the game simulation. The trigger collision is processed.
    // Enemy takes 1 damage, reducing health to 1. Bullet 1 is destroyed/reclaimed.
    game.update(0.016);

    // 4. Verify trigger collision processed and health decremented to 1
    expect(world.getComponent(enemy, "Health")!.current).toBe(1);
    expect(world.hasComponent(enemy, "Dead" as any)).toBe(false);
    expect(world.hasEntity(bullet1)).toBe(false); // bullet was consumed and removed!

    // Update once more with no bullet overlapping so the collision system clears active trigger pairs and exit events
    game.update(0.016);

    // 5. Spawn a second bullet at (100, 100) and update again
    const bullet2 = GeometryWarsEntityFactory.createBullet(world as any, 100, 100, 0, 0, 0);
    game.update(0.016);

    // 6. Verify second bullet dealt another 1 damage, killing the enemy (removing it from the world)
    expect(world.hasEntity(enemy)).toBe(false);

    // 7. Verify game state score has updated (enemy base score for gw_seeker is 50, first combo multiplier = 1)
    const state = game.getGameState();
    expect(state.score).toBeGreaterThan(initialScore);
  });

  it("should resolve player-to-enemy physical collisions, decrement player lives and handle respawning", async () => {
    const game = new GeometryWarsGame({ headless: true });
    await (game as any).onRegisterSystems();
    await (game as any).onInitializeEntities();

    // Yield to let the async scene transition finish completely
    await new Promise(resolve => setTimeout(resolve, 10));

    const world = game.getWorld();
    const player = world.query("Player")[0];
    expect(player).toBeDefined();

    // Remove player's initial invulnerability so they can take damage immediately
    world.mutateComponent(player, "Health", (h) => {
      h.invulnerableRemaining = 0;
    });

    // Spawn an enemy right on top of the player
    const playerTransform = world.getComponent(player, "Transform");
    expect(playerTransform).toBeDefined();

    const enemy = GeometryWarsEntityFactory.createSeeker(world as any, playerTransform!.x, playerTransform!.y);

    const initialLives = 3;
    expect(game.getGameState().lives).toBe(initialLives);

    // Update the game simulation to trigger collision, damage, player death, event emission and flushing
    game.update(0.016);

    // Player should have died, had their lives decremented by 1, and been revived/respawned with invulnerability
    const state = game.getGameState();
    expect(state.lives).toBe(initialLives - 1);

    const health = world.getComponent(player, "Health");
    expect(health).toBeDefined();
    expect(health!.invulnerableRemaining).toBeGreaterThan(0);
    expect(world.hasComponent(player, "Dead" as any)).toBe(false); // Revived!
  });
});
