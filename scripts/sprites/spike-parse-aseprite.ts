import fs from "node:fs";
import path from "node:path";
import { parseAsepriteJson } from "./parsers/AsepriteJsonParser";

function main(): void {
  const fixturePath = path.resolve(__dirname, "fixtures/aseprite-sample.json");
  const rawContent = fs.readFileSync(fixturePath, "utf-8");
  const parsedSheet = parseAsepriteJson(rawContent, {
    frameWidth: 48,
    frameHeight: 64,
    anchor: { x: 0.5, y: 1 }
  });

  console.log("Aseprite metadata parsed successfully.");
  console.log("- Logical size: " + parsedSheet.frameWidth + "x" + parsedSheet.frameHeight);
  console.log("- Anchor: (" + parsedSheet.anchor.x + ", " + parsedSheet.anchor.y + ")");
  console.log("- Animations: " + Object.keys(parsedSheet.animations).join(", "));

  for (const [name, animation] of Object.entries(parsedSheet.animations)) {
    console.log(
      "  * " + name + ": " + animation.frames.length +
      " playback frames, " + animation.frameDuration + "s/frame, loop=" + animation.loop
    );
    if (animation.events && animation.events.length > 0) {
      console.log("    events: " + JSON.stringify(animation.events));
    }
  }
}

main();
