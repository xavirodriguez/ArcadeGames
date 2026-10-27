import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SPRITE_SHEET_CATALOG } from "../src/games/shared/sprites/SpriteRegistry";
import { HIT_RUN_CHARACTER_SPRITE_SHEETS } from "../src/games/hitandrun/rendering/HitRunSpriteAtlas";
import {
  readPngDimensions,
  validateSpriteCatalog,
  type SpriteValidationIssue
} from "../src/games/shared/sprites/SpriteManifestValidator";

const catalog = [
  ...SPRITE_SHEET_CATALOG,
  ...HIT_RUN_CHARACTER_SPRITE_SHEETS
];

const repositoryRoot = process.cwd();
const existingAssetPaths = new Set<string>();
const dimensionsByAssetPath = new Map<string, { width: number; height: number }>();
const readIssues: SpriteValidationIssue[] = [];

for (const sheet of catalog) {
  const absolutePath = path.resolve(repositoryRoot, sheet.assetPath);
  const relativePath = path.relative(repositoryRoot, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    readIssues.push({
      code: "ASSET_PATH_OUTSIDE_REPOSITORY",
      spriteId: sheet.id,
      message: `Asset path escapes repository root: ${sheet.assetPath}`
    });
    continue;
  }

  if (!existsSync(absolutePath)) continue;

  try {
    const bytes = readFileSync(absolutePath);
    existingAssetPaths.add(sheet.assetPath);
    const dimensions = readPngDimensions(bytes);
    if (dimensions) dimensionsByAssetPath.set(sheet.assetPath, dimensions);
  } catch (error: unknown) {
    readIssues.push({
      code: "ASSET_READ_FAILED",
      spriteId: sheet.id,
      message: `Unable to read ${sheet.assetPath}: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

const issues = [
  ...readIssues,
  ...validateSpriteCatalog(catalog, { existingAssetPaths, dimensionsByAssetPath })
];

if (issues.length > 0) {
  console.error(`Sprite validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`- [${issue.code}] ${issue.spriteId}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Sprite validation passed: ${catalog.length} sprite sheets checked.`);
}
