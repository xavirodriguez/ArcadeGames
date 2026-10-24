import * as fs from "node:fs";
import * as path from "node:path";

describe("HitRun Simulation Module Boundary Test", () => {
  const simulationFolders = [
    "belt",
    "ai",
    "combat",
    "melee",
    "hurt",
    "waves",
    "weapons"
  ];

  const baseDir = path.resolve(__dirname, "../../");

  function getTsFiles(dir: string): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (!file.startsWith("__tests__")) {
          results.push(...getTsFiles(filePath));
        }
      } else if (file.endsWith(".ts") && !file.endsWith(".test.ts")) {
        results.push(filePath);
      }
    }
    return results;
  }

  test("simulation modules must never import from rendering or theme", () => {
    const forbiddenImports = ["rendering", "rendering/theme", "theme"];
    const violations: string[] = [];

    for (const folder of simulationFolders) {
      const folderPath = path.join(baseDir, folder);
      if (!fs.existsSync(folderPath)) continue;

      const files = getTsFiles(folderPath);
      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith("import ")) {
            for (const forbidden of forbiddenImports) {
              if (line.includes(`/${forbidden}`) || line.includes(`"${forbidden}`) || line.includes(`'${forbidden}`)) {
                violations.push(`${path.relative(baseDir, file)}:${i + 1} -> ${line.trim()}`);
              }
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
