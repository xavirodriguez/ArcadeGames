import { NebulaDashGame } from "../NebulaDashGame";
import { MutatorRegistry } from "../../../utils/MutatorRegistry";

describe("NebulaDash Mutator Integration", () => {
  it("applies heavy_gravity mutator modifying GameConfig GRAVITY and JUMP_IMPULSE", async () => {
    const heavyGravity = MutatorRegistry.get("heavy_gravity");
    expect(heavyGravity).toBeDefined();

    const game = new NebulaDashGame({
      gameOptions: {
        mutators: [heavyGravity]
      }
    });
    await game.init();

    const world = game.getWorld();
    const config = world.getResource<any>("GameConfig");

    expect(config.GRAVITY).toBe(1500);
    expect(config.JUMP_IMPULSE).toBe(-600);
  });

  it("applies shield_pulse mutator setting invulnerableRemaining on player Health component", async () => {
    const shieldPulse = MutatorRegistry.get("shield_pulse");
    expect(shieldPulse).toBeDefined();

    const game = new NebulaDashGame({
      gameOptions: {
        mutators: [shieldPulse]
      }
    });
    await game.init();

    const world = game.getWorld();
    const player = world.query("Player")[0];
    const health = world.getComponent(player, "Health" as any) as any;

    expect(health.invulnerableRemaining).toBe(3.0);
  });

  it("applies combo_head_start mutator initializing combo multiplier to x2", async () => {
    const comboHeadStart = MutatorRegistry.get("combo_head_start");
    expect(comboHeadStart).toBeDefined();

    const game = new NebulaDashGame({
      gameOptions: {
        mutators: [comboHeadStart]
      }
    });
    await game.init();

    const state = game.getGameState();
    expect(state.combo).toBe(5);
    expect(state.multiplier).toBe(2);
  });
});
