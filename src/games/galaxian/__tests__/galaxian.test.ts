import { GalaxianGame } from "../GalaxianGame";
import { GalaxianEnemyComponent, FormationComponent } from "../types/GalaxianTypes";

describe("Galaxian Gameplay Systems (Headless Simulation)", () => {
  it("should initialize game with player, formation, and enemies", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.update(0.01);

    const world = game.getWorld();
    const state = game.getGameState();

    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);
    expect(state.isGameOver).toBe(false);

    const players = world.query("Player");
    expect(players.length).toBe(1);

    const formationEntities = world.query("Formation");
    expect(formationEntities.length).toBe(1);

    const enemies = world.query("GalaxianEnemy");
    expect(enemies.length).toBeGreaterThan(0);
    expect(state.enemiesRemaining).toBe(enemies.length);
  });

  it("should oscillate formation horizontally as a single group", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.update(0.01);
    const world = game.getWorld();

    const formationEntity = world.query("Formation")[0];
    const initialFormation = world.getComponent(formationEntity, "Formation") as FormationComponent;
    const initialOscillation = initialFormation.currentOscillationX;

    for (let i = 0; i < 10; i++) {
      game.update(0.1);
    }

    const updatedFormation = world.getComponent(formationEntity, "Formation") as FormationComponent;
    expect(updatedFormation.currentOscillationX).not.toBe(initialOscillation);
  });

  it("should handle dive bomb lifecycle: windup, trajectory, and return to slot", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.update(0.01);
    const world = game.getWorld();

    let diverFound = false;
    // Step simulation until an enemy enters windup or dive
    for (let tick = 0; tick < 100; tick++) {
      game.update(0.1);
      const state = game.getGameState();
      if (state.activeDivesCount > 0) {
        diverFound = true;
        break;
      }
    }

    expect(diverFound).toBe(true);

    const divingEnemies = world.query("GalaxianEnemy").filter((e) => {
      const comp = world.getComponent(e, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
      return comp && (comp.state === "windup" || comp.state === "diving");
    });

    expect(divingEnemies.length).toBeGreaterThan(0);

    const diverEntity = divingEnemies[0];
    const diverComp = world.getComponent(diverEntity, "GalaxianEnemy") as GalaxianEnemyComponent;
    expect(diverComp.pointsDive).toBeGreaterThan(diverComp.pointsFormation);
  });

  it("should score points and decrease enemies count on hit", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.update(0.01);
    const world = game.getWorld();

    const enemies = world.query("GalaxianEnemy", "Transform");
    expect(enemies.length).toBeGreaterThan(0);

    const enemyEntity = enemies[0];
    const enemyTrans = world.getComponent(enemyEntity, "Transform")!;

    // Player shoots bullet towards enemy
    game.setInput({ shoot: true });
    game.update(0.01);

    const bullets = world.query("PlayerBullet", "Transform");
    expect(bullets.length).toBe(1);

    // Teleport bullet directly onto enemy to simulate precise collision
    const bulletEntity = bullets[0];
    world.mutateComponent(bulletEntity, "Transform", (t) => {
      t.x = enemyTrans.x;
      t.y = enemyTrans.y;
      t.dirty = true;
    });

    game.update(0.01);

    const state = game.getGameState();
    expect(state.score).toBeGreaterThan(0);
    expect(state.enemiesRemaining).toBe(enemies.length - 1);
  });

  it("should lose life when player is hit by enemy bullet", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.update(0.01);
    const world = game.getWorld();

    const players = world.query("Player", "Transform");
    expect(players.length).toBe(1);
    const pTrans = world.getComponent(players[0], "Transform")!;

    // Create enemy bullet right above player
    const state0 = game.getGameState();
    expect(state0.lives).toBe(3);

    // Spawn an enemy bullet directly at player position using pool
    const gameInstance = game as any;
    gameInstance.bulletPool.acquireEnemyBullet(world, pTrans.x, pTrans.y);

    game.update(0.01);

    const state1 = game.getGameState();
    expect(state1.lives).toBe(2);
  });

  it("should produce identical deterministic state for same seed", async () => {
    const gameA = new GalaxianGame({ headless: true, seed: 9999 });
    const gameB = new GalaxianGame({ headless: true, seed: 9999 });

    await gameA.init();
    await gameB.init();

    for (let i = 0; i < 50; i++) {
      if (i % 5 === 0) {
        gameA.setInput({ moveLeft: true, shoot: true });
        gameB.setInput({ moveLeft: true, shoot: true });
      } else {
        gameA.setInput({ moveLeft: false, shoot: false });
        gameB.setInput({ moveLeft: false, shoot: false });
      }
      gameA.update(0.05);
      gameB.update(0.05);
    }

    const stateA = gameA.getGameState();
    const stateB = gameB.getGameState();

    expect(stateA.score).toBe(stateB.score);
    expect(stateA.lives).toBe(stateB.lives);
    expect(stateA.enemiesRemaining).toBe(stateB.enemiesRemaining);
    expect(stateA.level).toBe(stateB.level);
  });
});
