import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import {
  checkSpriteArtifacts,
  generateSpriteArtifacts,
  writeSpriteArtifacts
} from "../../../../../scripts/sprites/SpritePipeline";

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makePng(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const scanline = Buffer.alloc(width * 4 + 1);
  const rawPixels = Buffer.concat(Array.from({ length: height }, () => scanline));
  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rawPixels)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function writeSource(
  repositoryRoot: string,
  category: string,
  id: string,
  config: Record<string, unknown>,
  imageName: string,
  imageBytes: Buffer
): string {
  const directory = path.join(repositoryRoot, "assets/sprites/sources", category, id);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "config.json"), JSON.stringify(config, null, 2));
  fs.writeFileSync(path.join(directory, imageName), imageBytes);
  return directory;
}

describe("SpritePipeline", () => {
  let repositoryRoot: string;

  beforeEach(() => {
    repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sprite-pipeline-"));
  });

  afterEach(() => {
    fs.rmSync(repositoryRoot, { recursive: true, force: true });
  });

  it("generates Aseprite PNG, canonical typed definition and a sorted registry index", () => {
    const fixturePath = path.resolve(
      __dirname,
      "../../../../../scripts/sprites/fixtures/aseprite-sample.json"
    );
    const fixtureContent = fs.readFileSync(fixturePath, "utf8");
    const fixture: { meta: { size: { w: number; h: number } } } = JSON.parse(fixtureContent);
    const directory = writeSource(
      repositoryRoot,
      "enemies",
      "sample_samurai",
      {
        id: "sample_samurai",
        frameWidth: 48,
        frameHeight: 64,
        anchor: { x: 0.5, y: 1 }
      },
      "sheet.png",
      makePng(fixture.meta.size.w, fixture.meta.size.h)
    );
    fs.writeFileSync(path.join(directory, "sheet.json"), fixtureContent);
    fs.writeFileSync(
      path.join(directory, "events.json"),
      JSON.stringify({
        animations: {
          attack: [{ frame: 2, type: "sfx", payload: { cue: "slash" } }]
        }
      })
    );

    const result = generateSpriteArtifacts({ repositoryRoot });
    const paths = result.artifacts.map((artifact) => artifact.path);

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0]?.animationNames).toEqual(["attack", "idle"]);
    expect(paths).toContain("assets/sprites/generated/enemies/sample_samurai.atlas.png");
    expect(paths).toContain("src/games/shared/sprites/generated/sample_samurai.generated.ts");
    expect(paths).toContain("src/games/shared/sprites/generated/index.generated.ts");

    const definitionArtifact = result.artifacts.find((artifact) =>
      artifact.path.endsWith("sample_samurai.generated.ts")
    );
    expect(definitionArtifact?.content).toContain("require(");
    expect(definitionArtifact?.content).toContain("sample_samurai.atlas.png");
    expect(definitionArtifact?.content).toContain('"cue": "slash"');

    const pngArtifact = result.artifacts.find((artifact) =>
      artifact.path.endsWith("sample_samurai.atlas.png")
    );
    expect(Buffer.isBuffer(pngArtifact?.content)).toBe(true);
  });

  it("supports static full-image sources without inventing source rectangles", () => {
    writeSource(
      repositoryRoot,
      "props",
      "tower_basic_art",
      {
        id: "tower_basic_art",
        frameWidth: 34,
        frameHeight: 34,
        sourceMode: "full-image",
        anchor: { x: 0.5, y: 0.5 }
      },
      "image.png",
      makePng(2, 2)
    );

    const result = generateSpriteArtifacts({ repositoryRoot });
    const definition = result.artifacts.find((artifact) =>
      artifact.path.endsWith("tower_basic_art.generated.ts")
    );

    expect(definition?.content).toContain('"sourceMode": "full-image"');
    expect(definition?.content).toContain('"frames": []');
  });

  it("writes deterministically and check mode detects drift without repairing it", () => {
    writeSource(
      repositoryRoot,
      "props",
      "simple_prop",
      {
        id: "simple_prop",
        frameWidth: 16,
        frameHeight: 16,
        sourceMode: "full-image"
      },
      "image.png",
      makePng(3, 3)
    );

    const result = generateSpriteArtifacts({ repositoryRoot });
    expect(checkSpriteArtifacts(repositoryRoot, result).length).toBeGreaterThan(0);

    writeSpriteArtifacts(repositoryRoot, result);
    expect(checkSpriteArtifacts(repositoryRoot, result)).toEqual([]);

    const definitionPath = path.join(
      repositoryRoot,
      "src/games/shared/sprites/generated/simple_prop.generated.ts"
    );
    const original = fs.readFileSync(definitionPath, "utf8");
    fs.writeFileSync(definitionPath, original + "// drift\n");

    const issues = checkSpriteArtifacts(repositoryRoot, result);
    expect(issues).toContain(
      "Generated artifact is out of date: src/games/shared/sprites/generated/simple_prop.generated.ts"
    );
    expect(fs.readFileSync(definitionPath, "utf8")).toBe(original + "// drift\n");
  });

  it("rejects missing source configuration and mismatched Aseprite PNG dimensions", () => {
    const directory = path.join(
      repositoryRoot,
      "assets/sprites/sources/enemies/broken_sheet"
    );
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "sheet.json"), "{}");
    fs.writeFileSync(path.join(directory, "sheet.png"), makePng(8, 8));

    expect(() => generateSpriteArtifacts({ repositoryRoot })).toThrow(/no config\.json/i);

    fs.rmSync(directory, { recursive: true, force: true });
    writeSource(
      repositoryRoot,
      "enemies",
      "broken_sheet",
      {
        id: "broken_sheet",
        frameWidth: 16,
        frameHeight: 16
      },
      "sheet.png",
      makePng(8, 8)
    );
    fs.writeFileSync(
      path.join(directory, "sheet.json"),
      JSON.stringify({
        frames: [{ frame: { x: 0, y: 0, w: 8, h: 8 }, duration: 100 }],
        meta: { size: { w: 9, h: 8 } }
      })
    );

    expect(() => generateSpriteArtifacts({ repositoryRoot })).toThrow(/does not match its PNG/i);
  });

  it("reports unknown sheet ids and stale generated artifacts", () => {
    expect(() => generateSpriteArtifacts({
      repositoryRoot,
      sheetId: "missing_sheet"
    })).toThrow(/unknown sprite sheet id/i);

    const stalePath = path.join(
      repositoryRoot,
      "assets/sprites/generated/props/removed.atlas.png"
    );
    fs.mkdirSync(path.dirname(stalePath), { recursive: true });
    fs.writeFileSync(stalePath, makePng(1, 1));

    const result = generateSpriteArtifacts({ repositoryRoot });
    expect(result.stalePaths).toContain("assets/sprites/generated/props/removed.atlas.png");
    expect(checkSpriteArtifacts(repositoryRoot, result)).toContain(
      "Stale generated artifact should be removed: assets/sprites/generated/props/removed.atlas.png"
    );
    writeSpriteArtifacts(repositoryRoot, result);
    expect(fs.existsSync(stalePath)).toBe(false);
  });
});
