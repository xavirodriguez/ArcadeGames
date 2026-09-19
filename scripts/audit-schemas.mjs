import fs from "node:fs";
import path from "node:path";

// Directorios a escanear dentro del monorepo
const SEARCH_PATHS = ["src/games", "packages/gameplay-kit/src"];

// Patrones Regex para detectar configuraciones
const KEY_REGEX =
  /(SCREEN_WIDTH|SCREEN_HEIGHT|WIDTH|HEIGHT|worldWidth|worldHeight)\s*:/g;
const SPREAD_REGEX = /\.\.\.([a-zA-Z0-9_]+Schema)\.shape/g;

function findFiles(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

function analyzeSchemas() {
  const allFiles = SEARCH_PATHS.flatMap((dir) =>
    findFiles(path.resolve(process.cwd(), dir), "Schema.ts")
  );
  const matrix = [];

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath);
    const gameMatch = filePath.match(/games\/([^/]+)/);
    const context = gameMatch ? gameMatch[1] : "core/gameplay-kit";

    const directKeys = new Set();
    let match;

    // 1. Extraer claves directas (ej. WIDTH: z.number())
    while ((match = KEY_REGEX.exec(content)) !== null) {
      directKeys.add(match[1]);
    }

    // 2. Extraer dependencias de herencia (ej. ...ScreenDimensionsSchema.shape)
    const inheritedSchemas = [];
    while ((match = SPREAD_REGEX.exec(content)) !== null) {
      inheritedSchemas.push(match[1]);
    }

    if (
      directKeys.size > 0 ||
      inheritedSchemas.includes("ScreenDimensionsSchema")
    ) {
      matrix.push({
        Context: context,
        Schema: fileName,
        Direct_Keys: Array.from(directKeys).join(", ") || "-",
        Inherited_Shapes: inheritedSchemas.join(", ") || "-",
        Status: inheritedSchemas.includes("ScreenDimensionsSchema")
          ? "Uses Gameplay-Kit"
          : "Legacy / Direct",
      });
    }
  }

  console.table(matrix);
}

analyzeSchemas();
