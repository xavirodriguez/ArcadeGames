import { AssetLoader } from "../src/assets/AssetLoader";

describe("AssetLoader parseAtlas Unit Tests", () => {
  let loader: AssetLoader;

  beforeEach(() => {
    loader = new AssetLoader();
  });

  it("parses TexturePacker Hash format correctly", () => {
    const hashAtlas = {
      frames: {
        "player_idle.png": { frame: { x: 0, y: 0, w: 32, h: 32 } },
        "player_run.png": { frame: { x: 32, y: 0, w: 32, h: 32 } }
      }
    };

    const map = loader.parseAtlas(hashAtlas);
    expect(map.size).toBe(2);
    expect(map.get("player_idle.png")).toEqual({ x: 0, y: 0, w: 32, h: 32 });
    expect(map.get("player_run.png")).toEqual({ x: 32, y: 0, w: 32, h: 32 });
  });

  it("parses TexturePacker / Aseprite Array format correctly", () => {
    const arrayAtlas = {
      frames: [
        { filename: "coin_1.png", frame: { x: 0, y: 64, w: 16, h: 16 } },
        { filename: "coin_2.png", frame: { x: 16, y: 64, w: 16, h: 16 } }
      ]
    };

    const map = loader.parseAtlas(arrayAtlas);
    expect(map.size).toBe(2);
    expect(map.get("coin_1.png")).toEqual({ x: 0, y: 64, w: 16, h: 16 });
    expect(map.get("coin_2.png")).toEqual({ x: 16, y: 64, w: 16, h: 16 });
  });
});
