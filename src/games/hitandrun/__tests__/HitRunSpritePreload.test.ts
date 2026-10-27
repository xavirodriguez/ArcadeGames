import type { Asset } from "expo-asset";
import type { AssetLoader } from "@tiny-aster/core";
import { SpriteRegistry } from "../../shared/sprites";
import { HitAndRunGame } from "../HitAndRunGame";
import * as SumiEVisualAssets from "../rendering/SumiEVisualAssets";
import {
  SAMURAI_ASSET_KEY,
  SAMURAI_SPRITE_READY_RESOURCE
} from "../rendering/SamuraiVisualAssets";
import {
  SUMI_E_PLAYER_ASSET_KEY,
  SUMI_E_PLAYER_READY_RESOURCE
} from "../rendering/SumiEVisualAssets";
import { HitRunEnemyPool } from "../waves/HitRunEnemyPool";
import { HIT_RUN_SUMI_E_SAMURAI_SHEET_ID } from "../rendering/HitRunSpriteAtlas";

function createResolvedAsset(uri: string, localUri: string): Asset {
  const asset = Object.create(null) as Asset;
  Object.assign(asset, { uri, localUri });
  return asset;
}

describe("Hit&Run sprite preload integration", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads both Sumi-e atlases, publishes their canonical sources, and enables sprite entities", async () => {
    const playerSource = {
      uri: "https://example.test/hitrun-player.png",
      localUri: "file:///cache/hitrun-player.png"
    };
    const samuraiSource = {
      uri: "https://example.test/hitrun-samurai.png",
      localUri: "file:///cache/hitrun-samurai.png"
    };

    jest.spyOn(SumiEVisualAssets, "loadSumiEPlayerSpritesheetAsset")
      .mockResolvedValue(createResolvedAsset(playerSource.uri, playerSource.localUri));
    jest.spyOn(SumiEVisualAssets, "loadSumiESamuraiSpritesheetAsset")
      .mockResolvedValue(createResolvedAsset(samuraiSource.uri, samuraiSource.localUri));

    const game = new HitAndRunGame({
      seed: 9182,
      gameOptions: { theme: "sumi-e" }
    });

    try {
      await game.init();

      const world = game.getWorld();
      const loader = world.getResource<AssetLoader>("AssetLoader");
      if (!loader) throw new Error("Hit&Run did not register its AssetLoader.");

      expect(world.getResource<boolean>(SUMI_E_PLAYER_READY_RESOURCE)).toBe(true);
      expect(world.getResource<boolean>(SAMURAI_SPRITE_READY_RESOURCE)).toBe(true);

      expect(loader.get<{ uri: string }>(SUMI_E_PLAYER_ASSET_KEY))
        .toEqual({ uri: playerSource.localUri });
      expect(loader.get<{ uri: string }>(SAMURAI_ASSET_KEY))
        .toEqual({ uri: samuraiSource.localUri });

      expect(SpriteRegistry.get(SUMI_E_PLAYER_ASSET_KEY)?.imageSource).toEqual(playerSource);
      expect(SpriteRegistry.get(HIT_RUN_SUMI_E_SAMURAI_SHEET_ID)?.imageSource).toEqual(samuraiSource);

      const player = world.query("BeltInput", "Sprite")[0];
      if (player === undefined) throw new Error("Sumi-e player was not spawned.");
      expect(world.getComponent(player, "Render")?.shape).toBe("sprite");
      expect(world.getComponent(player, "Sprite")?.assetKey).toBe(SUMI_E_PLAYER_ASSET_KEY);
      expect(world.getComponent(player, "SpriteAnimator")).toMatchObject({
        type: "SpriteAnimator",
        sheetId: SUMI_E_PLAYER_ASSET_KEY,
        currentAnim: "idle"
      });

      const samurai = new HitRunEnemyPool().acquireEnemy(world, {
        x: 480,
        y: 400,
        archetypeId: "samurai"
      });
      expect(world.getComponent(samurai, "Render")?.shape).toBe("sprite");
      expect(world.getComponent(samurai, "Sprite")?.assetKey).toBe(SAMURAI_ASSET_KEY);
      expect(world.getComponent(samurai, "SpriteAnimator")).toMatchObject({
        type: "SpriteAnimator",
        sheetId: HIT_RUN_SUMI_E_SAMURAI_SHEET_ID,
        currentAnim: "idle"
      });
    } finally {
      game.destroy();
    }
  });
});
