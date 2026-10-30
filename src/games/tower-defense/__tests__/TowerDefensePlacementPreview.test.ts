import { TowerDefenseGame } from "../TowerDefenseGame";
import { cellCenter } from "../MapUtils";
import {
  createIsoConfig,
  worldToIso,
} from "../rendering/IsoProjection";
import { resolveTowerPlacementPreviewSetup } from "../rendering/TowerDefenseVisualHelpers";
import type { GridLayout } from "../../shared/grid/GridTypes";
import type {
  TileGrid,
  TowerCatalog,
} from "../types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

describe("Tower Defense placement preview", () => {
  it("projects the hovered cell and retains its preview after the cursor leaves the map", async () => {
    const game = new TowerDefenseGame({ headless: true, seed: 42 });
    await game.init();

    try {
      const world = game.getWorld();
      const layout = world.getResource<GridLayout>("GridLayout");
      const tileGrid = world.getResource<TileGrid>("TileGrid");
      const catalog = world.getResource<TowerCatalog>("TowerCatalog");
      const config = world.getResource<TowerDefenseConfig>("GameConfig");

      if (!layout || !tileGrid || !catalog || !config) {
        throw new Error("Tower Defense placement resources were not initialized");
      }

      const selectedWorldPosition = cellCenter(2, 2, layout);
      game.setInputState({
        cursorX: selectedWorldPosition.x,
        cursorY: selectedWorldPosition.y,
        selectedTowerType: "basic",
      });
      game.update(1 / 60);

      const isoConfig = createIsoConfig(config);
      const preview = resolveTowerPlacementPreviewSetup(world, layout, tileGrid, isoConfig);
      const expectedScreenPosition = worldToIso(isoConfig, selectedWorldPosition.x, selectedWorldPosition.y);

      expect(preview).not.toBeNull();
      expect(preview?.col).toBe(2);
      expect(preview?.row).toBe(2);
      expect(preview?.buildable).toBe(true);
      expect(preview?.canBuild).toBe(true);
      expect(preview?.center.x).toBeCloseTo(expectedScreenPosition.x, 8);
      expect(preview?.center.y).toBeCloseTo(expectedScreenPosition.y, 8);
      expect(world.query("Tower")).toHaveLength(0);

      game.setInputState({
        cursorX: selectedWorldPosition.x,
        cursorY: selectedWorldPosition.y,
        selectCell: true,
      });
      game.update(1 / 60);

      const pathWorldPosition = cellCenter(1, 1, layout);
      game.setInputState({
        cursorX: pathWorldPosition.x,
        cursorY: pathWorldPosition.y,
      });
      game.update(1 / 60);

      const pathPreview = resolveTowerPlacementPreviewSetup(world, layout, tileGrid, isoConfig);
      expect(pathPreview?.buildable).toBe(false);
      expect(pathPreview?.canBuild).toBe(false);

      game.setInputState({ cursorX: -1, cursorY: -1 });
      game.update(1 / 60);

      const retainedSelectionPreview = resolveTowerPlacementPreviewSetup(world, layout, tileGrid, isoConfig);
      expect(retainedSelectionPreview?.col).toBe(1);
      expect(retainedSelectionPreview?.row).toBe(1);
      expect(retainedSelectionPreview?.buildable).toBe(false);
      expect(retainedSelectionPreview?.canBuild).toBe(false);

      game.setInputState({ cursorX: -1, cursorY: -1, selectCell: true });
      game.update(1 / 60);

      expect(resolveTowerPlacementPreviewSetup(world, layout, tileGrid, isoConfig)).toBeNull();
      expect(world.getComponent(world.query("Player")[0], "Player")?.selectedCell).toBeNull();
    } finally {
      await game.destroy();
    }
  });
});
