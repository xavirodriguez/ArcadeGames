import { VerticalShmupGame } from "../VerticalShmupGame";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";
import { ParticlePool } from "../EntityPool";
import { EXPLOSION_PROFILES } from "../../shared/rendering/ExplosionSystem";

describe("Vertical Shmup ParticlePool (explosion VFX)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) {
      game.destroy();
    }
  });

  async function createGame(): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);
    return game;
  }

  it("registers SharedParticlePool as world resource ParticlePool", async () => {
    const game = await createGame();
    const pool = game.world.getResource("ParticlePool");
    expect(pool).toBeInstanceOf(ParticlePool);
  });

  it("spawnLayeredExplosion acquires particle entities when ParticlePool is present", async () => {
    const game = await createGame();
    const world = game.world;
    const pool = world.getResource<ParticlePool>("ParticlePool");
    if (!pool) throw new Error("Expected ParticlePool resource");

    const acquireSpy = jest.spyOn(pool, "acquire");
    const before = world.query("Render").length;

    spawnLayeredExplosion(world, 120, 200, { type: "enemy" });

    const expectedParticles = EXPLOSION_PROFILES.enemy.particleCount;
    expect(acquireSpy.mock.calls.length).toBe(expectedParticles);
    expect(world.query("Render").length).toBeGreaterThan(before);
  });
});
