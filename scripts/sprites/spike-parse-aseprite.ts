import fs from "node:fs";
import path from "node:path";
import { parseAsepriteJson } from "../../src/games/shared/sprites/pipeline/AsepriteJsonParser";

function main() {
  const fixturePath = path.resolve(__dirname, "fixtures/aseprite-sample.json");
  console.log(`Reading Aseprite sample fixture from: ${fixturePath}`);
  const rawContent = fs.readFileSync(fixturePath, "utf-8");

  const parsedSheet = parseAsepriteJson(rawContent, {
    id: "sample_samurai",
    assetPath: "assets/sprites/enemies/samurai.atlas.png",
    frameWidth: 48,
    frameHeight: 64,
    anchor: { x: 0.5, y: 1.0 }
  });

  console.log(`Successfully parsed Aseprite sheet [id: ${parsedSheet.id}]`);
  console.log(`- Logical size: ${parsedSheet.frameWidth}x${parsedSheet.frameHeight}`);
  console.log(`- Anchor: (${parsedSheet.anchor?.x}, ${parsedSheet.anchor?.y})`);
  console.log(`- Animations found: ${Object.keys(parsedSheet.animations).join(", ")}`);

  for (const [name, anim] of Object.entries(parsedSheet.animations)) {
    console.log(`  * ${name}: ${anim.frames.length} frames, ${anim.frameDuration}s/frame, loop=${anim.loop}`);
    if (anim.events && anim.events.length > 0) {
      console.log(`    events: ${JSON.stringify(anim.events)}`);
    }
  }

  console.log("\nSpike execution complete: Aseprite JSON successfully converted to canonical SpriteSheetDefinition contract!");
}

main();
