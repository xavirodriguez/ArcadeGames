import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitAndRunGame } from "../HitAndRunGame";

describe("M11: Platformer substrate cleanliness in Hit&Run", () => {
  it("does not rely on Platformer platform substrate for player movement or death plane", async () => {
    const game = new HitAndRunGame({ seed: 9999 });

    try {
      await game.init();

      const world = game.getWorld();

      // Verify death plane Y resource is undefined (no platformer death plane)
      expect(world.getResource("DeathPlaneY")).toBeUndefined();

      // Verify player uses BeltInput and BeltMovement
      const players = world.query("BeltInput", "BeltMovement");
      expect(players.length).toBe(1);

      // Verify player does not rely on PlatformerGravity or PlatformerGroundState
      const player = players[0];
      expect(world.hasComponent(player, "PlatformerGravityConfig")).toBe(false);
      expect(world.hasComponent(player, "PlatformerGroundState")).toBe(false);
    } finally {
      game.destroy();
    }
  });
});
