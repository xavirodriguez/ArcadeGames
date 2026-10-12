import * as fs from "fs";
import * as path from "path";

describe("Game Module Boundaries Linter", () => {
  test("No game module in src/games/<gameA> imports directly from another game module src/games/<gameB>", () => {
    const gamesDir = path.resolve(__dirname, "../../");
    const gameFolders = fs.readdirSync(gamesDir).filter((file) => {
      const fullPath = path.join(gamesDir, file);
      return fs.statSync(fullPath).isDirectory() && file !== "shared";
    });

    const violations: string[] = [];

    function scanDirectory(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const importLines = content.split("\n").filter((line) => line.includes("import") || line.includes("require"));

          for (const line of importLines) {
            for (const otherGame of gameFolders) {
              const currentGame = path.relative(gamesDir, fullPath).split(path.sep)[0];
              if (otherGame === currentGame) continue;

              const regex = new RegExp(`from ['"].*\\/${otherGame}(\\/|['"])`);
              if (regex.test(line)) {
                violations.push(`${path.relative(process.cwd(), fullPath)}: imports from game '${otherGame}' (${line.trim()})`);
              }
            }
          }
        }
      }
    }

    for (const game of gameFolders) {
      scanDirectory(path.join(gamesDir, game));
    }

    expect(violations).toEqual([]);
  });
});
