import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitAndRunGame } from "../HitAndRunGame";

describe("M11: Platformer substrate cleanliness in Hit&Run", () => {
  it("does not rely on Platformer platform substrate for player movement or death plane", async () => {
    const game = new HitAndRunGame({ seed: 12345 });
    await (game as any).onRegisterSystems();
    await (game as any).onInitializeEntities();
    const world = game.getWorld();

    // Verify DeathPlaneY is deactivated (Infinity)
    expect(world.getResource("DeathPlaneY")).toBe(Number.POSITIVE_INFINITY);

    // Verify player entity uses BeltInput & BeltMovement
    const players = world.query("BeltInput", "BeltMovement");
    expect(players.length).toBeGreaterThan(0);
  });
});
